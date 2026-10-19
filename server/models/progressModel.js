const { ensureSupabaseEnabled, unwrapList, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');

async function getProgressByUserId(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const row = unwrapSingle(await admin
    .from('user_progress')
    .select('user_id, current_xp, level, current_streak, last_study_date')
    .eq('user_id', profileId)
    .limit(1)
    .maybeSingle());

  return row
    ? {
      userId: row.user_id,
      current_xp: row.current_xp,
      level: row.level,
      current_streak: row.current_streak,
      last_study_date: row.last_study_date,
    }
    : null;
}

async function updateStreak(userId, streak, studyDate) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  unwrapList(await admin
    .from('user_progress')
    .update({
      current_streak: streak,
      last_study_date: studyDate,
    })
    .eq('user_id', profileId)
    .select('id'));
}

async function updateXPAndLevel(userId, xpToAdd) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const row = unwrapSingle(await admin
    .from('user_progress')
    .select('current_xp, level')
    .eq('user_id', profileId)
    .limit(1)
    .maybeSingle());

  if (!row) return null;

  const newXP = row.current_xp + xpToAdd;
  const newLevel = Math.floor(newXP / 1000) + 1;
  const levelUp = newLevel > row.level;

  unwrapList(await admin
    .from('user_progress')
    .update({
      current_xp: newXP,
      level: newLevel,
    })
    .eq('user_id', profileId)
    .select('id'));

  return { newXP, newLevel, levelUp };
}

async function getLeaderboard(limit = 10) {
  const admin = ensureSupabaseEnabled();
  const profiles = unwrapList(await admin
    .from('profiles')
    .select('id, legacy_user_id, name, status, created_at')
    .order('legacy_user_id', { ascending: true })
    .order('created_at', { ascending: true }));

  const visibleProfiles = profiles.filter((profile) => profile?.status !== 'banned');

  if (!visibleProfiles.length) {
    return [];
  }

  const progressRows = unwrapList(await admin
    .from('user_progress')
    .select('user_id, current_xp, level, current_streak, updated_at')
    .in('user_id', visibleProfiles.map((profile) => profile.id)));

  const progressMap = new Map(progressRows.map((row) => [row.user_id, row]));
  const entries = visibleProfiles.map((profile) => {
    const progress = progressMap.get(profile.id);
    return {
      id: profile.legacy_user_id || profile.id,
      name: profile.name || 'User',
      score: progress?.current_xp || 0,
      level: progress?.level || 1,
      current_streak: progress?.current_streak || 0,
      updated_at: progress?.updated_at || profile.created_at,
    };
  });

  return entries
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.level !== a.level) return b.level - a.level;
      return String(a.name).localeCompare(String(b.name));
    })
    .slice(0, limit);
}

module.exports = {
  getProgressByUserId,
  updateStreak,
  updateXPAndLevel,
  getLeaderboard,
};
