const { CUSTOM_TOPICS_COURSE_SLUG } = require('./customCoursesModel');
const { ensureSupabaseEnabled, unwrapList, unwrapSingle, fetchTopicsWithVocabularyCounts } = require('../lib/supabaseData');

function mapAdminCourseRow(row, topicCount = 0, vocabularyCount = 0) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url || null,
    language: row.language,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    topicCount: Number(topicCount || 0),
    vocabularyCount: Number(vocabularyCount || 0),
  };
}

async function getCourseMetrics(courseIds) {
  const admin = ensureSupabaseEnabled();
  if (!courseIds.length) {
    return new Map();
  }

  const topics = unwrapList(await admin
    .from('topics')
    .select('id, course_id')
    .in('course_id', courseIds)
    .is('owner_user_id', null));

  const topicCountByCourseId = new Map();
  const topicIdsByCourseId = new Map();
  topics.forEach((topic) => {
    topicCountByCourseId.set(topic.course_id, (topicCountByCourseId.get(topic.course_id) || 0) + 1);
    if (!topicIdsByCourseId.has(topic.course_id)) {
      topicIdsByCourseId.set(topic.course_id, []);
    }
    topicIdsByCourseId.get(topic.course_id).push(topic.id);
  });

  const vocabCountByCourseId = new Map();
  await Promise.all(courseIds.map(async (courseId) => {
    const topicIds = topicIdsByCourseId.get(courseId) || [];
    if (!topicIds.length) {
      vocabCountByCourseId.set(courseId, 0);
      return;
    }

    const { count, error } = await admin
      .from('flashcards')
      .select('*', { head: true, count: 'exact' })
      .in('topic_id', topicIds);

    if (error) throw error;
    vocabCountByCourseId.set(courseId, Number(count || 0));
  }));

  return new Map(courseIds.map((courseId) => [courseId, {
    topicCount: topicCountByCourseId.get(courseId) || 0,
    vocabularyCount: vocabCountByCourseId.get(courseId) || 0,
  }]));
}

async function listAdminCourses({ limit, offset, search }) {
  const admin = ensureSupabaseEnabled();
  let countQuery = admin
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .neq('slug', CUSTOM_TOPICS_COURSE_SLUG);

  let query = admin
    .from('courses')
    .select('id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at')
    .neq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const keyword = `%${search}%`;
    countQuery = countQuery.or(`title.ilike.${keyword},slug.ilike.${keyword}`);
    query = query.or(`title.ilike.${keyword},slug.ilike.${keyword}`);
  }

  const countResult = await countQuery;
  const rows = unwrapList(await query);
  const metrics = await getCourseMetrics(rows.map((row) => row.id));

  return {
    items: rows.map((row) => {
      const metric = metrics.get(row.id) || {};
      return mapAdminCourseRow(row, metric.topicCount, metric.vocabularyCount);
    }),
    total: Number(countResult.count || 0),
  };
}

async function getAdminCourseById(courseId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('courses')
    .select('id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at')
    .eq('id', courseId)
    .neq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .limit(1)
    .maybeSingle());

  if (!row) return null;
  const metrics = await getCourseMetrics([row.id]);
  const metric = metrics.get(row.id) || {};
  return mapAdminCourseRow(row, metric.topicCount, metric.vocabularyCount);
}

async function getAdminCourseExportById(courseId) {
  const admin = ensureSupabaseEnabled();
  const course = await getAdminCourseById(courseId);
  if (!course) return null;

  const topics = await fetchTopicsWithVocabularyCounts(courseId);
  const topicIds = topics.map((topic) => topic.id);
  const flashcards = topicIds.length
    ? unwrapList(await admin
      .from('flashcards')
      .select('id, topic_id, word, transcription, meaning, word_type, example, example_vi, language, created_at, updated_at')
      .in('topic_id', topicIds)
      .order('word', { ascending: true })
      .order('id', { ascending: true }))
    : [];

  return {
    ...course,
    topics: topics.map((topic) => ({
      id: topic.id,
      courseId: topic.courseId,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      sortOrder: Number(topic.sortOrder || 0),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    })),
    flashcards: flashcards.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      word: row.word,
      transcription: row.transcription,
      meaning: row.meaning,
      wordType: row.word_type,
      example: row.example,
      exampleVi: row.example_vi,
      language: row.language || 'en',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

async function getAdminCourseBySlug(slug) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('courses')
    .select('id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at')
    .eq('slug', slug)
    .neq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .limit(1)
    .maybeSingle());

  if (!row) return null;
  const metrics = await getCourseMetrics([row.id]);
  const metric = metrics.get(row.id) || {};
  return mapAdminCourseRow(row, metric.topicCount, metric.vocabularyCount);
}

async function createAdminCourse({ slug, title, description, thumbnailUrl, language, sortOrder }) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('courses')
    .insert({
      slug,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      language,
      sort_order: sortOrder,
    })
    .select('id')
    .single());

  return getAdminCourseById(row.id);
}

async function updateAdminCourse(courseId, { slug, title, description, thumbnailUrl, language, sortOrder }) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('courses')
    .update({
      slug,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      language,
      sort_order: sortOrder,
    })
    .eq('id', courseId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminCourse(courseId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('courses')
    .delete()
    .eq('id', courseId)
    .select('id');

  return unwrapList(result).length > 0;
}

module.exports = {
  listAdminCourses,
  getAdminCourseById,
  getAdminCourseExportById,
  getAdminCourseBySlug,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
};
