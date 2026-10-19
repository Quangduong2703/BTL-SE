const { supabaseAdmin, getSupabaseAdminConfigError } = require('../supabase');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ensureSupabaseEnabled() {
  const configError = typeof getSupabaseAdminConfigError === 'function' ? getSupabaseAdminConfigError() : null;
  if (configError) {
    throw configError;
  }

  if (!supabaseAdmin) {
    const error = new Error('Supabase admin client is not configured.');
    error.status = 500;
    throw error;
  }

  return supabaseAdmin;
}

function unwrapSingle(result, fallbackMessage = 'Database request failed') {
  if (result.error) {
    const error = new Error(result.error.message || fallbackMessage);
    error.status = result.status || 500;
    throw error;
  }
  return result.data;
}

function unwrapList(result, fallbackMessage = 'Database request failed') {
  if (result.error) {
    const error = new Error(result.error.message || fallbackMessage);
    error.status = result.status || 500;
    throw error;
  }
  return Array.isArray(result.data) ? result.data : [];
}

async function resolveProfileId(userIdOrUuid) {
  const admin = ensureSupabaseEnabled();

  if (isUuid(userIdOrUuid)) {
    return userIdOrUuid;
  }

  const numericId = Number.parseInt(userIdOrUuid, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    const error = new Error('Invalid user identifier.');
    error.status = 400;
    throw error;
  }

  const result = await admin
    .from('profiles')
    .select('id')
    .eq('legacy_user_id', numericId)
    .limit(1)
    .maybeSingle();

  const profile = unwrapSingle(result, 'Failed to resolve profile id.');
  if (!profile?.id) {
    const error = new Error('Supabase profile mapping not found.');
    error.status = 404;
    throw error;
  }

  return profile.id;
}

async function fetchTopicsWithVocabularyCounts(courseId) {
  const admin = ensureSupabaseEnabled();

  const topicRows = unwrapList(await admin
    .from('topics')
    .select('id, slug, course_id, title, description, sort_order, created_at, updated_at')
    .eq('course_id', courseId)
    .is('owner_user_id', null)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true }));

  if (!topicRows.length) {
    return [];
  }

  const countByTopicId = new Map();
  await Promise.all(topicRows.map(async (topic) => {
    const { count, error } = await admin
      .from('flashcards')
      .select('*', { head: true, count: 'exact' })
      .eq('topic_id', topic.id);

    if (error) throw error;
    countByTopicId.set(topic.id, Number(count || 0));
  }));

  return topicRows.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    courseId: topic.course_id,
    title: topic.title,
    description: topic.description,
    sortOrder: topic.sort_order,
    vocabularyCount: countByTopicId.get(topic.id) || 0,
    createdAt: topic.created_at,
    updatedAt: topic.updated_at,
  }));
}

module.exports = {
  ensureSupabaseEnabled,
  unwrapSingle,
  unwrapList,
  resolveProfileId,
  fetchTopicsWithVocabularyCounts,
  isUuid,
};
