require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const pool = require('../db');
const { ensureSupabaseAuthUser, supabaseAdmin } = require('../supabase');

const dryRun = process.argv.includes('--dry-run');
const tempPasswordPrefix = process.env.SUPABASE_MIGRATION_DEFAULT_PASSWORD_PREFIX || 'VocabUpTemp';

function logStep(message) {
  process.stdout.write(`${message}\n`);
}

function isProfilesSchemaCacheError(error) {
  return error?.code === 'PGRST205' && String(error?.message || '').includes("public.profiles");
}

function buildTempPassword(user) {
  return `${tempPasswordPrefix}-${user.id}`;
}

async function fetchRows(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function fetchRowsOptional(sql, params = []) {
  try {
    return await fetchRows(sql, params);
  } catch {
    return [];
  }
}

async function columnExists(tableName, columnName) {
  const rows = await fetchRows(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function chunkedUpsert(admin, table, rows, options = {}) {
  if (!rows.length || dryRun) {
    return;
  }

  const chunkSize = options.chunkSize || 200;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const slice = rows.slice(index, index + chunkSize);
    const result = await admin.from(table).upsert(slice, {
      onConflict: options.onConflict,
      ignoreDuplicates: options.ignoreDuplicates === true,
    });
    if (result.error) {
      throw result.error;
    }
  }
}

async function updateRowsById(admin, table, rows, idKey = 'id') {
  if (!rows.length || dryRun) {
    return;
  }

  for (const row of rows) {
    const rowId = row[idKey];
    if (!rowId) {
      continue;
    }

    const payload = { ...row };
    delete payload[idKey];

    const { error } = await admin.from(table).update(payload).eq(idKey, rowId);
    if (error) {
      throw error;
    }
  }
}

async function migrateUsers(admin) {
  const users = await fetchRows('SELECT id, email, name, role, status FROM Users ORDER BY id ASC');
  const userIdMap = new Map();

  for (const user of users) {
    const authUser = dryRun
      ? { id: crypto.randomUUID() }
      : await ensureSupabaseAuthUser({
        email: user.email,
        password: buildTempPassword(user),
        name: user.name,
      });

    if (!authUser?.id) {
      throw new Error(`Failed to ensure Supabase auth user for ${user.email}`);
    }

    userIdMap.set(user.id, authUser.id);
  }

  const profiles = users.map((user) => ({
    id: userIdMap.get(user.id),
    legacy_user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    status: user.status || 'active',
  }));

  logStep(`Profiles to migrate: ${profiles.length}`);
  try {
    await updateRowsById(admin, 'profiles', profiles);
  } catch (error) {
    if (!isProfilesSchemaCacheError(error)) {
      throw error;
    }
    logStep(`Warning: skipped profile metadata sync because Supabase write cache is not ready for public.profiles: ${error.message}`);
  }
  return userIdMap;
}

async function migrateUserProgress(admin, userIdMap) {
  const rows = await fetchRows('SELECT id, user_id, current_xp, level, current_streak, last_study_date, created_at, updated_at FROM User_Progress');
  const mapped = rows
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      current_xp: row.current_xp,
      level: row.level,
      current_streak: row.current_streak,
      last_study_date: row.last_study_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

  logStep(`User progress rows to migrate: ${mapped.length}`);
  try {
    await updateRowsById(
      admin,
      'user_progress',
      mapped.map((row) => ({
        user_id: row.user_id,
        current_xp: row.current_xp,
        level: row.level,
        current_streak: row.current_streak,
        last_study_date: row.last_study_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      'user_id'
    );
  } catch (error) {
    if (!isProfilesSchemaCacheError(error)) {
      throw error;
    }
    logStep(`Warning: skipped user_progress sync because dependent profile write cache is not ready: ${error.message}`);
  }
}

async function migrateCatalog(admin, userIdMap) {
  const courses = await fetchRows('SELECT id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at FROM Courses');
  const topics = await fetchRows('SELECT id, course_id, user_id, is_custom, slug, title, description, sort_order, created_at, updated_at FROM Topics');
  const flashcards = await fetchRows('SELECT id, topic_id, external_id, word, transcription, meaning, word_type, example, example_vi, language, created_at, updated_at FROM Flashcards');

  const mappedCourses = courses.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnail_url: row.thumbnail_url,
    language: row.language,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const mappedTopics = topics.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    owner_user_id: row.user_id ? userIdMap.get(row.user_id) || null : null,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const mappedFlashcards = flashcards.map((row) => ({
    id: row.id,
    topic_id: row.topic_id,
    external_id: row.external_id,
    word: row.word,
    transcription: row.transcription,
    meaning: row.meaning,
    word_type: row.word_type,
    example: row.example,
    example_vi: row.example_vi,
    language: row.language || 'en',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  logStep(`Courses to migrate: ${mappedCourses.length}`);
  await chunkedUpsert(admin, 'courses', mappedCourses, { onConflict: 'id' });
  logStep(`Topics to migrate: ${mappedTopics.length}`);
  await chunkedUpsert(admin, 'topics', mappedTopics, { onConflict: 'id' });
  logStep(`Flashcards to migrate: ${mappedFlashcards.length}`);
  await chunkedUpsert(admin, 'flashcards', mappedFlashcards, { onConflict: 'id' });
}

async function migrateWordProgress(admin, userIdMap) {
  const rows = await fetchRowsOptional('SELECT id, user_id, flashcard_id, is_remembered, updated_at FROM User_Word_Progress');
  const mapped = rows
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      flashcard_id: row.flashcard_id,
      is_remembered: Boolean(row.is_remembered),
      updated_at: row.updated_at,
    }));

  logStep(`User word progress rows to migrate: ${mapped.length}`);
  await chunkedUpsert(admin, 'user_word_progress', mapped, { onConflict: 'id' });
}

async function migrateSrs(admin, userIdMap) {
  const rows = await fetchRows('SELECT id, user_id, flashcard_id, interval_days, ef, repetition, next_review_date, last_reviewed_at, fail_count, created_at, updated_at FROM SRS_Reviews');
  const mapped = rows
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      flashcard_id: row.flashcard_id,
      interval_days: row.interval_days,
      ef: row.ef,
      repetition: row.repetition,
      next_review_date: row.next_review_date,
      last_reviewed_at: row.last_reviewed_at,
      fail_count: row.fail_count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

  logStep(`SRS review rows to migrate: ${mapped.length}`);
  await chunkedUpsert(admin, 'srs_reviews', mapped, { onConflict: 'id' });
}

async function migrateToeic(admin, userIdMap) {
  const tests = await fetchRowsOptional('SELECT id, title, description, created_at FROM Toeic_Tests');
  const groups = await fetchRowsOptional('SELECT id, test_id, part, audio_url, image_url, passage_text FROM Toeic_Question_Groups');
  const hasQuestionExplanation = await columnExists('Toeic_Questions', 'explanation');
  const questions = await fetchRowsOptional(
    hasQuestionExplanation
      ? 'SELECT id, test_id, group_id, question_number, part, question_text, options, correct_answer, explanation, audio_url, image_url FROM Toeic_Questions'
      : 'SELECT id, test_id, group_id, question_number, part, question_text, options, correct_answer, audio_url, image_url FROM Toeic_Questions'
  );
  const records = await fetchRowsOptional('SELECT id, user_id, test_id, reading_score, listening_score, total_score, created_at FROM Toeic_Test_Records');

  logStep(`TOEIC tests to migrate: ${tests.length}`);

  await chunkedUpsert(admin, 'toeic_tests', tests.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
  })), { onConflict: 'id', ignoreDuplicates: true });

  logStep(`TOEIC question groups to migrate: ${groups.length}`);
  await chunkedUpsert(admin, 'toeic_question_groups', groups.map((row) => ({
    id: row.id,
    test_id: row.test_id,
    part: row.part,
    audio_url: row.audio_url,
    image_url: row.image_url,
    passage_text: row.passage_text,
  })), { onConflict: 'id', ignoreDuplicates: true });

  logStep(`TOEIC questions to migrate: ${questions.length}`);
  await chunkedUpsert(admin, 'toeic_questions', questions.map((row) => ({
    id: row.id,
    test_id: row.test_id,
    group_id: row.group_id,
    question_number: row.question_number,
    part: row.part,
    question_text: row.question_text,
    options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
    correct_answer: row.correct_answer,
    explanation: row.explanation || null,
    audio_url: row.audio_url,
    image_url: row.image_url,
  })), { onConflict: 'id', ignoreDuplicates: true });

  logStep(`TOEIC test records to migrate: ${records.filter((row) => userIdMap.has(row.user_id)).length}`);
  await chunkedUpsert(admin, 'toeic_test_records', records
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      test_id: row.test_id,
      reading_score: row.reading_score,
      listening_score: row.listening_score,
      total_score: row.total_score,
      created_at: row.created_at,
    })), { onConflict: 'id', ignoreDuplicates: true });
}

async function migrateActivityAndSupport(admin, userIdMap) {
  const supportRows = await fetchRows(`
    SELECT id, user_id, type, title, content, status, reviewer_id, source_page, reviewed_at, created_at, updated_at
    FROM Support_Tickets
  `).catch(() => []);

  const vocabRows = await fetchRows('SELECT id, user_id, mode, created_at FROM Vocab_Activity_Logs').catch(() => []);

  const mappedSupport = supportRows
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      type: row.type,
      title: row.title,
      content: row.content,
      status: row.status,
      reviewer_id: row.reviewer_id ? userIdMap.get(row.reviewer_id) || null : null,
      source_page: row.source_page,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

  const mappedVocab = vocabRows
    .filter((row) => userIdMap.has(row.user_id))
    .map((row) => ({
      id: row.id,
      user_id: userIdMap.get(row.user_id),
      mode: row.mode,
      created_at: row.created_at,
    }));

  logStep(`Support tickets to migrate: ${mappedSupport.length}`);
  await chunkedUpsert(admin, 'support_tickets', mappedSupport, { onConflict: 'id' });
  logStep(`Vocab activity rows to migrate: ${mappedVocab.length}`);
  await chunkedUpsert(admin, 'vocab_activity_logs', mappedVocab, { onConflict: 'id' });
}

async function syncSequences(admin) {
  if (dryRun) return;
  try {
    await admin.rpc('sync_identity_sequences');
  } catch (error) {
    logStep(`Warning: could not sync identity sequences automatically: ${error.message}`);
  }
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured for migration.');
  }

  const admin = supabaseAdmin;
  logStep(dryRun ? 'Running Supabase migration in dry-run mode.' : 'Running Supabase migration.');

  const userIdMap = await migrateUsers(admin);
  await migrateUserProgress(admin, userIdMap);
  await migrateCatalog(admin, userIdMap);
  await migrateWordProgress(admin, userIdMap);
  await migrateSrs(admin, userIdMap);
  await migrateToeic(admin, userIdMap);
  await migrateActivityAndSupport(admin, userIdMap);
  await syncSequences(admin);

  logStep('Supabase migration complete.');
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
