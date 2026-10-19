const { ensureSupabaseEnabled, unwrapList, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');

function mapToeicTest(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapToeicQuestion(row) {
  return {
    id: row.id,
    test_id: row.test_id,
    group_id: row.group_id,
    question_number: row.question_number,
    part: row.part,
    question_text: row.question_text,
    options: row.options || {},
    correct_answer: row.correct_answer,
    explanation: row.explanation || null,
    audio_url: row.audio_url || null,
    image_url: row.image_url || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getTests() {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('toeic_tests')
    .select('id, title, description, created_at, updated_at')
    .order('id', { ascending: true }));

  return rows.map(mapToeicTest);
}

async function getTestById(testId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_tests')
    .select('id, title, description, created_at, updated_at')
    .eq('id', testId)
    .limit(1)
    .maybeSingle());

  return row ? mapToeicTest(row) : null;
}

async function getQuestionsByTestId(testId) {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('toeic_questions')
    .select('id, test_id, group_id, question_number, part, question_text, options, correct_answer, explanation, audio_url, image_url')
    .eq('test_id', testId)
    .order('question_number', { ascending: true })
    .order('id', { ascending: true }));

  return rows.map(mapToeicQuestion);
}

async function getTestGroupsByTestId(testId) {
  const admin = ensureSupabaseEnabled();
  return unwrapList(await admin
    .from('toeic_question_groups')
    .select('id, test_id, part, audio_url, image_url, passage_text')
    .eq('test_id', testId)
    .order('part', { ascending: true })
    .order('id', { ascending: true }));
}

async function insertTestRecord(userId, testId, readingScore, listeningScore, totalScore) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const row = unwrapSingle(await admin
    .from('toeic_test_records')
    .insert({
      user_id: profileId,
      test_id: testId,
      reading_score: readingScore,
      listening_score: listeningScore,
      total_score: totalScore,
    })
    .select('id')
    .single());

  return row.id;
}

async function getTestHistoryByUserId(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const records = unwrapList(await admin
    .from('toeic_test_records')
    .select('id, user_id, test_id, reading_score, listening_score, total_score, created_at, updated_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false }));

  if (!records.length) {
    return [];
  }

  const tests = unwrapList(await admin
    .from('toeic_tests')
    .select('id, title')
    .in('id', [...new Set(records.map((record) => record.test_id))]));

  const testMap = new Map(tests.map((test) => [test.id, test]));
  return records.map((record) => ({
    ...record,
    test_title: testMap.get(record.test_id)?.title || null,
  }));
}

module.exports = {
  getTests,
  getTestById,
  getTestGroupsByTestId,
  getQuestionsByTestId,
  insertTestRecord,
  getTestHistoryByUserId,
};
