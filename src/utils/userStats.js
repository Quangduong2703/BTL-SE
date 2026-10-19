import {
    getStoredUser,
    getUserScopedJson,
    getUserStorageOwner,
} from './userStorage';

const STATS_STORAGE_KEY = 'vocabup_user_stats_v1';
const REMEMBERED_STORAGE_KEY = 'vocabup_remembered';
const MAX_HISTORY_DAYS = 90;
const XP_STORAGE_KEY = 'vocabup_xp_system_v1';

function pad(value) {
    return String(value).padStart(2, '0');
}

function getTodayKey(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getWeekdayLabel(dateKey) {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' });
}

function getStorageMap() {
    try {
        return JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveStorageMap(data) {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
}

function getXpStorage() {
    return getUserScopedJson(XP_STORAGE_KEY, {});
}

function getCurrentStoredUser() {
    return getStoredUser() || { name: 'Guest User' };
}

function getDisplayNameFromUserKey(userKey = 'guest') {
    if (userKey === 'guest') return 'Guest User';
    if (!userKey.startsWith('user:')) return userKey;

    return userKey
        .slice(5)
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function resolveProfileName(userKey = 'guest', profileName) {
    if (typeof profileName === 'string' && profileName.trim()) return profileName.trim();

    const currentUser = getCurrentStoredUser();
    if (userKey === 'guest') return 'Guest User';
    if (typeof currentUser?.name === 'string' && currentUser.name.trim()) return currentUser.name.trim();
    return getDisplayNameFromUserKey(userKey);
}

function getRememberedCount() {
    const remembered = getUserScopedJson(REMEMBERED_STORAGE_KEY, {}) || {};
    return Object.keys(remembered).filter((key) => remembered[key]).length;
}

function createEmptyStats() {
    return {
        days: {},
        profileName: null,
        updatedAt: null,
    };
}

function normalizeStats(stats) {
    const safe = stats && typeof stats === 'object' ? stats : {};
    return {
        days: safe.days && typeof safe.days === 'object' ? safe.days : {},
        profileName: typeof safe.profileName === 'string' ? safe.profileName : null,
        updatedAt: typeof safe.updatedAt === 'string' ? safe.updatedAt : null,
    };
}

function pruneDays(days) {
    const sortedKeys = Object.keys(days).sort();
    if (sortedKeys.length <= MAX_HISTORY_DAYS) return days;

    const keepKeys = new Set(sortedKeys.slice(-MAX_HISTORY_DAYS));
    return Object.fromEntries(Object.entries(days).filter(([key]) => keepKeys.has(key)));
}

function getDaysArray(stats) {
    return Object.values(stats.days)
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));
}

function getDayStats(stats, dateKey) {
    return stats.days[dateKey] || {
        date: dateKey,
        dailyXp: 0,
        learnedWords: 0,
        rememberedTotal: 0,
        totalXp: 0,
        streak: 0,
        gamesPlayed: 0,
        tasksCompleted: 0,
        taskTarget: 0,
        updatedAt: null,
    };
}

export function recordUserStatsSnapshot(userKey = 'guest', progress, options = {}) {
    if (!progress) return null;

    const map = getStorageMap();
    const currentStats = normalizeStats(map[userKey] || createEmptyStats());
    const dateKey = typeof progress.currentDate === 'string' ? progress.currentDate : getTodayKey();
    const existingDay = getDayStats(currentStats, dateKey);
    const rememberedTotal = Number.isFinite(options.rememberedTotal)
        ? options.rememberedTotal
        : getRememberedCount();
    const currentXpTotal = Number.isFinite(getXpStorage()?.totalXp)
        ? getXpStorage().totalXp
        : (Number.isFinite(progress.totalXp) ? progress.totalXp : 0);
    const tasksCompleted = Array.isArray(progress.tasks) ? progress.tasks.filter((task) => task.isDone).length : 0;
    const taskTarget = Array.isArray(progress.tasks) ? progress.tasks.length : 0;

    const nextDay = {
        ...existingDay,
        date: dateKey,
        dailyXp: Number.isFinite(progress.dailyXp) ? progress.dailyXp : existingDay.dailyXp,
        learnedWords: Array.isArray(progress.learnedWordEventIdsToday)
            ? progress.learnedWordEventIdsToday.length
            : (Array.isArray(progress.learnedWordIdsToday) ? progress.learnedWordIdsToday.length : existingDay.learnedWords),
        rememberedTotal,
        totalXp: currentXpTotal,
        streak: Number.isFinite(progress.streak) ? progress.streak : existingDay.streak,
        gamesPlayed: Number.isFinite(existingDay.gamesPlayed) ? existingDay.gamesPlayed : 0,
        tasksCompleted,
        taskTarget,
        updatedAt: new Date().toISOString(),
    };

    const nextStats = {
        ...currentStats,
        profileName: resolveProfileName(userKey, options.profileName),
        days: pruneDays({
            ...currentStats.days,
            [dateKey]: nextDay,
        }),
        updatedAt: nextDay.updatedAt,
    };

    map[userKey] = nextStats;
    saveStorageMap(map);
    return nextStats;
}

export function readUserStats(userKey = 'guest') {
    const map = getStorageMap();
    const stats = normalizeStats(map[userKey] || createEmptyStats());

    map[userKey] = stats;
    saveStorageMap(map);
    return stats;
}

function mergeCurrentDayStats(stats, currentSnapshot) {
    if (!currentSnapshot || typeof currentSnapshot !== 'object') return stats;

    const dateKey = typeof currentSnapshot.date === 'string' ? currentSnapshot.date : getTodayKey();
    const existingDay = getDayStats(stats, dateKey);
    const mergedDay = {
        ...existingDay,
        date: dateKey,
        dailyXp: Number.isFinite(currentSnapshot.dailyXp) ? currentSnapshot.dailyXp : existingDay.dailyXp,
        learnedWords: Number.isFinite(currentSnapshot.learnedWords) ? currentSnapshot.learnedWords : existingDay.learnedWords,
        rememberedTotal: Number.isFinite(currentSnapshot.rememberedTotal) ? currentSnapshot.rememberedTotal : existingDay.rememberedTotal,
        totalXp: Number.isFinite(currentSnapshot.totalXp) ? currentSnapshot.totalXp : existingDay.totalXp,
        streak: Number.isFinite(currentSnapshot.streak) ? currentSnapshot.streak : existingDay.streak,
        tasksCompleted: Number.isFinite(currentSnapshot.tasksCompleted) ? currentSnapshot.tasksCompleted : existingDay.tasksCompleted,
        taskTarget: Number.isFinite(currentSnapshot.taskTarget) ? currentSnapshot.taskTarget : existingDay.taskTarget,
        updatedAt: currentSnapshot.updatedAt || existingDay.updatedAt || new Date().toISOString(),
    };

    return {
        ...stats,
        days: {
            ...stats.days,
            [dateKey]: mergedDay,
        },
        updatedAt: mergedDay.updatedAt,
    };
}

function buildXpByDate() {
    const history = Array.isArray(getXpStorage().history) ? getXpStorage().history : [];
    const xpByDate = new Map();

    history.forEach((entry) => {
        if (!entry || !Number.isFinite(entry.amount) || !entry.timestamp) return;
        const date = new Date(entry.timestamp);
        if (Number.isNaN(date.getTime())) return;
        const dateKey = getTodayKey(date);
        xpByDate.set(dateKey, (xpByDate.get(dateKey) || 0) + entry.amount);
    });

    return xpByDate;
}

export function recordGamePlay(userKey = 'guest', count = 1) {
    const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
    const map = getStorageMap();
    const currentStats = normalizeStats(map[userKey] || createEmptyStats());
    const dateKey = getTodayKey();
    const existingDay = getDayStats(currentStats, dateKey);
    const nextDay = {
        ...existingDay,
        date: dateKey,
        gamesPlayed: (existingDay.gamesPlayed || 0) + safeCount,
        updatedAt: new Date().toISOString(),
    };

    const nextStats = {
        ...currentStats,
        profileName: resolveProfileName(userKey),
        days: pruneDays({
            ...currentStats.days,
            [dateKey]: nextDay,
        }),
        updatedAt: nextDay.updatedAt,
    };

    map[userKey] = nextStats;
    saveStorageMap(map);
    return nextStats;
}

export function getCurrentStudyUserKey() {
    return getUserStorageOwner(getCurrentStoredUser());
}

function getLeaderboardAccent(index) {
    if (index === 0) return 'orange';
    if (index === 1) return 'blue';
    if (index === 2) return 'green';
    return 'slate';
}

function getMetricScore(metric, stats) {
    const days = getDaysArray(stats);
    const latestDay = days[days.length - 1] || getDayStats(stats, getTodayKey());

    if (metric === 'exp') {
        return latestDay.totalXp || 0;
    }

    if (metric === 'games') {
        return days.reduce((sum, day) => sum + (day.gamesPlayed || 0), 0);
    }

    return latestDay.streak || 0;
}

export function buildStatsLeaderboard(metric = 'streak', limit = 3, fallbackEntries = []) {
    const map = getStorageMap();
    const realEntries = Object.entries(map)
        .map(([userKey, rawStats]) => {
            const stats = normalizeStats(rawStats || createEmptyStats());
            return {
                name: stats.profileName || getDisplayNameFromUserKey(userKey),
                score: getMetricScore(metric, stats),
                updatedAt: stats.updatedAt || '',
            };
        })
        .filter((entry) => entry.score > 0);

    const mergedEntries = [...realEntries];
    const usedNames = new Set(realEntries.map((entry) => entry.name.toLowerCase()));

    fallbackEntries.forEach((entry) => {
        const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
        if (!name || usedNames.has(name.toLowerCase())) return;
        usedNames.add(name.toLowerCase());
        mergedEntries.push({
            name,
            score: Number.isFinite(entry.score) ? entry.score : 0,
            updatedAt: '',
        });
    });

    return mergedEntries
        .sort((first, second) => {
            if (second.score !== first.score) return second.score - first.score;
            return second.updatedAt.localeCompare(first.updatedAt);
        })
        .slice(0, limit)
        .map((entry, index) => ({
            ...entry,
            rank: index + 1,
            accent: getLeaderboardAccent(index),
        }));
}

export function buildActivityChartData(userKey = 'guest', period = 'week', currentSnapshot = null) {
    const stats = mergeCurrentDayStats(readUserStats(userKey), currentSnapshot);
    const xpByDate = buildXpByDate();
    const today = new Date();

    if (period === 'month') {
        const buckets = [];

        for (let offset = 3; offset >= 0; offset -= 1) {
            const end = new Date(today);
            end.setDate(today.getDate() - offset * 7);

            const start = new Date(end);
            start.setDate(end.getDate() - 6);

            buckets.push({ start, end });
        }

        const labels = buckets.map((bucket) => {
            const startLabel = bucket.start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const endLabel = bucket.end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `${startLabel}-${endLabel}`;
        });

        const xp = [];
        const words = [];

        buckets.forEach((bucket) => {
            let bucketXp = 0;
            let bucketWords = 0;

            getDaysArray(stats).forEach((day) => {
                const dayDate = new Date(`${day.date}T00:00:00`);
                if (dayDate >= bucket.start && dayDate <= bucket.end) {
                    bucketXp += xpByDate.get(day.date) || 0;
                    bucketWords += day.learnedWords || 0;
                }
            });

            xp.push(bucketXp);
            words.push(bucketWords);
        });

        const totalXp = xp.reduce((sum, value) => sum + value, 0);
        const totalWords = words.reduce((sum, value) => sum + value, 0);

        return {
            labels,
            xp,
            words,
            totalXp,
            totalWords,
            peakXp: Math.max(...xp, 0),
            peakWords: Math.max(...words, 0),
            activeBuckets: labels.filter((_, index) => xp[index] > 0 || words[index] > 0).length,
        };
    }

    const labels = [];
    const xp = [];
    const words = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const dateKey = getTodayKey(date);
        const day = getDayStats(stats, dateKey);

        labels.push(getWeekdayLabel(dateKey));
        xp.push(xpByDate.get(dateKey) || 0);
        words.push(day.learnedWords || 0);
    }

    const totalXp = xp.reduce((sum, value) => sum + value, 0);
    const totalWords = words.reduce((sum, value) => sum + value, 0);

    return {
        labels,
        xp,
        words,
        totalXp,
        totalWords,
        peakXp: Math.max(...xp, 0),
        peakWords: Math.max(...words, 0),
        activeBuckets: labels.filter((_, index) => xp[index] > 0 || words[index] > 0).length,
    };
}

export function getStatsSummary(userKey = 'guest') {
    const stats = readUserStats(userKey);
    const days = getDaysArray(stats);
    const today = getTodayKey();
    const todayStats = getDayStats(stats, today);
    const recentSeven = days.slice(-7);
    const activeSeven = recentSeven.filter((day) => (day.dailyXp || 0) > 0 || (day.tasksCompleted || 0) > 0);

    const completionRate = recentSeven.length
        ? Math.round(
            (recentSeven.reduce((sum, day) => sum + (day.taskTarget ? day.tasksCompleted / day.taskTarget : 0), 0) / recentSeven.length) * 100,
        )
        : 0;

    return {
        currentStreak: todayStats.streak || 0,
        bestStreak: days.reduce((max, day) => Math.max(max, day.streak || 0), 0),
        totalXp: todayStats.totalXp || 0,
        todayXp: todayStats.dailyXp || 0,
        todayLearnedWords: todayStats.learnedWords || 0,
        totalGamesPlayed: days.reduce((sum, day) => sum + (day.gamesPlayed || 0), 0),
        rememberedTotal: todayStats.rememberedTotal || getRememberedCount(),
        tasksCompletedToday: todayStats.tasksCompleted || 0,
        taskTargetToday: todayStats.taskTarget || 0,
        activeDays7: activeSeven.length,
        averageXp7: activeSeven.length
            ? Math.round(activeSeven.reduce((sum, day) => sum + (day.dailyXp || 0), 0) / activeSeven.length)
            : 0,
        completionRate7: completionRate,
        recentDays: recentSeven.reverse(),
    };
}
