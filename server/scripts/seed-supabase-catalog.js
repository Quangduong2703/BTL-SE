require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { loadPublicCoursesCatalog } = require('../lib/publicCatalog');
const { supabaseAdmin, getSupabaseAdminConfigError } = require('../supabase');

const INSERT_BATCH_SIZE = 200;

function assertSupabaseConfig() {
  const configError = typeof getSupabaseAdminConfigError === 'function'
    ? getSupabaseAdminConfigError()
    : null;

  if (configError) throw configError;
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function normalizeWord(word, course, topicId) {
  const meaning = word.mean ?? word.meaning ?? word.translation ?? word.vi ?? '';
  const normalizedWord = String(word.word || '').trim();

  if (!normalizedWord || !String(meaning).trim()) return null;

  return {
    topic_id: topicId,
    external_id: word.id ? String(word.id) : null,
    word: normalizedWord,
    transcription: word.transcription || null,
    meaning: String(meaning).trim(),
    word_type: word.wordtype || word.wordType || null,
    example: word.example || null,
    example_vi: word.example_vi || word.exampleVi || null,
    language: word.language || course.language || course.lang || 'en',
  };
}

async function findOrCreateCourse(course) {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('courses')
    .select('id')
    .eq('slug', course.slug)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    slug: course.slug,
    title: course.title,
    description: course.description || null,
    language: course.language || course.lang || 'en',
    sort_order: Number(course.sortOrder || course.sort_order || 0),
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin.from('courses').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.from('courses').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateTopic(courseId, course, topic, topicIndex) {
  const slug = topic.slug || topic.id || `topic-${topicIndex + 1}`;
  const { data: existingRows, error: lookupError } = await supabaseAdmin
    .from('topics')
    .select('id')
    .eq('course_id', courseId)
    .eq('slug', slug)
    .is('owner_user_id', null)
    .limit(1);

  if (lookupError) throw lookupError;

  const payload = {
    course_id: courseId,
    owner_user_id: null,
    slug,
    title: topic.title || slug,
    description: topic.description || null,
    language: topic.language || course.language || course.lang || 'en',
    is_custom: false,
    sort_order: Number(topic.sortOrder || topic.sort_order || topicIndex + 1),
  };

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { error } = await supabaseAdmin.from('topics').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.from('topics').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
}

async function seedFlashcards(topicId, course, topic) {
  const { data: existingRows, error: lookupError } = await supabaseAdmin
    .from('flashcards')
    .select('external_id, word')
    .eq('topic_id', topicId);

  if (lookupError) throw lookupError;

  const existingExternalIds = new Set(
    (existingRows || []).map((row) => row.external_id).filter(Boolean).map(String),
  );
  const existingWords = new Set(
    (existingRows || []).map((row) => String(row.word || '').toLowerCase()),
  );

  const rows = (topic.words || [])
    .map((word) => normalizeWord(word, course, topicId))
    .filter(Boolean)
    .filter((word) => {
      const externalId = word.external_id && String(word.external_id);
      const normalizedWord = word.word.toLowerCase();
      if (externalId) {
        if (existingExternalIds.has(externalId)) return false;
        existingExternalIds.add(externalId);
        return true;
      }

      if (existingWords.has(normalizedWord)) return false;
      existingWords.add(normalizedWord);
      return true;
    });

  for (const batch of chunks(rows, INSERT_BATCH_SIZE)) {
    const { error } = await supabaseAdmin.from('flashcards').insert(batch);
    if (error) throw error;
  }

  return rows.length;
}

async function countRows(tableName) {
  const { count, error } = await supabaseAdmin
    .from(tableName)
    .select('*', { head: true, count: 'exact' });
  if (error) throw error;
  return Number(count || 0);
}

async function main() {
  assertSupabaseConfig();
  const catalog = await loadPublicCoursesCatalog();
  let seededTopics = 0;
  let seededWords = 0;

  for (const [courseIndex, course] of catalog.entries()) {
    const courseId = await findOrCreateCourse(course);
    let courseWords = 0;

    for (const [topicIndex, topic] of (course.topics || []).entries()) {
      const topicId = await findOrCreateTopic(courseId, course, topic, topicIndex);
      courseWords += await seedFlashcards(topicId, course, topic);
      seededTopics += 1;
    }

    seededWords += courseWords;
    process.stdout.write(`Seeded ${courseIndex + 1}/${catalog.length}: ${course.title} (${course.topics?.length || 0} topics, ${courseWords} new words)\n`);
  }

  const [courseCount, topicCount, flashcardCount] = await Promise.all([
    countRows('courses'),
    countRows('topics'),
    countRows('flashcards'),
  ]);

  process.stdout.write(`Catalog seed complete. New topics: ${seededTopics}; new words: ${seededWords}.\n`);
  process.stdout.write(`Supabase totals. Courses: ${courseCount}; topics: ${topicCount}; flashcards: ${flashcardCount}.\n`);
}

main().catch((error) => {
  console.error('Supabase catalog seed failed:', error.message || error);
  process.exit(1);
});
