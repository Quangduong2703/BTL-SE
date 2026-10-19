const { ensureSupabaseEnabled, unwrapList, unwrapSingle, isUuid } = require('../lib/supabaseData');
const { DEFAULT_ADMIN_EMAIL, ensureDefaultAdminUser } = require('./userModel');
const { deleteSupabaseAuthUserById } = require('../supabase');

const ROOT_ADMIN_ID = 1;
let rootAdminReadyPromise = null;

async function ensureRootAdminUser() {
  if (!rootAdminReadyPromise) {
    rootAdminReadyPromise = ensureDefaultAdminUser().catch((error) => {
      rootAdminReadyPromise = null;
      throw error;
    });
  }

  await rootAdminReadyPromise;
}

function isRootAdminUser(user) {
  return user?.email === DEFAULT_ADMIN_EMAIL;
}

function mapAdminUser(row, progress) {
  return {
    id: row.legacy_user_id,
    profileId: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    isRootAdmin: isRootAdminUser(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentXp: Number(progress?.current_xp || 0),
    level: Number(progress?.level || 1),
    currentStreak: Number(progress?.current_streak || 0),
    lastStudyDate: progress?.last_study_date || null,
  };
}

async function listAdminUsers({ limit, offset, search, role, status }) {
  await ensureRootAdminUser();
  const admin = ensureSupabaseEnabled();

  let countQuery = admin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  let query = admin
    .from('profiles')
    .select('id, legacy_user_id, email, name, role, status, created_at, updated_at')
    .order('legacy_user_id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const keyword = `%${search}%`;
    countQuery = countQuery.or(`email.ilike.${keyword},name.ilike.${keyword}`);
    query = query.or(`email.ilike.${keyword},name.ilike.${keyword}`);
  }
  if (role) {
    countQuery = countQuery.eq('role', role);
    query = query.eq('role', role);
  }
  if (status) {
    countQuery = countQuery.eq('status', status);
    query = query.eq('status', status);
  }

  const [countResult, rowsResult] = await Promise.all([countQuery, query]);
  const pagedRows = unwrapList(rowsResult);
  const progressRows = pagedRows.length
    ? unwrapList(await admin.from('user_progress').select('user_id, current_xp, level, current_streak, last_study_date').in('user_id', pagedRows.map((row) => row.id)))
    : [];
  const progressMap = new Map(progressRows.map((row) => [row.user_id, row]));

  return {
    items: pagedRows.map((row) => mapAdminUser(row, progressMap.get(row.id))),
    total: Number(countResult.count || 0),
  };
}

async function getAdminUserById(userId) {
  await ensureRootAdminUser();
  const admin = ensureSupabaseEnabled();
  const row = unwrapSingle(await admin
    .from('profiles')
    .select('id, legacy_user_id, email, name, role, status, created_at, updated_at')
    .eq(isUuid(userId) ? 'id' : 'legacy_user_id', isUuid(userId) ? userId : Number(userId))
    .limit(1)
    .maybeSingle());

  if (!row) return null;

  const progress = unwrapSingle(await admin
    .from('user_progress')
    .select('user_id, current_xp, level, current_streak, last_study_date')
    .eq('user_id', row.id)
    .limit(1)
    .maybeSingle());

  return mapAdminUser(row, progress);
}

async function updateAdminUserRole(userId, role) {
  const admin = ensureSupabaseEnabled();
  const column = isUuid(userId) ? 'id' : 'legacy_user_id';
  const value = isUuid(userId) ? userId : Number(userId);
  const result = await admin
    .from('profiles')
    .update({ role })
    .eq(column, value)
    .select('id');

  return unwrapList(result).length > 0;
}

async function updateAdminUserStatus(userId, status) {
  const admin = ensureSupabaseEnabled();
  const column = isUuid(userId) ? 'id' : 'legacy_user_id';
  const value = isUuid(userId) ? userId : Number(userId);
  const result = await admin
    .from('profiles')
    .update({ status })
    .eq(column, value)
    .select('id');

  return unwrapList(result).length > 0;
}

async function countAdmins({ status } = {}) {
  const admin = ensureSupabaseEnabled();
  let rows = unwrapList(await admin
    .from('profiles')
    .select('id, status')
    .eq('role', 'admin'));

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  return rows.length;
}

async function resetAdminUserStudyData(userId) {
  const admin = ensureSupabaseEnabled();
  const user = await getAdminUserById(userId);
  if (!user?.profileId) return false;

  await admin.from('user_word_progress').delete().eq('user_id', user.profileId);
  await admin.from('srs_reviews').delete().eq('user_id', user.profileId);
  await admin.from('toeic_test_records').delete().eq('user_id', user.profileId);

  const customTopics = unwrapList(await admin
    .from('topics')
    .select('id')
    .eq('owner_user_id', user.profileId));
  if (customTopics.length) {
    await admin.from('topics').delete().in('id', customTopics.map((topic) => topic.id));
  }

  await admin
    .from('user_progress')
    .upsert({
      user_id: user.profileId,
      current_xp: 0,
      level: 1,
      current_streak: 0,
      last_study_date: null,
    }, { onConflict: 'user_id' });

  return true;
}

async function deleteAdminUser(userId) {
  const user = await getAdminUserById(userId);
  if (!user?.profileId) return false;
  await deleteSupabaseAuthUserById(user.profileId);
  return true;
}

module.exports = {
  ROOT_ADMIN_ID,
  DEFAULT_ADMIN_EMAIL,
  ensureRootAdminUser,
  isRootAdminUser,
  listAdminUsers,
  getAdminUserById,
  updateAdminUserRole,
  updateAdminUserStatus,
  countAdmins,
  resetAdminUserStudyData,
  deleteAdminUser,
};
