import { useEffect } from 'react';

export function useOverlayBehavior(isOpen, onClose) {
    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = '';
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
}
