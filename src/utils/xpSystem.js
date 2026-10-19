import axiosClient from './axiosClient';
import { getStoredUser, getUserScopedJson, setUserScopedJson } from './userStorage';

const XP_STORAGE_KEY = 'vocabup_xp_system_v1';
export const XP_EVENT = 'vocabup-xp-updated';

export const XP_REWARDS = {
  FLASHCARD_VIEW: 5,
  WORD_KNOWN: 10,
  TOPIC_COMPLETE: 50,
  QUIZ_CORRECT: 10,
  QUIZ_COMPLETE: 30,
  STUDY_MODE_COMPLETE: 10,
  STREAK_DAILY: 20,
  TOEIC_PART_COMPLETE: 15,
  TOEIC_FULL_TEST: 50,
};

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, title: 'Người mới', badge: '🌱' },
  { level: 2, minXp: 100, title: 'Học viên', badge: '📗' },
  { level: 3, minXp: 300, title: 'Chăm chỉ', badge: '📘' },
  { level: 4, minXp: 600, title: 'Giỏi giang', badge: '⭐' },
  { level: 5, minXp: 1000, title: 'Xuất sắc', badge: '🏅' },
  { level: 6, minXp: 1500, title: 'Chuyên gia', badge: '🎖️' },
  { level: 7, minXp: 2200, title: 'Bậc thầy', badge: '🧑‍🏫' },
  { level: 8, minXp: 3000, title: 'Huyền thoại', badge: '💎' },
  { level: 9, minXp: 4000, title: 'Siêu nhân', badge: '🔥' },
  { level: 10, minXp: 5500, title: 'Thần đồng', badge: '🌟' },
];

function getStorage() {
  return getUserScopedJson(XP_STORAGE_KEY, {}) || {};
}

function saveStorage(data) {
  setUserScopedJson(XP_STORAGE_KEY, data);
}

function emitXpUpdate(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(XP_EVENT, { detail }));
}

function getDefault() {
  return { totalXp: 0, history: [], unlockedBadges: ['🌱'], lastLevelUp: null };
}

export function getXpData() {
  const data = getStorage();
  const merged = { ...getDefault(), ...data };
  if (!data || Object.keys(data).length === 0) {
    saveStorage(merged);
  }
  return merged;
}

export function getLevelInfo(totalXp) {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1] || null;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalXp >= LEVEL_THRESHOLDS[i].minXp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] || null;
      break;
    }
  }

  const xpInLevel = totalXp - current.minXp;
  const xpForNext = next ? next.minXp - current.minXp : 0;
  const progress = next ? Math.min(xpInLevel / xpForNext, 1) : 1;

  return {
    level: current.level,
    title: current.title,
    badge: current.badge,
    xpInLevel,
    xpForNext,
    progress,
    nextLevel: next,
    totalXp,
  };
}

export function addXp(amount, reason = '') {
  const data = getXpData();
  const prevLevel = getLevelInfo(data.totalXp);

  data.totalXp += amount;
  data.history.push({
    amount,
    reason,
    timestamp: new Date().toISOString(),
  });

  if (data.history.length > 200) {
    data.history = data.history.slice(-200);
  }

  const newLevel = getLevelInfo(data.totalXp);
  let leveledUp = false;

  if (newLevel.level > prevLevel.level) {
    leveledUp = true;
    data.lastLevelUp = {
      from: prevLevel.level,
      to: newLevel.level,
      badge: newLevel.badge,
      title: newLevel.title,
      timestamp: new Date().toISOString(),
      seen: false,
    };
    if (!data.unlockedBadges.includes(newLevel.badge)) {
      data.unlockedBadges.push(newLevel.badge);
    }
  }

  const user = getStoredUser();
  if (user && (user.token || user.id)) {
    axiosClient
      .post('/progress/add-xp', { xp: amount })
      .catch((e) => console.error('Failed to sync XP:', e));
  }

  saveStorage(data);
  emitXpUpdate({
    totalXp: data.totalXp,
    xpGained: amount,
    reason,
  });

  return {
    totalXp: data.totalXp,
    levelInfo: newLevel,
    leveledUp,
    xpGained: amount,
  };
}

export async function syncXpWithServer() {
  const user = getStoredUser();
  if (!user || (!user.token && !user.id)) return;
  try {
    const res = await axiosClient.get('/progress');
    if (!res) return;

    const serverData = res;
    const localData = getXpData();

    if (serverData.current_xp > localData.totalXp) {
      localData.totalXp = serverData.current_xp;
      saveStorage(localData);
      emitXpUpdate({ totalXp: localData.totalXp, source: 'sync' });
    }
  } catch (error) {
    console.error('Failed to sync progress:', error);
  }
}

export function xpFlashcardView() {
  return addXp(XP_REWARDS.FLASHCARD_VIEW, 'Học flashcard');
}

export function xpWordKnown() {
  return addXp(XP_REWARDS.WORD_KNOWN, 'Đánh dấu đã biết');
}

export function xpTopicComplete() {
  return addXp(XP_REWARDS.TOPIC_COMPLETE, 'Hoàn thành chủ đề');
}

export function xpQuizCorrect() {
  return addXp(XP_REWARDS.QUIZ_CORRECT, 'Quiz đúng');
}

export function xpQuizComplete() {
  return addXp(XP_REWARDS.QUIZ_COMPLETE, 'Hoàn thành quiz');
}

export function xpStudyModeComplete(modeName = 'Chế độ học') {
  return addXp(XP_REWARDS.STUDY_MODE_COMPLETE, `Hoàn thành ${modeName}`);
}

export function xpStreakDaily() {
  return addXp(XP_REWARDS.STREAK_DAILY, 'Streak bonus');
}

export function xpToeicPartComplete() {
  return addXp(XP_REWARDS.TOEIC_PART_COMPLETE, 'Hoàn thành Practice Part TOEIC');
}

export function xpToeicFullTest() {
  return addXp(XP_REWARDS.TOEIC_FULL_TEST, 'Hoàn thành Full Test TOEIC');
}

export function getUnseenLevelUp() {
  const data = getXpData();
  if (data.lastLevelUp && !data.lastLevelUp.seen) return data.lastLevelUp;
  return null;
}

export function markLevelUpSeen() {
  const data = getXpData();
  if (data.lastLevelUp) data.lastLevelUp.seen = true;
  saveStorage(data);
}

export function getAllLevels() {
  return LEVEL_THRESHOLDS;
}
