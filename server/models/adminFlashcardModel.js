const { ensureSupabaseEnabled, unwrapList, unwrapSingle } = require('../lib/supabaseData');

function mapAdminFlashcardRow(row) {
  return {
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
  };
}

async function listAdminFlashcardsByTopic({ topicId, search }) {
  const admin = ensureSupabaseEnabled();
  let query = admin
    .from('flashcards')
    .select('id, topic_id, word, transcription, meaning, word_type, example, example_vi, language, created_at, updated_at')
    .eq('topic_id', topicId)
    .order('word', { ascending: true })
    .order('id', { ascending: true });

  if (search) {
    const keyword = `%${search}%`;
    query = query.or(`word.ilike.${keyword},meaning.ilike.${keyword},word_type.ilike.${keyword}`);
  }

  return unwrapList(await query).map(mapAdminFlashcardRow);
}

async function getAdminFlashcardById(flashcardId) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('flashcards')
    .select('id, topic_id, word, transcription, meaning, word_type, example, example_vi, language, created_at, updated_at')
    .eq('id', flashcardId)
    .limit(1)
    .maybeSingle());

  return row ? mapAdminFlashcardRow(row) : null;
}

async function getAdminFlashcardByTopicAndWord(topicId, word) {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('flashcards')
    .select('id, topic_id, word')
    .eq('topic_id', topicId));

  const matched = rows.find((row) => String(row.word).toLowerCase() === String(word).toLowerCase());
  return matched ? { id: matched.id, topicId: matched.topic_id, word: matched.word } : null;
}

async function createAdminFlashcard({ topicId, word, transcription, meaning, wordType, example, exampleVi, language }) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('flashcards')
    .insert({
      topic_id: topicId,
      word,
      transcription,
      meaning,
      word_type: wordType,
      example,
      example_vi: exampleVi,
      language,
    })
    .select('id')
    .single());

  return getAdminFlashcardById(row.id);
}

async function updateAdminFlashcard(flashcardId, { word, transcription, meaning, wordType, example, exampleVi, language }) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('flashcards')
    .update({
      word,
      transcription,
      meaning,
      word_type: wordType,
      example,
      example_vi: exampleVi,
      language,
    })
    .eq('id', flashcardId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteAdminFlashcard(flashcardId) {
  const admin = ensureSupabaseEnabled();
  const result = await admin
    .from('flashcards')
    .delete()
    .eq('id', flashcardId)
    .select('id');

  return unwrapList(result).length > 0;
}

module.exports = {
  listAdminFlashcardsByTopic,
  getAdminFlashcardById,
  getAdminFlashcardByTopicAndWord,
  createAdminFlashcard,
  updateAdminFlashcard,
  deleteAdminFlashcard,
};
