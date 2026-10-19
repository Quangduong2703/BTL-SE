import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileNav from '../components/landingPage/MobileNav';
import Sidebar from '../components/landingPage/Sidebar';
import Topbar from '../components/landingPage/Topbar';
import NotificationManager from '../components/NotificationManager';
import '../assets/css/dashboard/index.css';
import '../assets/css/dashboard/review.css';
import '../assets/css/custom-courses.css';
import '../assets/css/custom-pages.css';
import '../assets/css/toeic-review.css';

export default function DashboardLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const revealEls = Array.from(document.querySelectorAll('.reveal'));
        if (!revealEls.length) return undefined;

        revealEls.forEach((el, index) => {
            const revealOrder = Number(el.dataset.revealOrder ?? index);
            el.style.setProperty('--reveal-delay', `${revealOrder * 90}ms`);
            el.classList.remove('revealed');
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.18,
            rootMargin: '0px 0px -10% 0px',
        });

        const viewportTrigger = window.innerHeight * 0.82;
        revealEls.forEach((el) => {
            if (el.getBoundingClientRect().top <= viewportTrigger) {
                requestAnimationFrame(() => el.classList.add('revealed'));
                return;
            }
            revealObserver.observe(el);
        });

        return () => revealObserver.disconnect();
    }, [location.pathname]);

    return (
        <>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            {/* Sidebar overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                id="sidebarOverlay"
                onClick={() => setSidebarOpen(false)}
            />
            <div className="dashboard-main-wrapper">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <Outlet />
            </div>
            <MobileNav />
            <NotificationManager />
        </>
    );
}
