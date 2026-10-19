const USER_STORAGE_KEY = 'user';
const GUEST_OWNER_KEY = 'guest';
const DASHBOARD_PROGRESS_STORAGE_KEY = 'vocabup_dashboard_progress_v1';
const USER_STATS_STORAGE_KEY = 'vocabup_user_stats_v1';
const STUDY_SCOPED_KEYS = [
    'vocabup_remembered',
    'vocabup_srs_queue_v1',
    'vocabup_xp_system_v1',
];

function safeParseUser(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function getStoredUser() {
    return safeParseUser(localStorage.getItem(USER_STORAGE_KEY));
}

export function isAuthenticatedUser(user) {
    return Boolean(user?.id || user?.token);
}

export function getUserStorageOwner(user = getStoredUser()) {
    if (!isAuthenticatedUser(user)) return GUEST_OWNER_KEY;
    const stableId = user?.profileId || user?.authUserId || user?.id;
    if (stableId) {
        return `user:${String(stableId)}`;
    }

    const fallbackName = user?.email || user?.name;
    if (fallbackName) {
        return `user:${String(fallbackName)}`;
    }

    return GUEST_OWNER_KEY;
}

export function getUserScopedStorageKey(baseKey, user = getStoredUser()) {
    return `${baseKey}:${getUserStorageOwner(user)}`;
}

export function getUserScopedJson(baseKey, fallbackValue, user = getStoredUser()) {
    const scopedKey = getUserScopedStorageKey(baseKey, user);
    const ownerKey = getUserStorageOwner(user);
    try {
        const scopedValue = localStorage.getItem(scopedKey);
        if (scopedValue !== null) {
            return JSON.parse(scopedValue);
        }

        if (ownerKey === GUEST_OWNER_KEY) {
            const legacyValue = localStorage.getItem(baseKey);
            if (legacyValue !== null) {
                const parsedLegacy = JSON.parse(legacyValue);
                localStorage.setItem(scopedKey, JSON.stringify(parsedLegacy));
                return parsedLegacy;
            }
        }
    } catch {
        return fallbackValue;
    }

    return fallbackValue;
}

export function setUserScopedJson(baseKey, value, user = getStoredUser()) {
    localStorage.setItem(getUserScopedStorageKey(baseKey, user), JSON.stringify(value));
}

export function removeUserScopedStorageKey(baseKey, user = getStoredUser()) {
    localStorage.removeItem(getUserScopedStorageKey(baseKey, user));
}

function removeOwnerEntryFromMapStorage(baseKey, ownerKey) {
    try {
        const rawValue = localStorage.getItem(baseKey);
        if (!rawValue) return;
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        if (!(ownerKey in parsed)) return;
        delete parsed[ownerKey];
        localStorage.setItem(baseKey, JSON.stringify(parsed));
    } catch {
        // ignore malformed local data
    }
}

export function clearUserStudyLocalState(user = getStoredUser()) {
    const ownerKey = getUserStorageOwner(user);

    STUDY_SCOPED_KEYS.forEach((baseKey) => {
        removeUserScopedStorageKey(baseKey, user);
    });

    removeOwnerEntryFromMapStorage(DASHBOARD_PROGRESS_STORAGE_KEY, ownerKey);
    removeOwnerEntryFromMapStorage(USER_STATS_STORAGE_KEY, ownerKey);
}

export function removeLegacyStorageKey(baseKey) {
    localStorage.removeItem(baseKey);
}
