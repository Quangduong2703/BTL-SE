import { useEffect } from 'react';

function normalizeToastMessage(message) {
    if (typeof message === 'string') return message;
    if (!message) return '';
    if (typeof message?.message === 'string') return message.message;
    if (typeof message?.error === 'string') return message.error;

    try {
        return JSON.stringify(message);
    } catch {
        return String(message);
    }
}

export default function ToastNotice({ message, type = 'error', onHide, duration = 2600 }) {
    const safeMessage = normalizeToastMessage(message);

    useEffect(() => {
        if (!safeMessage || !onHide) return undefined;

        const timeoutId = window.setTimeout(() => {
            onHide();
        }, duration);

        return () => window.clearTimeout(timeoutId);
    }, [duration, onHide, safeMessage]);

    return (
        <div
            className={`cv-toast ${safeMessage ? 'cv-toast-show' : ''} cv-toast-${type}`}
            role="status"
            aria-live="polite"
        >
            {safeMessage}
        </div>
    );
}
