export const THEME_STORAGE_KEY = 'vocabup_theme_mode';
export const THEME_EVENT = 'vocabup-theme-changed';

export function getSavedTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export function applyTheme(theme) {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('app-dark-mode', safeTheme === 'dark');
    document.documentElement.style.colorScheme = safeTheme;
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: safeTheme } }));
    return safeTheme;
}

export function initializeTheme() {
    return applyTheme(getSavedTheme());
}
