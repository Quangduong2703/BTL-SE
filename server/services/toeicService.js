const {
  getTests,
  getTestById,
  getTestGroupsByTestId,
  getQuestionsByTestId,
  insertTestRecord,
  getTestHistoryByUserId,
} = require('../models/toeicModel');
const { addXpService } = require('./progressService');
const { getListeningScaledScore, getReadingScaledScore } = require('../utils/toeicScoreMapping');
const { getOrSet, deleteByPrefix } = require('../lib/ttlCache');

const TOEIC_CACHE_PREFIX = 'toeic:';
const TOEIC_TESTS_TTL_MS = 5 * 60 * 1000;
const TOEIC_TEST_DETAILS_TTL_MS = 10 * 60 * 1000;
const TOEIC_PRACTICE_MODES_TTL_MS = 5 * 60 * 1000;

const PRACTICE_MODE_METADATA = [
  {
    id: 'part1-picture',
    label: 'Part 1',
    title: 'Picture Description',
    desc: 'Xem hình, nghe bốn câu mô tả và chọn đáp án A/B/C/D đúng nhất với bức ảnh.',
    icon: '📸',
    type: 'listening',
  },
  {
    id: 'part2-response',
    label: 'Part 2',
    title: 'Question-Response',
    desc: 'Nghe một câu hỏi hoặc câu nói ngắn, rồi chọn phản hồi A/B/C phù hợp nhất.',
    icon: '💬',
    type: 'listening',
  },
  {
    id: 'part3-conversations',
    label: 'Part 3',
    title: 'Conversations',
    desc: 'Nghe đoạn hội thoại ngắn và trả lời câu hỏi trắc nghiệm A/B/C/D về nội dung vừa nghe.',
    icon: '👥',
    type: 'listening',
  },
  {
    id: 'part4-talks',
    label: 'Part 4',
    title: 'Talks',
    desc: 'Nghe bài nói hoặc thông báo ngắn của một người và chọn đáp án A/B/C/D đúng nhất.',
    icon: '📢',
    type: 'listening',
  },
  {
    id: 'part5-reading',
    label: 'Part 5',
    title: 'Incomplete Sentences',
    desc: 'Đọc câu chưa hoàn chỉnh và chọn đáp án A/B/C/D phù hợp nhất để điền vào chỗ trống.',
    icon: '📝',
    type: 'reading',
  },
  {
    id: 'part6-reading',
    label: 'Part 6',
    title: 'Text Completion',
    desc: 'Đọc đoạn văn ngắn và chọn đáp án A/B/C/D phù hợp nhất với từng chỗ trống.',
    icon: '📄',
    type: 'reading',
  },
  {
    id: 'part7-reading',
    label: 'Part 7',
    title: 'Reading Comprehension',
    desc: 'Đọc passage và trả lời câu hỏi A/B/C/D về ý chính, chi tiết và suy luận.',
    icon: '📖',
    type: 'reading',
  },
];

async function getTestsList() {
  return getOrSet(`${TOEIC_CACHE_PREFIX}tests:list`, TOEIC_TESTS_TTL_MS, () => getTests());
}

async function getTestDetails(testId) {
  return getOrSet(`${TOEIC_CACHE_PREFIX}tests:${testId}:details`, TOEIC_TEST_DETAILS_TTL_MS, async () => {
    const test = await getTestById(testId);
    if (!test) return null;

    const groups = await getTestGroupsByTestId(testId);
    const questions = await getQuestionsByTestId(testId);

    const safeQuestions = questions.map((question) => {
      const { correct_answer, ...safeQuestion } = question;
      return safeQuestion;
    });

    const groupedQuestions = [];
    const singleQuestions = [];

    const groupMap = new Map();
    groups.forEach((group) => {
      groupMap.set(group.id, { ...group, questions: [] });
    });

    safeQuestions.forEach((question) => {
      if (question.group_id && groupMap.has(question.group_id)) {
        groupMap.get(question.group_id).questions.push(question);
      } else {
        singleQuestions.push(question);
      }
    });

    groupMap.forEach((group) => groupedQuestions.push(group));

    return {
      ...test,
      groups: groupedQuestions,
      single_questions: singleQuestions,
    };
  });
}

async function submitTest(userId, testId, userAnswers, isPartial = false) {
  const test = await getTestById(testId);
  if (!test) throw new Error('Test not found');

  const questions = await getQuestionsByTestId(testId);

  let readingCorrect = 0;
  let listeningCorrect = 0;

  const correctAnswersMap = {};

  questions.forEach((question) => {
    correctAnswersMap[question.id] = question.correct_answer;
    const userAnswer = userAnswers.find((answer) => answer.question_id === question.id);
    if (userAnswer && userAnswer.selected === question.correct_answer) {
      if (question.part >= 1 && question.part <= 4) {
        listeningCorrect++;
      } else {
        readingCorrect++;
      }
    }
  });

  const listeningScore = getListeningScaledScore(listeningCorrect);
  const readingScore = getReadingScaledScore(readingCorrect);
  const totalScore = readingScore + listeningScore;

  let xpResult = null;
  if (!isPartial) {
    await insertTestRecord(userId, testId, readingScore, listeningScore, totalScore);
    xpResult = await addXpService(userId, 50);
  }

  return {
    readingScore,
    listeningScore,
    totalScore,
    readingCorrect,
    listeningCorrect,
    xpAwarded: isPartial ? 0 : 50,
    newLevel: xpResult ? xpResult.newLevel : null,
    levelUp: xpResult ? xpResult.levelUp : false,
    correctAnswersMap,
  };
}

async function getPracticeModes() {
  return getOrSet(`${TOEIC_CACHE_PREFIX}practice-modes`, TOEIC_PRACTICE_MODES_TTL_MS, async () => {
    const tests = await getTestsList();

    return PRACTICE_MODE_METADATA.map((mode) => ({
      id: mode.id,
      label: mode.label,
      title: mode.title,
      desc: mode.desc,
      icon: mode.icon,
      type: mode.type,
      topics: tests.map((test) => ({
        id: `practice-${test.id}-${mode.id}`,
        testId: test.id,
        partKey: mode.label.toUpperCase(),
        title: test.title || test.name,
        desc: `Luyện tập ${mode.label} của ${test.title || test.name}.`,
        icon: '📚',
        practiceType: mode.id,
      })),
    }));
  });
}

async function getTestHistory(userId) {
  return getTestHistoryByUserId(userId);
}

function invalidateToeicCache() {
  deleteByPrefix(TOEIC_CACHE_PREFIX);
}

module.exports = {
  getTestsList,
  getTestDetails,
  submitTest,
  getPracticeModes,
  getTestHistory,
  invalidateToeicCache,
};
