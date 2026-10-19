export function normalizeErrorMessage(error, fallback = 'Đã xảy ra lỗi.') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;

    try {
        const text = JSON.stringify(error);
        return text && text !== '{}' ? text : fallback;
    } catch {
        return fallback;
    }
}
