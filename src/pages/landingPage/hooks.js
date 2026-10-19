import { useEffect } from 'react';

// ── Scroll reveal hook ──────────────────────────────────────────────────────
export function useLandingReveal() {
    useEffect(() => {
        const elements = Array.from(document.querySelectorAll('.lp-reveal, .lp-step'));
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('lp-visible');
                        // Trigger progress bars
                        const fill = entry.target.querySelector('.lp-course-progress-fill');
                        if (fill) {
                            entry.target.classList.add('lp-visible');
                        }
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}

// ── Counter animation ───────────────────────────────────────────────────────
export function useCounterAnimation() {
    useEffect(() => {
        const counters = Array.from(document.querySelectorAll('[data-count]'));
        if (!counters.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    const target = parseInt(el.getAttribute('data-count'), 10);
                    const suffix = el.getAttribute('data-suffix') || '';
                    const duration = 1200;
                    const start = performance.now();

                    function update(now) {
                        const progress = Math.min((now - start) / duration, 1);
                        const ease = 1 - Math.pow(1 - progress, 3);
                        el.textContent = Math.floor(target * ease).toLocaleString('vi-VN') + suffix;
                        if (progress < 1) requestAnimationFrame(update);
                    }

                    requestAnimationFrame(update);
                    observer.unobserve(el);
                });
            },
            { threshold: 0.5 }
        );

        counters.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}