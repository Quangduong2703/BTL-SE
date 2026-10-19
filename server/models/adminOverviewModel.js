const { ensureSupabaseEnabled, unwrapList } = require('../lib/supabaseData');
const { CUSTOM_TOPICS_COURSE_SLUG } = require('./customCoursesModel');

function formatDateKey(value) {
  return String(value).slice(0, 10);
}

function formatShortLabel(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

async function countQueryRows(query) {
  const result = await query;
  if (result.error) {
    const error = new Error(result.error.message || 'Database count request failed');
    error.status = result.status || 500;
    throw error;
  }

  return Number(result.count || 0);
}

async function getAdminOverviewSummary() {
  const admin = ensureSupabaseEnabled();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00.000Z`;
  const [
    totalUsers,
    courseRowsResult,
    toeicTestCount,
    toeicQuestionCount,
    toeicAttemptCount,
    srsReviewCount,
    vocabActivityCount,
    todayProgressRows,
    todayToeicRows,
    todaySrsRows,
    todayVocabRows,
  ] = await Promise.all([
    countQueryRows(admin.from('profiles').select('*', { count: 'exact', head: true })),
    admin.from('courses').select('id, slug'),
    countQueryRows(admin.from('toeic_tests').select('*', { count: 'exact', head: true })),
    countQueryRows(admin.from('toeic_questions').select('*', { count: 'exact', head: true })),
    countQueryRows(admin.from('toeic_test_records').select('*', { count: 'exact', head: true })),
    countQueryRows(admin.from('srs_reviews').select('*', { count: 'exact', head: true })),
    countQueryRows(admin.from('vocab_activity_logs').select('*', { count: 'exact', head: true })),
    admin.from('user_progress').select('user_id').eq('last_study_date', today),
    admin.from('toeic_test_records').select('user_id').gte('created_at', todayStart),
    admin.from('srs_reviews').select('user_id').or(`last_reviewed_at.gte.${todayStart},created_at.gte.${todayStart}`),
    admin.from('vocab_activity_logs').select('user_id').gte('created_at', todayStart),
  ]);

  const courseRows = unwrapList(courseRowsResult);
  const publicCourseIds = new Set(courseRows.filter((row) => row.slug !== CUSTOM_TOPICS_COURSE_SLUG).map((row) => row.id));
  const publicTopicRows = publicCourseIds.size
    ? unwrapList(await admin
      .from('topics')
      .select('id')
      .is('owner_user_id', null)
      .in('course_id', [...publicCourseIds]))
    : [];
  const publicTopicIds = publicTopicRows.map((row) => row.id);
  const totalFlashcards = publicTopicIds.length
    ? await countQueryRows(admin
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .in('topic_id', publicTopicIds))
    : 0;

  const activeUsers = new Set();
  [
    ...unwrapList(todayProgressRows),
    ...unwrapList(todayToeicRows),
    ...unwrapList(todaySrsRows),
    ...unwrapList(todayVocabRows),
  ].forEach((row) => {
    if (row.user_id) activeUsers.add(row.user_id);
  });

  return {
    totalUsers,
    activeUsersToday: activeUsers.size,
    totalCourses: publicCourseIds.size,
    totalFlashcards,
    totalToeicTests: toeicTestCount,
    totalToeicQuestions: toeicQuestionCount,
    totalToeicAttempts: toeicAttemptCount,
    totalSrsReviews: srsReviewCount,
    totalVocabModeCompletions: vocabActivityCount,
  };
}

async function getAdminRegistrationSeries(days) {
  const admin = ensureSupabaseEnabled();
  const safeDays = Number.isFinite(days) && days > 0 ? days : 7;
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const rows = unwrapList(await admin
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate.toISOString()));

  const countsByDate = new Map();
  rows.forEach((row) => {
    const key = formatDateKey(row.created_at);
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  });

  const points = [];
  for (let index = 0; index < safeDays; index += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    const date = formatDateKey(current.toISOString());
    points.push({
      date,
      label: formatShortLabel(current),
      count: countsByDate.get(date) || 0,
    });
  }

  return {
    days: safeDays,
    points,
    totalRegistrations: points.reduce((sum, point) => sum + point.count, 0),
    range: {
      startDate: points[0]?.date || null,
      endDate: points[points.length - 1]?.date || null,
    },
  };
}

module.exports = {
  getAdminOverviewSummary,
  getAdminRegistrationSeries,
};
