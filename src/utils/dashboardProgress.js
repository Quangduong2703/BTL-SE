import { recordUserStatsSnapshot } from './userStats';
import { addXp, getXpData } from './xpSystem';
import axiosClient from './axiosClient';
import { getStoredUser, getUserStorageOwner } from './userStorage';

const STORAGE_KEY = 'vocabup_dashboard_progress_v1';
const UPDATE_EVENT = 'vocabup-dashboard-progress-updated';
const VOCAB_DAILY_MODES = ['flashcard', 'quiz', 'listen', 'typing', 'match', 'flappy-bird', 'rain'];

function normalizeStudyModeName(modeName) {
    if (modeName === 'listening') return 'listen';
    if (modeName === 'rain-vocab') return 'rain';
    return modeName;
}

const TASK_TEMPLATES = [
    {
        id: 'daily-checkin',
        title: 'Điểm danh hằng ngày',
        desc: 'Điểm danh để mở đầu ngày mới · +10 EXP',
        btnText: 'Làm ngay',
        page: null,
        exp: 10,
    },
    {
        id: 'vocab-modes',
        title: 'Học từ vựng',
        desc: 'Hoàn thành Flashcard, Quiz, Listening, Typing, Match, Flappy Bird và Mưa từ vựng · +24 EXP',
        btnText: 'Làm ngay',
        page: 'games',
        exp: 24,
        autoComplete: true,
    },
    {
        id: 'toeic-fulltest',
        title: 'Hoàn thành 1 bài TOEIC Full Test',
        desc: 'Đạt tối thiểu 200 điểm trong 1 bài TOEIC Full Test hôm nay · +50 EXP',
        btnText: 'Làm ngay',
        page: 'toeic',
        exp: 50,
        autoComplete: true,
    },
];

function pad(value) {
    return String(value).padStart(2, '0');
}

export function getTodayKey(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getDashboardUserKey(user) {
    return getUserStorageOwner(user);
}

function createDailyTasks() {
    return TASK_TEMPLATES.map((task) => ({
        ...task,
        currentCount: Number.isFinite(task.currentCount) ? task.currentCount : 0,
        targetCount: Number.isFinite(task.targetCount) ? task.targetCount : 0,
        isDone: false,
        completedAt: null,
    }));
}

function getStorageMap() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveStorageMap(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createDefaultProgress() {
    return {
        streak: 0,
        totalXp: 0,
        dailyXp: 0,
        currentDate: getTodayKey(),
        lastStreakDate: null,
        learnedWordIdsToday: [],
        learnedWordEventIdsToday: [],
        completedStudyModesToday: [],
        dailyTaskClaimedAt: {},
        tasks: createDailyTasks(),
    };
}

function normalizeProgress(progress) {
    const safe = progress && typeof progress === 'object' ? progress : {};

    return {
        streak: Number.isFinite(safe.streak) ? safe.streak : 0,
        totalXp: Number.isFinite(safe.totalXp) ? safe.totalXp : 0,
        dailyXp: Number.isFinite(safe.dailyXp) ? safe.dailyXp : 0,
        currentDate: typeof safe.currentDate === 'string' ? safe.currentDate : getTodayKey(),
        lastStreakDate: typeof safe.lastStreakDate === 'string' ? safe.lastStreakDate : null,
        learnedWordIdsToday: Array.isArray(safe.learnedWordIdsToday) ? safe.learnedWordIdsToday : [],
        learnedWordEventIdsToday: Array.isArray(safe.learnedWordEventIdsToday) ? safe.learnedWordEventIdsToday : [],
        completedStudyModesToday: Array.isArray(safe.completedStudyModesToday)
            ? safe.completedStudyModesToday
                .map(normalizeStudyModeName)
                .filter((mode) => VOCAB_DAILY_MODES.includes(mode))
            : [],
        dailyTaskClaimedAt: safe.dailyTaskClaimedAt && typeof safe.dailyTaskClaimedAt === 'object'
            ? safe.dailyTaskClaimedAt
            : {},
        tasks: Array.isArray(safe.tasks) && safe.tasks.length
            ? TASK_TEMPLATES.map((template) => {
                const existing = safe.tasks.find((task) => task.id === template.id);
                return {
                    ...template,
                    currentCount: Number.isFinite(existing?.currentCount)
                        ? existing.currentCount
                        : (Number.isFinite(template.currentCount) ? template.currentCount : 0),
                    targetCount: Number.isFinite(existing?.targetCount)
                        ? existing.targetCount
                        : (Number.isFinite(template.targetCount) ? template.targetCount : 0),
                    isDone: Boolean(existing?.isDone),
                    completedAt: existing?.completedAt ?? null,
                };
            })
            : createDailyTasks(),
    };
}

export function ensureTodayProgress(progress) {
    const normalized = normalizeProgress(progress);
    const today = getTodayKey();

    if (normalized.currentDate === today) return normalized;

    return {
        ...normalized,
        currentDate: today,
        dailyXp: 0,
        learnedWordIdsToday: [],
        learnedWordEventIdsToday: [],
        completedStudyModesToday: [],
        dailyTaskClaimedAt: {},
        tasks: createDailyTasks(),
    };
}

function applyDashboardTaskCompletion(current, taskId, options = {}) {
    const awardXp = options.awardXp !== false;
    const today = getTodayKey();
    let expGained = 0;
    let streakGained = false;
    let completedTaskTitle = '';
    const dailyTaskClaimedAt = current.dailyTaskClaimedAt && typeof current.dailyTaskClaimedAt === 'object'
        ? current.dailyTaskClaimedAt
        : {};

    if (dailyTaskClaimedAt[taskId] === today) {
        return {
            nextProgress: current,
            expGained: 0,
            streakGained: false,
        };
    }

    const tasks = current.tasks.map((task) => {
        if (task.id !== taskId || task.isDone) return task;
        expGained = task.exp;
        completedTaskTitle = task.title || taskId;
        return {
            ...task,
            isDone: true,
            completedAt: new Date().toISOString(),
        };
    });

    if (!expGained) {
        return {
            nextProgress: current,
            expGained: 0,
            streakGained: false,
        };
    }

    if (awardXp) {
        addXp(expGained, `Dashboard task: ${completedTaskTitle}`);
    }

    let streak = current.streak;
    let lastStreakDate = current.lastStreakDate;

    if (lastStreakDate !== today) {
        streak += 1;
        lastStreakDate = today;
        streakGained = true;
    }

    return {
        nextProgress: {
            ...current,
            dailyTaskClaimedAt: {
                ...dailyTaskClaimedAt,
                [taskId]: today,
            },
            tasks,
            streak,
            lastStreakDate,
            dailyXp: current.dailyXp + expGained,
            totalXp: current.totalXp + expGained,
        },
        expGained,
        streakGained,
    };
}

export function readDashboardProgress(userKey = 'guest') {
    const map = getStorageMap();
    const progress = ensureTodayProgress(map[userKey] || createDefaultProgress());
    const currentXp = getXpData().totalXp;
    if (Number.isFinite(currentXp) && currentXp > progress.totalXp) {
        progress.totalXp = currentXp;
    }

    map[userKey] = progress;
    saveStorageMap(map);
    recordUserStatsSnapshot(userKey, progress);
    return progress;
}

export async function syncDashboardProgressWithServer(userKey = 'guest') {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || (!user.token && !user.id)) return;
    try {
        const res = await axiosClient.get('/progress');
        if (!res) return;

        const serverData = res;
        const map = getStorageMap();
        const progress = ensureTodayProgress(map[userKey] || createDefaultProgress());
        const currentXp = getXpData().totalXp;

        let updated = false;
        if (serverData.current_xp > Math.max(progress.totalXp, currentXp)) {
            progress.totalXp = serverData.current_xp;
            updated = true;
        }
        if (serverData.current_streak > progress.streak) {
            progress.streak = serverData.current_streak;
            updated = true;
        }

        if (updated) {
            map[userKey] = progress;
            saveStorageMap(map);
            recordUserStatsSnapshot(userKey, progress);
            window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userKey, progress } }));
        }
    } catch (e) {
        console.error('Failed to sync dashboard progress:', e);
    }
}

export function writeDashboardProgress(userKey = 'guest', progress) {
    const map = getStorageMap();
    const nextProgress = ensureTodayProgress(progress);
    map[userKey] = nextProgress;
    saveStorageMap(map);
    recordUserStatsSnapshot(userKey, nextProgress);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userKey, progress: nextProgress } }));
    return nextProgress;
}

export function completeDashboardTask(userKey = 'guest', taskId) {
    const current = readDashboardProgress(userKey);
    const { nextProgress: preparedProgress, expGained, streakGained } = applyDashboardTaskCompletion(current, taskId);

    if (!expGained) {
        return {
            progress: current,
            expGained: 0,
            streakGained: false,
        };
    }

    const nextProgress = writeDashboardProgress(userKey, preparedProgress);

    return {
        progress: nextProgress,
        expGained,
        streakGained,
    };
}

function getCurrentStoredUser() {
    return getStoredUser() || { name: 'Guest User' };
}

function getCurrentDashboardUserKey() {
    return getDashboardUserKey(getCurrentStoredUser());
}

function finalizeTaskProgress(userKey, nextProgress) {
    const savedProgress = writeDashboardProgress(userKey, nextProgress);

    return {
        progress: savedProgress,
        learnedWordsCount: savedProgress.learnedWordIdsToday.length,
    };
}

export function recordStudyModeCompletion(modeName) {
    const normalizedMode = normalizeStudyModeName(modeName);

    if (!VOCAB_DAILY_MODES.includes(normalizedMode)) {
        return {
            progress: readDashboardProgress(getCurrentDashboardUserKey()),
            expGained: 0,
            streakGained: false,
        };
    }

    const userKey = getCurrentDashboardUserKey();
    const current = readDashboardProgress(userKey);
    const completedModes = new Set(current.completedStudyModesToday || []);
    completedModes.add(normalizedMode);

    let nextProgress = {
        ...current,
        completedStudyModesToday: Array.from(completedModes),
    };
    let expGained = 0;
    let streakGained = false;

    const vocabTask = nextProgress.tasks.find((task) => task.id === 'vocab-modes');
    if (vocabTask && !vocabTask.isDone && VOCAB_DAILY_MODES.every((mode) => completedModes.has(mode))) {
        const completed = applyDashboardTaskCompletion(nextProgress, 'vocab-modes');
        nextProgress = completed.nextProgress;
        expGained = completed.expGained;
        streakGained = completed.streakGained;
    }

    return {
        ...finalizeTaskProgress(userKey, nextProgress),
        expGained,
        streakGained,
    };
}

export function recordFlashcardSessionProgress() {
    const userKey = getCurrentDashboardUserKey();
    const current = readDashboardProgress(userKey);
    const flashcardTask = current.tasks.find((task) => task.id === 'game-session');

    if (!flashcardTask) {
        return {
            ...finalizeTaskProgress(userKey, current),
            expGained: 0,
            streakGained: false,
        };
    }

    const targetCount = Number.isFinite(flashcardTask.targetCount) && flashcardTask.targetCount > 0
        ? flashcardTask.targetCount
        : 5;

    let nextProgress = {
        ...current,
        tasks: current.tasks.map((task) => {
            if (task.id !== 'game-session') return task;
            const nextCount = Math.min((task.currentCount || 0) + 1, targetCount);
            return {
                ...task,
                currentCount: nextCount,
                targetCount,
            };
        }),
    };

    let expGained = 0;
    let streakGained = false;
    const updatedTask = nextProgress.tasks.find((task) => task.id === 'game-session');

    if (updatedTask && !updatedTask.isDone && updatedTask.currentCount >= targetCount) {
        const completed = applyDashboardTaskCompletion(nextProgress, 'game-session');
        nextProgress = completed.nextProgress;
        expGained = completed.expGained;
        streakGained = completed.streakGained;
    }

    return {
        ...finalizeTaskProgress(userKey, nextProgress),
        expGained,
        streakGained,
    };
}

export function recordToeicFullTestProgress(totalScore) {
    const safeScore = Number(totalScore || 0);
    const userKey = getCurrentDashboardUserKey();
    const current = readDashboardProgress(userKey);
    const toeicTask = current.tasks.find((task) => task.id === 'toeic-fulltest');

    if (!toeicTask || toeicTask.isDone || safeScore < 200) {
        return {
            ...finalizeTaskProgress(userKey, current),
            expGained: 0,
            streakGained: false,
        };
    }

    const completed = applyDashboardTaskCompletion(current, 'toeic-fulltest', { awardXp: false });
    return {
        ...finalizeTaskProgress(userKey, completed.nextProgress),
        expGained: completed.expGained,
        streakGained: completed.streakGained,
    };
}

export function syncRememberedWordProgress(previousRemembered = {}, nextRemembered = {}) {
    const userKey = getCurrentDashboardUserKey();
    const current = readDashboardProgress(userKey);

    const previousIds = new Set(Object.keys(previousRemembered).filter((id) => previousRemembered[id]));
    const nextIds = new Set(Object.keys(nextRemembered).filter((id) => nextRemembered[id]));
    const learnedToday = new Set(current.learnedWordIdsToday);
    const learnedEventsToday = new Set(current.learnedWordEventIdsToday);

    nextIds.forEach((id) => {
        if (!previousIds.has(id)) {
            learnedToday.add(id);
            learnedEventsToday.add(id);
        }
    });

    previousIds.forEach((id) => {
        if (!nextIds.has(id)) learnedToday.delete(id);
    });

    const nextProgress = {
        ...current,
        learnedWordIdsToday: Array.from(learnedToday),
        learnedWordEventIdsToday: Array.from(learnedEventsToday),
    };

    return {
        ...finalizeTaskProgress(userKey, nextProgress),
        expGained: 0,
        streakGained: false,
    };
}

export function subscribeDashboardProgress(callback) {
    const handleUpdate = (event) => callback(event.detail);
    const handleStorage = () => callback(null);

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
        window.removeEventListener(UPDATE_EVENT, handleUpdate);
        window.removeEventListener('storage', handleStorage);
    };
}
