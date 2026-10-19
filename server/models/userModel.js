const { ensureSupabaseEnabled, unwrapList, unwrapSingle, isUuid } = require('../lib/supabaseData');

const DEFAULT_ADMIN_EMAIL = 'admin@vocabup.local';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_ADMIN_NAME = 'Admin';
const DEFAULT_ADMIN_LOGIN_ALIAS = 'admin';
const DEFAULT_DEMO_EMAIL = 'user@vocabup.local';
const DEFAULT_DEMO_PASSWORD = 'user123';
const DEFAULT_DEMO_NAME = 'User Test';
const DEFAULT_DEMO_LOGIN_ALIAS = 'user';

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.legacy_user_id,
    profileId: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    samplePersonalTopicSeededAt: row.sample_personal_topic_seeded_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getNextLegacyUserId() {
  const admin = ensureSupabaseEnabled();
  const rows = unwrapList(await admin
    .from('profiles')
    .select('legacy_user_id')
    .not('legacy_user_id', 'is', null)
    .order('legacy_user_id', { ascending: false })
    .limit(1));

  return Number(rows[0]?.legacy_user_id || 0) + 1;
}

async function ensureProfileRecord({ authUserId, email, name, role = 'user', status = 'active' }) {
  const admin = ensureSupabaseEnabled();
  const existing = authUserId
    ? unwrapSingle(await admin
      .from('profiles')
      .select('id, legacy_user_id, email, name, role, status, sample_personal_topic_seeded_at, created_at, updated_at')
      .eq('id', authUserId)
      .limit(1)
      .maybeSingle())
    : null;

  const legacyUserId = existing?.legacy_user_id || await getNextLegacyUserId();
  const row = unwrapSingle(await admin
    .from('profiles')
    .upsert({
      id: authUserId,
      legacy_user_id: legacyUserId,
      email,
      name: name || email,
      role,
      status,
    })
    .select('id, legacy_user_id, email, name, role, status, sample_personal_topic_seeded_at, created_at, updated_at')
    .single());

  await admin
    .from('user_progress')
    .upsert({ user_id: row.id }, { onConflict: 'user_id' });

  return mapProfile(row);
}

async function getUserByEmail(email) {
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('profiles')
    .select('id, legacy_user_id, email, name, role, status, sample_personal_topic_seeded_at, created_at, updated_at')
    .eq('email', email)
    .limit(1)
    .maybeSingle());

  return mapProfile(row);
}

async function getUserByLoginIdentifier(identifier) {
  const normalized = typeof identifier === 'string' ? identifier.trim() : '';
  if (!normalized) return null;

  if (normalized.toLowerCase() === DEFAULT_ADMIN_LOGIN_ALIAS) {
    return getUserByEmail(DEFAULT_ADMIN_EMAIL);
  }

  if (normalized.toLowerCase() === DEFAULT_DEMO_LOGIN_ALIAS) {
    return getUserByEmail(DEFAULT_DEMO_EMAIL);
  }

  return getUserByEmail(normalized);
}

async function createUser({ authUserId, email, name }) {
  return ensureProfileRecord({ authUserId, email, name, role: 'user', status: 'active' });
}

async function createUserFromAuthIdentity({ authUserId, email, name }) {
  return ensureProfileRecord({ authUserId, email, name, role: 'user', status: 'active' });
}

async function getUserAuthById(userId) {
  const admin = ensureSupabaseEnabled();
  const query = admin
    .from('profiles')
    .select('id, legacy_user_id, email, name, role, status, sample_personal_topic_seeded_at, created_at, updated_at')
    .limit(1);

  const row = isUuid(userId)
    ? unwrapSingle(await query.eq('id', userId).maybeSingle())
    : unwrapSingle(await query.eq('legacy_user_id', Number(userId)).maybeSingle());

  return mapProfile(row);
}

async function markSamplePersonalTopicSeeded(userId) {
  const admin = ensureSupabaseEnabled();
  const user = await getUserAuthById(userId);
  if (!user?.profileId) return null;

  const row = unwrapSingle(await admin
    .from('profiles')
    .update({ sample_personal_topic_seeded_at: new Date().toISOString() })
    .eq('id', user.profileId)
    .select('id, legacy_user_id, email, name, role, status, sample_personal_topic_seeded_at, created_at, updated_at')
    .single());

  return mapProfile(row);
}

async function createProgressRecordForUser(userId) {
  const admin = ensureSupabaseEnabled();
  const user = await getUserAuthById(userId);
  if (!user?.profileId) return;

  await admin
    .from('user_progress')
    .upsert({ user_id: user.profileId }, { onConflict: 'user_id' });
}

async function ensureDefaultAdminUser() {
  const user = await getUserByEmail(DEFAULT_ADMIN_EMAIL);
  if (user) {
    return ensureProfileRecord({
      authUserId: user.profileId,
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      role: 'admin',
      status: 'active',
    });
  }
  return null;
}

async function ensureDefaultDemoUser() {
  const user = await getUserByEmail(DEFAULT_DEMO_EMAIL);
  if (user) {
    return ensureProfileRecord({
      authUserId: user.profileId,
      email: DEFAULT_DEMO_EMAIL,
      name: DEFAULT_DEMO_NAME,
      role: 'user',
      status: 'active',
    });
  }
  return null;
}

async function createUserFromGoogle({ authUserId, email, name }) {
  return createUserFromAuthIdentity({ authUserId, email, name });
}

module.exports = {
  getUserByEmail,
  getUserByLoginIdentifier,
  createUser,
  createUserFromAuthIdentity,
  createUserFromGoogle,
  getUserAuthById,
  createProgressRecordForUser,
  markSamplePersonalTopicSeeded,
  ensureDefaultAdminUser,
  ensureDefaultDemoUser,
  ensureProfileRecord,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_LOGIN_ALIAS,
  DEFAULT_DEMO_EMAIL,
  DEFAULT_DEMO_PASSWORD,
  DEFAULT_DEMO_LOGIN_ALIAS,
};
