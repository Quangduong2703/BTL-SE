const {
  parsePaginationQuery,
  parseSearchQuery,
  buildPaginationMeta,
} = require('../utils/adminQuery');
const {
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
} = require('../models/adminToeicModel');

function normalizeRequiredText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${fieldName} is required`), { status: 400 });
  }

  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw Object.assign(new Error('Text value must be a string'), { status: 400 });
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePositiveId(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`Invalid ${fieldName}`), { status: 400 });
  }
  return parsed;
}

function normalizePart(value) {
  const part = Number.parseInt(value, 10);
  if (!Number.isFinite(part) || part < 1 || part > 7) {
    throw Object.assign(new Error('Part must be between 1 and 7'), { status: 400 });
  }
  return part;
}

function normalizeOptionalMediaUrl(value, fieldName = 'Media URL') {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw Object.assign(new Error(`${fieldName} must be a string`), { status: 400 });
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isValid = /^https?:\/\/.+/i.test(trimmed) || trimmed.startsWith('/uploads/toeic/');
  if (!isValid) {
    throw Object.assign(new Error(`${fieldName} format is invalid`), { status: 400 });
  }

  return trimmed;
}

function normalizeQuestionNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw Object.assign(new Error('Question number must be a positive integer'), { status: 400 });
  }
  return parsed;
}

function getToeicOptionKeys(part) {
  return Number(part) === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
}

function normalizeOptions(value, part) {
  const raw = value || {};
  const optionKeys = getToeicOptionKeys(part);
  const next = {};

  optionKeys.forEach((key) => {
    const optionValue = raw[key] ?? raw[key.toLowerCase()];
    if (typeof optionValue !== 'string' || !optionValue.trim()) {
      throw Object.assign(new Error(`Option ${key} is required`), { status: 400 });
    }
    next[key] = optionValue.trim();
  });

  return next;
}

function normalizeCorrectAnswer(value, part) {
  if (typeof value !== 'string') {
    throw Object.assign(new Error('Correct answer is required'), { status: 400 });
  }

  const answer = value.trim().toUpperCase();
  const allowedAnswers = getToeicOptionKeys(part);
  if (!allowedAnswers.includes(answer)) {
    throw Object.assign(new Error(`Correct answer must be one of ${allowedAnswers.join(', ')}`), { status: 400 });
  }

  return answer;
}

function normalizeToeicImportRoot(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Object.assign(new Error('Import payload must be an object'), { status: 400 });
  }

  if (payload.format !== 'vocabup-toeic-test-export') {
    throw Object.assign(new Error('Unsupported import format'), { status: 400 });
  }

  if (Number(payload.version) !== 1) {
    throw Object.assign(new Error('Unsupported import version'), { status: 400 });
  }

  return payload;
}

function normalizeImportedToeicGroup(payload, index) {
  const groupRef = normalizeRequiredText(payload?.groupRef, `Group ref #${index + 1}`);

  return {
    groupRef,
    part: normalizePart(payload?.part),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
    passageText: normalizeOptionalText(payload?.passageText),
  };
}

function normalizeImportedToeicQuestion(payload, index, allowedGroupRefs) {
  const part = normalizePart(payload?.part);
  const groupRef = payload?.groupRef === undefined || payload?.groupRef === null || payload?.groupRef === ''
    ? null
    : normalizeRequiredText(payload?.groupRef, `Question #${index + 1} group ref`);

  if (groupRef && !allowedGroupRefs.has(groupRef)) {
    throw Object.assign(new Error(`Question #${index + 1} references unknown groupRef "${groupRef}"`), { status: 400 });
  }

  return {
    groupRef,
    questionNumber: normalizeQuestionNumber(payload?.questionNumber, index + 1),
    part,
    questionText: normalizeOptionalText(payload?.questionText),
    options: normalizeOptions(payload?.options, part),
    correctAnswer: normalizeCorrectAnswer(payload?.correctAnswer, part),
    explanation: normalizeOptionalText(payload?.explanation),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
  };
}

function normalizeImportedToeicPayload(payload) {
  const root = normalizeToeicImportRoot(payload);
  const testPayload = root.test;
  if (!testPayload || typeof testPayload !== 'object' || Array.isArray(testPayload)) {
    throw Object.assign(new Error('Import file is missing test data'), { status: 400 });
  }

  const title = normalizeRequiredText(testPayload?.title, 'Test title');
  const description = normalizeOptionalText(testPayload?.description);

  if (!Array.isArray(root.groups)) {
    throw Object.assign(new Error('Import file is missing groups array'), { status: 400 });
  }

  if (!Array.isArray(root.questions)) {
    throw Object.assign(new Error('Import file is missing questions array'), { status: 400 });
  }

  const groups = root.groups.map((group, index) => normalizeImportedToeicGroup(group, index));
  const seenGroupRefs = new Set();
  groups.forEach((group) => {
    if (seenGroupRefs.has(group.groupRef)) {
      throw Object.assign(new Error(`Duplicate groupRef "${group.groupRef}" in import file`), { status: 400 });
    }
    seenGroupRefs.add(group.groupRef);
  });

  const questions = root.questions.map((question, index) =>
    normalizeImportedToeicQuestion(question, index, seenGroupRefs)
  );

  return {
    test: {
      title,
      description,
    },
    groups,
    questions,
  };
}

async function ensureToeicTestExists(testId) {
  const test = await getAdminToeicTestById(testId);
  if (!test) {
    throw Object.assign(new Error('TOEIC test not found'), { status: 404 });
  }
  return test;
}

async function ensureToeicGroupBelongsToTest(groupId, testId) {
  if (groupId === null || groupId === undefined || groupId === '') return null;
  const parsedGroupId = normalizePositiveId(groupId, 'group id');
  const group = await getAdminToeicGroupById(parsedGroupId);
  if (!group || Number(group.testId) !== Number(testId)) {
    throw Object.assign(new Error('Question group not found in this test'), { status: 404 });
  }
  return group;
}

async function fetchAdminToeicTests(query) {
  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const result = await listAdminToeicTests({ limit, offset, search });

  return {
    items: result.items,
    meta: buildPaginationMeta({ page, limit, total: result.total }),
    filters: { search },
  };
}

async function fetchAdminToeicTest(testId) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  const test = await ensureToeicTestExists(parsedTestId);
  const groups = await listAdminToeicGroupsByTestId(parsedTestId);
  return {
    ...test,
    groups,
  };
}

async function createAdminToeicTestEntry(payload) {
  const title = normalizeRequiredText(payload?.title, 'Title');
  const description = normalizeOptionalText(payload?.description);
  return createAdminToeicTest({ title, description });
}

async function updateAdminToeicTestEntry(testId, payload) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  await ensureToeicTestExists(parsedTestId);

  const title = normalizeRequiredText(payload?.title, 'Title');
  const description = normalizeOptionalText(payload?.description);

  await updateAdminToeicTest(parsedTestId, { title, description });
  return fetchAdminToeicTest(parsedTestId);
}

async function deleteAdminToeicTestEntry(testId) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  const existing = await ensureToeicTestExists(parsedTestId);
  await deleteAdminToeicTest(parsedTestId);
  return { success: true, deleted: existing };
}

async function exportAdminToeicTestEntry(testId) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  const test = await ensureToeicTestExists(parsedTestId);
  const groups = await listAdminToeicGroupsByTestId(parsedTestId);
  const questionsResult = await listAdminToeicQuestionsByTestId({
    testId: parsedTestId,
    limit: 10000,
    offset: 0,
    search: '',
    part: null,
    groupId: null,
  });

  const groupRefMap = new Map();
  groups.forEach((group, index) => {
    groupRefMap.set(Number(group.id), `group-${index + 1}`);
  });

  return {
    format: 'vocabup-toeic-test-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      app: 'VocabUp',
      entity: 'toeic-test',
    },
    test: {
      title: test.title,
      description: test.description,
    },
    groups: groups.map((group) => ({
      groupRef: groupRefMap.get(Number(group.id)),
      part: group.part,
      audioUrl: group.audioUrl,
      imageUrl: group.imageUrl,
      passageText: group.passageText,
    })),
    questions: (questionsResult.items || []).map((question) => ({
      groupRef: question.groupId ? groupRefMap.get(Number(question.groupId)) || null : null,
      questionNumber: question.questionNumber,
      part: question.part,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
    })),
  };
}

async function importAdminToeicTestEntry(payload) {
  const normalized = normalizeImportedToeicPayload(payload);
  let importedTestId = null;

  try {
    const createdTest = await createAdminToeicTest({
      title: normalized.test.title,
      description: normalized.test.description,
    });
    importedTestId = createdTest.id;

    const groupIdByRef = new Map();
    for (const group of normalized.groups) {
      const createdGroup = await createAdminToeicGroup({
        testId: importedTestId,
        part: group.part,
        audioUrl: group.audioUrl,
        imageUrl: group.imageUrl,
        passageText: group.passageText,
      });
      groupIdByRef.set(group.groupRef, createdGroup.id);
    }

    for (const question of normalized.questions) {
      await createAdminToeicQuestion({
        testId: importedTestId,
        groupId: question.groupRef ? groupIdByRef.get(question.groupRef) || null : null,
        questionNumber: question.questionNumber,
        part: question.part,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        audioUrl: question.audioUrl,
        imageUrl: question.imageUrl,
      });
    }

    const importedTest = await fetchAdminToeicTest(importedTestId);
    return {
      test: importedTest,
      importedCounts: {
        groups: normalized.groups.length,
        questions: normalized.questions.length,
      },
    };
  } catch (error) {
    if (importedTestId) {
      await deleteAdminToeicTest(importedTestId).catch(() => undefined);
    }
    throw error;
  }
}

async function fetchAdminToeicGroups(testId) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  await ensureToeicTestExists(parsedTestId);
  return listAdminToeicGroupsByTestId(parsedTestId);
}

async function createAdminToeicGroupEntry(testId, payload) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  await ensureToeicTestExists(parsedTestId);

  return createAdminToeicGroup({
    testId: parsedTestId,
    part: normalizePart(payload?.part),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
    passageText: normalizeOptionalText(payload?.passageText),
  });
}

async function updateAdminToeicGroupEntry(groupId, payload) {
  const parsedGroupId = normalizePositiveId(groupId, 'group id');
  const group = await getAdminToeicGroupById(parsedGroupId);
  if (!group) {
    throw Object.assign(new Error('Question group not found'), { status: 404 });
  }

  await updateAdminToeicGroup(parsedGroupId, {
    part: normalizePart(payload?.part),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
    passageText: normalizeOptionalText(payload?.passageText),
  });

  return getAdminToeicGroupById(parsedGroupId);
}

async function deleteAdminToeicGroupEntry(groupId) {
  const parsedGroupId = normalizePositiveId(groupId, 'group id');
  const group = await getAdminToeicGroupById(parsedGroupId);
  if (!group) {
    throw Object.assign(new Error('Question group not found'), { status: 404 });
  }
  await deleteAdminToeicGroup(parsedGroupId);
  return { success: true, deleted: group };
}

async function fetchAdminToeicQuestions(testId, query) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  await ensureToeicTestExists(parsedTestId);

  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const part = query?.part ? normalizePart(query.part) : null;

  let groupId = null;
  if (query?.groupId === 'ungrouped') {
    groupId = 'ungrouped';
  } else if (query?.groupId) {
    groupId = normalizePositiveId(query.groupId, 'group id');
  }

  const result = await listAdminToeicQuestionsByTestId({
    testId: parsedTestId,
    limit,
    offset,
    search,
    part,
    groupId,
  });

  return {
    items: result.items,
    meta: buildPaginationMeta({ page, limit, total: result.total }),
    filters: {
      search,
      part,
      groupId: groupId === 'ungrouped' ? 'ungrouped' : groupId,
    },
  };
}

async function fetchAdminToeicQuestion(questionId) {
  const parsedQuestionId = normalizePositiveId(questionId, 'question id');
  const question = await getAdminToeicQuestionById(parsedQuestionId);
  if (!question) {
    throw Object.assign(new Error('TOEIC question not found'), { status: 404 });
  }
  return question;
}

async function createAdminToeicQuestionEntry(testId, payload) {
  const parsedTestId = normalizePositiveId(testId, 'test id');
  await ensureToeicTestExists(parsedTestId);

  const group = await ensureToeicGroupBelongsToTest(payload?.groupId, parsedTestId);
  const part = normalizePart(payload?.part);
  const nextQuestionNumber = await getMaxToeicQuestionNumber(parsedTestId);
  const questionNumber = normalizeQuestionNumber(payload?.questionNumber, nextQuestionNumber + 1);

  if (group && Number(group.part) !== Number(part)) {
    throw Object.assign(new Error('Question part must match selected group part'), { status: 400 });
  }

  return createAdminToeicQuestion({
    testId: parsedTestId,
    groupId: group ? group.id : null,
    questionNumber,
    part,
    questionText: normalizeOptionalText(payload?.questionText),
    options: normalizeOptions(payload?.options, part),
    correctAnswer: normalizeCorrectAnswer(payload?.correctAnswer, part),
    explanation: normalizeOptionalText(payload?.explanation),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
  });
}

async function updateAdminToeicQuestionEntry(questionId, payload) {
  const parsedQuestionId = normalizePositiveId(questionId, 'question id');
  const existing = await getAdminToeicQuestionById(parsedQuestionId);
  if (!existing) {
    throw Object.assign(new Error('TOEIC question not found'), { status: 404 });
  }

  const group = await ensureToeicGroupBelongsToTest(payload?.groupId, existing.testId);
  const part = normalizePart(payload?.part);
  const questionNumber = normalizeQuestionNumber(payload?.questionNumber);

  if (group && Number(group.part) !== Number(part)) {
    throw Object.assign(new Error('Question part must match selected group part'), { status: 400 });
  }

  await updateAdminToeicQuestion(parsedQuestionId, {
    groupId: group ? group.id : null,
    questionNumber,
    part,
    questionText: normalizeOptionalText(payload?.questionText),
    options: normalizeOptions(payload?.options, part),
    correctAnswer: normalizeCorrectAnswer(payload?.correctAnswer, part),
    explanation: normalizeOptionalText(payload?.explanation),
    audioUrl: normalizeOptionalMediaUrl(payload?.audioUrl, 'Audio URL'),
    imageUrl: normalizeOptionalMediaUrl(payload?.imageUrl, 'Image URL'),
  });

  return getAdminToeicQuestionById(parsedQuestionId);
}

async function deleteAdminToeicQuestionEntry(questionId) {
  const parsedQuestionId = normalizePositiveId(questionId, 'question id');
  const existing = await getAdminToeicQuestionById(parsedQuestionId);
  if (!existing) {
    throw Object.assign(new Error('TOEIC question not found'), { status: 404 });
  }

  await deleteAdminToeicQuestion(parsedQuestionId);
  return { success: true, deleted: existing };
}

module.exports = {
  fetchAdminToeicTests,
  fetchAdminToeicTest,
  exportAdminToeicTestEntry,
  importAdminToeicTestEntry,
  createAdminToeicTestEntry,
  updateAdminToeicTestEntry,
  deleteAdminToeicTestEntry,
  fetchAdminToeicGroups,
  createAdminToeicGroupEntry,
  updateAdminToeicGroupEntry,
  deleteAdminToeicGroupEntry,
  fetchAdminToeicQuestions,
  fetchAdminToeicQuestion,
  createAdminToeicQuestionEntry,
  updateAdminToeicQuestionEntry,
  deleteAdminToeicQuestionEntry,
};
