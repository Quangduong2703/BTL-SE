const { ensureSupabaseEnabled, unwrapList, resolveProfileId } = require('../lib/supabaseData');

async function getWordProgressByUser(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const rows = unwrapList(await admin
    .from('user_word_progress')
    .select('flashcard_id')
    .eq('user_id', profileId)
    .eq('is_remembered', true));

  const result = {};
  rows.forEach((row) => {
    result[row.flashcard_id] = true;
  });
  return result;
}

async function batchUpdateWordProgress(userId, updates) {
  if (!updates || updates.length === 0) return;

  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  await admin
    .from('user_word_progress')
    .upsert(
      updates.map((item) => ({
        user_id: profileId,
        flashcard_id: item.flashcard_id,
        is_remembered: Boolean(item.is_remembered),
      })),
      { onConflict: 'user_id,flashcard_id' },
    );
}

async function toggleWordProgress(userId, flashcardId, isRemembered) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  await admin
    .from('user_word_progress')
    .upsert(
      {
        user_id: profileId,
        flashcard_id: flashcardId,
        is_remembered: Boolean(isRemembered),
      },
      { onConflict: 'user_id,flashcard_id' },
    );
}

module.exports = {
  getWordProgressByUser,
  batchUpdateWordProgress,
  toggleWordProgress,
};
