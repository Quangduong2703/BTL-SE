/* ═══════════════════════════════════════════════════════
   VocabUp — Streak System
═══════════════════════════════════════════════════════ */

const STREAK_KEY = 'vocabup_streak_v1';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getData() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || {}; }
  catch { return {}; }
}
function saveData(d) { localStorage.setItem(STREAK_KEY, JSON.stringify(d)); }

function getDefault() {
  return { streak: 0, lastActiveDate: null, bestStreak: 0, streakLost: false, todayChecked: false };
}

/**
 * Kiểm tra streak khi user mở app.
 * Trả về: { streak, bestStreak, streakLost, isNewDay }
 */
export function checkStreak() {
  const data = { ...getDefault(), ...getData() };
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Cùng ngày → không làm gì
  if (data.lastActiveDate === today) {
    return { streak: data.streak, bestStreak: data.bestStreak, streakLost: false, isNewDay: false };
  }

  let streakLost = false;

  if (data.lastActiveDate === yesterday) {
    // Ngày hôm qua → streak tiếp tục
    data.streak += 1;
  } else if (data.lastActiveDate) {
    // > 1 ngày → streak reset
    streakLost = true;
    data.streak = 1; // bắt đầu streak mới từ hôm nay
  } else {
    // Lần đầu dùng app
    data.streak = 1;
  }

  data.lastActiveDate = today;
  data.bestStreak = Math.max(data.bestStreak, data.streak);
  data.streakLost = streakLost;
  data.todayChecked = true;

  saveData(data);
  return { streak: data.streak, bestStreak: data.bestStreak, streakLost, isNewDay: true };
}

/** Lấy dữ liệu streak hiện tại (không update) */
export function getStreakData() {
  return { ...getDefault(), ...getData() };
}

/** Lấy streak count */
export function getStreakCount() {
  return getStreakData().streak;
}
