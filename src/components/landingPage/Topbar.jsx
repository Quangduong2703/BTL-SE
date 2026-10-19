import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo2 from '../../assets/images/logo-vocabup.svg';
import aiImg from '../../assets/images/ai.png';
import { useAuth } from '../../contexts/useAuth';
import {
    getDashboardUserKey,
    readDashboardProgress,
    subscribeDashboardProgress,
} from '../../utils/dashboardProgress';
import { XP_EVENT, getXpData, getLevelInfo } from '../../utils/xpSystem';
import { isAuthenticatedUser } from '../../utils/userStorage';

export default function Topbar({ onMenuClick }) {
    const { user } = useAuth();
    const isGuestUser = !isAuthenticatedUser(user);
    const userKey = getDashboardUserKey(user);
    const [streak, setStreak] = useState(() => readDashboardProgress(userKey).streak);
    const [animatingStreak, setAnimatingStreak] = useState(false);
    const previousStreakRef = useRef(streak);
    const [levelInfo, setLevelInfo] = useState(() => getLevelInfo(getXpData().totalXp));

    useEffect(() => {
        if (isGuestUser) {
            setAnimatingStreak(false);
            return undefined;
        }

        const nextStreak = readDashboardProgress(userKey).streak;
        setStreak(nextStreak);
        previousStreakRef.current = nextStreak;
        setLevelInfo(getLevelInfo(getXpData().totalXp));

        return subscribeDashboardProgress((payload) => {
            if (payload && payload.userKey && payload.userKey !== userKey) return;
            const latestStreak = readDashboardProgress(userKey).streak;
            if (latestStreak > previousStreakRef.current) {
                setAnimatingStreak(false);
                requestAnimationFrame(() => setAnimatingStreak(true));
            } else {
                setAnimatingStreak(false);
            }
            previousStreakRef.current = latestStreak;
            setStreak(latestStreak);
            setLevelInfo(getLevelInfo(getXpData().totalXp));
        });
    }, [isGuestUser, userKey]);

    useEffect(() => {
        if (isGuestUser) {
            return undefined;
        }

        const refresh = () => setLevelInfo(getLevelInfo(getXpData().totalXp));
        window.addEventListener(XP_EVENT, refresh);
        window.addEventListener('storage', refresh);
        const id = setInterval(refresh, 3000);
        return () => {
            window.removeEventListener(XP_EVENT, refresh);
            window.removeEventListener('storage', refresh);
            clearInterval(id);
        };
    }, [isGuestUser]);

    return (
        <header className="topbar">
            <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Open sidebar" type="button">
                <span></span><span></span><span></span>
            </button>

            <div className="topbar-logo" style={{ display: 'none' }}>
                <Link to="/"><img src={logo2} alt="VocabUp" className="topbar-logo-img" /></Link>
            </div>

            <div className="topbar-greeting">
                <span>Xin chào, <strong>{user?.name || 'Guest User'}</strong>!</span>
            </div>

            <div className="topbar-actions">
                {!isGuestUser && (
                    <>
                        <div
                            className="topbar-xp"
                            title={`Level ${levelInfo.level}\n${levelInfo.totalXp} XP`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 12px',
                                borderRadius: 20,
                                background: 'rgba(139,92,246,0.12)',
                                border: '1.5px solid rgba(139,92,246,0.25)',
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#8b5cf6',
                                cursor: 'default',
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{levelInfo.badge}</span>
                            <span>Lv.{levelInfo.level}</span>
                            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.2)', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${Math.round(levelInfo.progress * 100)}%`,
                                        height: '100%',
                                        borderRadius: 2,
                                        background: '#8b5cf6',
                                        transition: 'width .5s ease',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="topbar-streak" id="streakBtn" title="Streak hiện tại">
                            <span className="streak-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.65 11.3C17.41 10.82 17.13 10.37 16.8 9.94C16.07 9.02 15.42 8.04 15.12 6.91C14.7 5.31 15.08 3.8 15.25 3C10.65 4.3 9 8.25 9 11.02C9 11.49 9.04 11.94 9.12 12.37C8.24 11.83 7.5 11.02 7 10C6.11 11.95 5.96 14.24 7.04 16.2C7.13 16.37 7.23 16.53 7.34 16.69C7.45 16.85 7.57 17.01 7.7 17.16C8.75 18.25 10.27 19 12 19C15.31 19 18 16.31 18 13C18 12.41 17.88 11.84 17.65 11.3Z" fill="#FF4500" />
                                    <path d="M12 17C13.6569 17 15 15.6569 15 14C15 12.82 14.31 11.81 13.32 11.33C13.41 11.01 13.47 10.67 13.47 10.32C13.47 9.17 12.8 8.18 11.84 7.71C10.27 8.35 9.5 10.15 9.5 11.84C9.5 12.13 9.52 12.4 9.57 12.67C9.23 12.44 8.94 12.14 8.72 11.81C8.21 12.98 8.14 14.36 8.76 15.54C9.42 16.45 10.64 17 12 17Z" fill="#FFD700" />
                                </svg>
                            </span>
                            <strong id="streakCount" style={{ animation: animatingStreak ? 'streakPop .4s ease' : 'none' }}>{streak}</strong>
                            <span className="streak-label">ngày</span>
                        </div>
                    </>
                )}

                <button className="topbar-chatbot" title="Mở trợ lý AI" onClick={() => window.dispatchEvent(new CustomEvent('toggleFloatChat'))}>
                    <img src={aiImg} alt="AI Chatbot" className="topbar-chatbot-img" />
                </button>
            </div>
        </header>
    );
}
