export const SETTINGS_STORAGE_KEY = 'vocabup_settings_preferences_v1';
export const SETTINGS_CHANGE_EVENT = 'vocabup-settings-changed';

function readStoredSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

export function getSettingsPreferences() {
    const saved = readStoredSettings();
    return {
        notifications: saved.notifications ?? true,
    };
}

export function setSettingsPreferences(nextPreferences) {
    const current = readStoredSettings();
    const merged = {
        ...current,
        notifications: nextPreferences.notifications ?? current.notifications ?? true,
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: merged }));

    return merged;
}

export function isNotificationsEnabled() {
    return Boolean(getSettingsPreferences().notifications);
}
