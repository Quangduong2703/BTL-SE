const { CUSTOM_TOPICS_COURSE_SLUG } = require('./customCoursesModel');
const { ensureSupabaseEnabled, unwrapList, unwrapSingle, fetchTopicsWithVocabularyCounts } = require('../lib/supabaseData');

async function getAllCourses() {
  const admin = ensureSupabaseEnabled();
  const courses = unwrapList(await admin
    .from('courses')
    .select('id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at')
    .neq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true }));

  const topics = unwrapList(await admin
    .from('topics')
    .select('id, course_id')
    .is('owner_user_id', null)
    .in('course_id', courses.map((course) => course.id)));

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
  await Promise.all(courses.map(async (course) => {
    const topicIds = topicIdsByCourseId.get(course.id) || [];
    if (!topicIds.length) {
      vocabCountByCourseId.set(course.id, 0);
      return;
    }

    const { count, error } = await admin
      .from('flashcards')
      .select('*', { head: true, count: 'exact' })
      .in('topic_id', topicIds);

    if (error) throw error;
    vocabCountByCourseId.set(course.id, Number(count || 0));
  }));

  return courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnail_url,
    language: course.language,
    sortOrder: course.sort_order,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    topic_count: topicCountByCourseId.get(course.id) || 0,
    vocabulary_count: vocabCountByCourseId.get(course.id) || 0,
  }));
}

async function getCourseBySlug(slug) {
  const admin = ensureSupabaseEnabled();
  const course = unwrapSingle(await admin
    .from('courses')
    .select('id, slug, title, description, thumbnail_url, language, sort_order, created_at, updated_at')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle());

  return course
    ? {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      language: course.language,
      sortOrder: course.sort_order,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    }
    : null;
}

async function getTopicsByCourseId(courseId) {
  return fetchTopicsWithVocabularyCounts(courseId);
}

module.exports = {
  getAllCourses,
  getCourseBySlug,
  getTopicsByCourseId,
};
