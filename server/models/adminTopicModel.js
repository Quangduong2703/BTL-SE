const { ensureSupabaseEnabled, unwrapList, unwrapSingle, fetchTopicsWithVocabularyCounts } = require('../lib/supabaseData');

function mapAdminTopicRow(row) {
  return {
    id: row.id,
    courseId: row.courseId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sortOrder: Number(row.sortOrder || 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    vocabularyCount: Number(row.vocabularyCount || 0),
  };
}

async function listAdminTopicsByCourse({ courseId, limit, offset, search }) {
  let items = await fetchTopicsWithVocabularyCounts(courseId);
  if (search) {
    const keyword = search.toLowerCase();
    items = items.filter((topic) =>
      String(topic.title || '').toLowerCase().includes(keyword)
      || String(topic.slug || '').toLowerCase().includes(keyword));
  }

  return {
    items: items.slice(offset, offset + limit).map(mapAdminTopicRow),
    total: items.length,
  };
}

async function getAdminTopicById(topicId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('topics')
    .select('id, course_id, slug, title, description, sort_order, created_at, updated_at, owner_user_id')
    .eq('id', topicId)
    .is('owner_user_id', null)
    .limit(1)
    .maybeSingle());

  if (!row) return null;

  const flashcards = unwrapList(await admin
    .from('flashcards')
    .select('id')
    .eq('topic_id', topicId));

  return mapAdminTopicRow({
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vocabularyCount: flashcards.length,
  });
}

async function getAdminTopicBySlug(slug) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('topics')
    .select('id, course_id, slug')
    .eq('slug', slug)
    .is('owner_user_id', null)
    .limit(1)
    .maybeSingle());

  return row ? { id: row.id, courseId: row.course_id, slug: row.slug } : null;
}

async function countAdminTopicsByCourse(courseId) {
  const topics = await fetchTopicsWithVocabularyCounts(courseId);
  return topics.length;
}

async function createAdminTopic({ courseId, slug, title, description, sortOrder }) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('topics')
    .insert({
      course_id: courseId,
      slug,
      title,
      description,
      sort_order: sortOrder,
    })
    .select('id')
    .single());

  return getAdminTopicById(row.id);
}

async function updateAdminTopic(topicId, { slug, title, description, sortOrder }) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('topics')
    .update({
      slug,
      title,
      description,
      sort_order: sortOrder,
    })
    .eq('id', topicId)
    .is('owner_user_id', null)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminTopic(topicId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('topics')
    .delete()
    .eq('id', topicId)
    .is('owner_user_id', null)
    .select('id');

  return unwrapList(result).length > 0;
}

async function reorderAdminTopics(courseId, items) {
  const admin = ensureSupabaseEnabled();
  const existing = unwrapList(await admin
    .from('topics')
    .select('id')
    .eq('course_id', courseId)
    .is('owner_user_id', null)
    .in('id', items.map((item) => item.id)));

  if (existing.length !== items.length) {
    throw Object.assign(new Error('One or more topics were not found in this course'), { status: 404 });
  }

  for (const item of items) {
    const result = await admin
      .from('topics')
      .update({ sort_order: item.sortOrder })
      .eq('id', item.id)
      .eq('course_id', courseId)
      .is('owner_user_id', null)
      .select('id');
    unwrapList(result);
  }

  const reordered = await fetchTopicsWithVocabularyCounts(courseId);
  return reordered.map(mapAdminTopicRow);
}

module.exports = {
  listAdminTopicsByCourse,
  getAdminTopicById,
  getAdminTopicBySlug,
  countAdminTopicsByCourse,
  createAdminTopic,
  updateAdminTopic,
  deleteAdminTopic,
  reorderAdminTopics,
};
