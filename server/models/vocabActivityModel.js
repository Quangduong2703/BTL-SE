const { ensureSupabaseEnabled, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');

const ALLOWED_VOCAB_ACTIVITY_MODES = new Set([
  'flashcard',
  'quiz',
  'listen',
  'typing',
  'match',
  'flappy-bird',
]);

function ensureVocabActivityTable() {
  return Promise.resolve();
}

function normalizeVocabActivityMode(mode) {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  return ALLOWED_VOCAB_ACTIVITY_MODES.has(normalized) ? normalized : '';
}

async function createVocabActivityLog(userId, mode) {
  const normalizedMode = normalizeVocabActivityMode(mode);
  if (!normalizedMode) return null;

  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const inserted = unwrapSingle(await admin
    .from('vocab_activity_logs')
    .insert({
      user_id: profileId,
      mode: normalizedMode,
    })
    .select('id')
    .single());

  return {
    id: inserted.id,
    userId: profileId,
    mode: normalizedMode,
  };
}

module.exports = {
  ensureVocabActivityTable,
  normalizeVocabActivityMode,
  createVocabActivityLog,
  ALLOWED_VOCAB_ACTIVITY_MODES,
};
