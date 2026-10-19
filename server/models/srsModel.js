const { ensureSupabaseEnabled, unwrapList, resolveProfileId } = require('../lib/supabaseData');

function getVietnamDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

async function getReviewsSupabase(userId, onlyDue) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  let query = admin
    .from('srs_reviews')
    .select('id, user_id, flashcard_id, interval_days, ef, repetition, next_review_date, last_reviewed_at, created_at, updated_at')
    .eq('user_id', profileId)
    .order('next_review_date', { ascending: true })
    .order('id', { ascending: true });

  if (onlyDue) {
    query = query.lte('next_review_date', getVietnamDateStamp());
  }

  const reviews = unwrapList(await query);
  if (!reviews.length) return [];

  const flashcards = unwrapList(await admin
    .from('flashcards')
    .select('id, external_id, topic_id, word, transcription, meaning, word_type, example, example_vi, language, created_at, updated_at')
    .in('id', reviews.map((review) => review.flashcard_id)));

  const flashcardMap = new Map(flashcards.map((flashcard) => [flashcard.id, flashcard]));
  return reviews.map((review) => {
    const flashcard = flashcardMap.get(review.flashcard_id);
    return {
      reviewId: review.id,
      userId: review.user_id,
      flashcardId: review.flashcard_id,
      interval: review.interval_days,
      ef: Number(review.ef),
      repetition: review.repetition,
      nextReviewDate: review.next_review_date,
      lastReviewedAt: review.last_reviewed_at,
      reviewCreatedAt: review.created_at,
      reviewUpdatedAt: review.updated_at,
      flashcardDbId: flashcard?.id,
      id: flashcard?.external_id || String(flashcard?.id),
      topicId: flashcard?.topic_id,
      word: flashcard?.word,
      transcription: flashcard?.transcription,
      mean: flashcard?.meaning,
      wordtype: flashcard?.word_type,
      example: flashcard?.example,
      example_vi: flashcard?.example_vi,
      language: flashcard?.language,
      flashcardCreatedAt: flashcard?.created_at,
      flashcardUpdatedAt: flashcard?.updated_at,
    };
  });
}

async function getDueReviewsByUserId(userId) {
  return getReviewsSupabase(userId, true);
}

async function getReviewQueueByUserId(userId) {
  return getReviewsSupabase(userId, false);
}

async function getFlashcardsByIds(flashcardIds) {
  if (!flashcardIds.length) return [];

  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('flashcards')
    .select('id, topic_id, external_id, word, transcription, meaning, word_type, example, example_vi, language')
    .in('id', flashcardIds));

  return rows.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    publicId: row.external_id || String(row.id),
    word: row.word,
    transcription: row.transcription,
    mean: row.meaning,
    wordtype: row.word_type,
    example: row.example,
    example_vi: row.example_vi,
    language: row.language,
  }));
}

async function enqueueImmediateReviewsRpc(userId, flashcardIds) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const result = await admin.rpc('enqueue_immediate_reviews', {
    p_user_id: profileId,
    p_flashcard_ids: flashcardIds,
  });

  return unwrapList(result).map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    publicId: row.public_id,
    word: row.word,
    transcription: row.transcription,
    mean: row.mean,
    wordtype: row.wordtype,
    example: row.example,
    example_vi: row.example_vi,
    language: row.language,
  }));
}

async function submitSrsReviewBatchRpc(userId, reviewItems) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const result = await admin.rpc('submit_srs_review_batch', {
    p_user_id: profileId,
    p_reviews: reviewItems,
  });

  return unwrapList(result).map((row) => ({
    flashcardId: row.flashcard_id,
    interval: row.interval_days,
    ef: Number(row.ef),
    repetition: row.repetition,
    nextReviewDate: row.next_review_date,
    word: row.word,
    mean: row.mean,
    transcription: row.transcription,
    wordtype: row.wordtype,
  }));
}

module.exports = {
  getDueReviewsByUserId,
  getReviewQueueByUserId,
  getFlashcardsByIds,
  enqueueImmediateReviewsRpc,
  submitSrsReviewBatchRpc,
};
