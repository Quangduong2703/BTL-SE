const { ensureSupabaseEnabled, unwrapList, unwrapSingle } = require('../lib/supabaseData');

function mapToeicTestRow(row, metrics = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || null,
    createdAt: row.created_at,
    questionCount: Number(metrics.questionCount || 0),
    groupCount: Number(metrics.groupCount || 0),
    partsUsed: Number(metrics.partsUsed || 0),
  };
}

function mapToeicGroupRow(row, questionCount = 0) {
  return {
    id: row.id,
    testId: row.test_id,
    part: Number(row.part),
    audioUrl: row.audio_url || null,
    imageUrl: row.image_url || null,
    passageText: row.passage_text || null,
    questionCount: Number(questionCount || 0),
  };
}

function mapToeicQuestionRow(row) {
  return {
    id: row.id,
    testId: row.test_id,
    groupId: row.group_id || null,
    questionNumber: Number(row.question_number),
    part: Number(row.part),
    questionText: row.question_text || null,
    options: row.options || {},
    correctAnswer: row.correct_answer,
    explanation: row.explanation || null,
    audioUrl: row.audio_url || null,
    imageUrl: row.image_url || null,
  };
}

async function getQuestionInsertConfig() {
  return {
    columns: 'test_id, group_id, question_number, part, question_text, options, correct_answer, explanation, audio_url, image_url',
    placeholders: '',
    buildParams: (payload) => payload,
  };
}

async function getToeicMetrics(testIds) {
  const admin = ensureSupabaseEnabled();
  if (!testIds.length) return new Map();

  const questions = unwrapList(await admin
    .from('toeic_questions')
    .select('id, test_id, part')
    .in('test_id', testIds));
  const groups = unwrapList(await admin
    .from('toeic_question_groups')
    .select('id, test_id')
    .in('test_id', testIds));

  const metrics = new Map(testIds.map((id) => [id, { questionCount: 0, groupCount: 0, parts: new Set() }]));
  groups.forEach((group) => {
    const entry = metrics.get(group.test_id);
    if (entry) {
      entry.groupCount += 1;
    }
  });
  questions.forEach((question) => {
    const entry = metrics.get(question.test_id);
    if (entry) {
      entry.questionCount += 1;
      entry.parts.add(Number(question.part));
    }
  });

  return new Map([...metrics.entries()].map(([testId, entry]) => [testId, {
    questionCount: entry.questionCount,
    groupCount: entry.groupCount,
    partsUsed: entry.parts.size,
  }]));
}

async function listAdminToeicTests({ limit, offset, search }) {
  const admin = ensureSupabaseEnabled();
  let countQuery = admin.from('toeic_tests').select('*', { count: 'exact', head: true });
  let query = admin
    .from('toeic_tests')
    .select('id, title, description, created_at')
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const keyword = `%${search}%`;
    countQuery = countQuery.or(`title.ilike.${keyword},description.ilike.${keyword}`);
    query = query.or(`title.ilike.${keyword},description.ilike.${keyword}`);
  }

  const countResult = await countQuery;
  const rows = unwrapList(await query);
  const metrics = await getToeicMetrics(rows.map((row) => row.id));

  return {
    items: rows.map((row) => mapToeicTestRow(row, metrics.get(row.id))),
    total: Number(countResult.count || 0),
  };
}

async function getAdminToeicTestById(testId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_tests')
    .select('id, title, description, created_at')
    .eq('id', testId)
    .limit(1)
    .maybeSingle());

  if (!row) return null;
  const metrics = await getToeicMetrics([row.id]);
  return mapToeicTestRow(row, metrics.get(row.id));
}

async function createAdminToeicTest({ title, description }) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_tests')
    .insert({ title, description })
    .select('id')
    .single());

  return getAdminToeicTestById(row.id);
}

async function updateAdminToeicTest(testId, { title, description }) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_tests')
    .update({ title, description })
    .eq('id', testId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminToeicTest(testId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_tests')
    .delete()
    .eq('id', testId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function listAdminToeicGroupsByTestId(testId) {
  const admin = ensureSupabaseEnabled();
  const groups = unwrapList(await admin
    .from('toeic_question_groups')
    .select('id, test_id, part, audio_url, image_url, passage_text')
    .eq('test_id', testId)
    .order('part', { ascending: true })
    .order('id', { ascending: true }));

  const questions = groups.length
    ? unwrapList(await admin.from('toeic_questions').select('id, group_id').in('group_id', groups.map((group) => group.id)))
    : [];
  const counts = new Map();
  questions.forEach((question) => {
    counts.set(question.group_id, (counts.get(question.group_id) || 0) + 1);
  });

  return groups.map((group) => mapToeicGroupRow(group, counts.get(group.id) || 0));
}

async function getAdminToeicGroupById(groupId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_question_groups')
    .select('id, test_id, part, audio_url, image_url, passage_text')
    .eq('id', groupId)
    .limit(1)
    .maybeSingle());

  if (!row) return null;
  const questions = unwrapList(await admin.from('toeic_questions').select('id').eq('group_id', groupId));
  return mapToeicGroupRow(row, questions.length);
}

async function createAdminToeicGroup({ testId, part, audioUrl, imageUrl, passageText }) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_question_groups')
    .insert({
      test_id: testId,
      part,
      audio_url: audioUrl,
      image_url: imageUrl,
      passage_text: passageText,
    })
    .select('id')
    .single());

  return getAdminToeicGroupById(row.id);
}

async function updateAdminToeicGroup(groupId, { part, audioUrl, imageUrl, passageText }) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_question_groups')
    .update({
      part,
      audio_url: audioUrl,
      image_url: imageUrl,
      passage_text: passageText,
    })
    .eq('id', groupId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminToeicGroup(groupId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_question_groups')
    .delete()
    .eq('id', groupId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function listAdminToeicQuestionsByTestId({ testId, limit, offset, search, part, groupId }) {
  const admin = ensureSupabaseEnabled();
  let countQuery = admin
    .from('toeic_questions')
    .select('*', { count: 'exact', head: true })
    .eq('test_id', testId);
  let query = admin
    .from('toeic_questions')
    .select('id, test_id, group_id, question_number, part, question_text, options, correct_answer, explanation, audio_url, image_url')
    .eq('test_id', testId)
    .order('question_number', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const keyword = `%${search}%`;
    countQuery = countQuery.ilike('question_text', keyword);
    query = query.ilike('question_text', keyword);
  }
  if (part) {
    countQuery = countQuery.eq('part', part);
    query = query.eq('part', part);
  }
  if (groupId === 'ungrouped') {
    countQuery = countQuery.is('group_id', null);
    query = query.is('group_id', null);
  } else if (groupId) {
    countQuery = countQuery.eq('group_id', groupId);
    query = query.eq('group_id', groupId);
  }

  const countResult = await countQuery;
  return {
    items: unwrapList(await query).map(mapToeicQuestionRow),
    total: Number(countResult.count || 0),
  };
}

async function getAdminToeicQuestionById(questionId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_questions')
    .select('id, test_id, group_id, question_number, part, question_text, options, correct_answer, explanation, audio_url, image_url')
    .eq('id', questionId)
    .limit(1)
    .maybeSingle());

  return row ? mapToeicQuestionRow(row) : null;
}

async function createAdminToeicQuestion({
  testId,
  groupId,
  questionNumber,
  part,
  questionText,
  options,
  correctAnswer,
  explanation,
  audioUrl,
  imageUrl,
}) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('toeic_questions')
    .insert({
      test_id: testId,
      group_id: groupId,
      question_number: questionNumber,
      part,
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      explanation,
      audio_url: audioUrl,
      image_url: imageUrl,
    })
    .select('id')
    .single());

  return getAdminToeicQuestionById(row.id);
}

async function updateAdminToeicQuestion(questionId, payload) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_questions')
    .update({
      group_id: payload.groupId,
      question_number: payload.questionNumber,
      part: payload.part,
      question_text: payload.questionText,
      options: payload.options,
      correct_answer: payload.correctAnswer,
      explanation: payload.explanation,
      audio_url: payload.audioUrl,
      image_url: payload.imageUrl,
    })
    .eq('id', questionId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminToeicQuestion(questionId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('toeic_questions')
    .delete()
    .eq('id', questionId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function getMaxToeicQuestionNumber(testId) {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('toeic_questions')
    .select('question_number')
    .eq('test_id', testId)
    .order('question_number', { ascending: false })
    .limit(1));

  return Number(rows[0]?.question_number || 0);
}

module.exports = {
  getQuestionInsertConfig,
  listAdminToeicTests,
  getAdminToeicTestById,
  createAdminToeicTest,
  updateAdminToeicTest,
  deleteAdminToeicTest,
  listAdminToeicGroupsByTestId,
  getAdminToeicGroupById,
  createAdminToeicGroup,
  updateAdminToeicGroup,
  deleteAdminToeicGroup,
  listAdminToeicQuestionsByTestId,
  getAdminToeicQuestionById,
  createAdminToeicQuestion,
  updateAdminToeicQuestion,
  deleteAdminToeicQuestion,
  getMaxToeicQuestionNumber,
};
