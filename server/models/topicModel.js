const { ensureSupabaseEnabled, unwrapList, unwrapSingle } = require('../lib/supabaseData');

async function getTopicBySlug(slug) {
  const admin = ensureSupabaseEnabled();
  const topic = unwrapSingle(await admin
    .from('topics')
    .select('id, slug, course_id, title, description, sort_order, created_at, updated_at')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle());

  return topic
    ? {
      id: topic.id,
      slug: topic.slug,
      courseId: topic.course_id,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sort_order,
      createdAt: topic.created_at,
      updatedAt: topic.updated_at,
    }
    : null;
}

async function getFlashcardsByTopicId(topicId) {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('flashcards')
    .select('id, external_id, word, transcription, meaning, word_type, example, example_vi, language')
    .eq('topic_id', topicId)
    .order('id', { ascending: true }));

  return rows.map((row) => ({
    flashcardId: row.id,
    id: row.external_id || String(row.id),
    word: row.word,
    transcription: row.transcription,
    mean: row.meaning,
    wordtype: row.word_type,
    example: row.example,
    example_vi: row.example_vi,
    language: row.language,
  }));
}

module.exports = {
  getTopicBySlug,
  getFlashcardsByTopicId,
};
