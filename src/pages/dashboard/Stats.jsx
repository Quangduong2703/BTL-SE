import { useEffect, useMemo, useState } from 'react';
import { useCourseProgress } from '../../hooks/useCourseProgress';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import { useAuth } from '../../contexts/useAuth';
import {
    getDashboardUserKey,
    readDashboardProgress,
    syncDashboardProgressWithServer,
} from '../../utils/dashboardProgress';
import { XP_EVENT, getXpData, syncXpWithServer } from '../../utils/xpSystem';
import axiosClient from '../../utils/axiosClient';
import { isAuthenticatedUser } from '../../utils/userStorage';

export default function Stats() {
    const { user } = useAuth();
    const isGuestUser = !isAuthenticatedUser(user);
    const { remembered } = useCourseProgress();
    const { customCourses } = useCustomCourses();
    const [leaderboard, setLeaderboard] = useState([]);
    const [courses, setCourses] = useState([]);
    const [xpTotal, setXpTotal] = useState(() => getXpData().totalXp);

    const userKey = useMemo(() => getDashboardUserKey(user), [user]);
    const dashboardProgress = useMemo(() => readDashboardProgress(userKey), [userKey]);

    useEffect(() => {
        if (!isGuestUser) {
            syncDashboardProgressWithServer(userKey);
            syncXpWithServer();
        }

        axiosClient.get('/progress/leaderboard?limit=5')
            .then((res) => {
                const serverLeaderboard = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];
                setLeaderboard(serverLeaderboard);
            })
            .catch(console.error);

        axiosClient.get('/courses')
            .then((res) => {
                const data = res.data || res;
                setCourses(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error('Failed to load courses', err);
                setCourses([]);
            });
    }, [isGuestUser, userKey]);

    useEffect(() => {
        const syncXpTotal = () => setXpTotal(getXpData().totalXp);

        syncXpTotal();
        window.addEventListener(XP_EVENT, syncXpTotal);
        window.addEventListener('storage', syncXpTotal);

        return () => {
            window.removeEventListener(XP_EVENT, syncXpTotal);
            window.removeEventListener('storage', syncXpTotal);
        };
    }, [userKey]);

    const customTotal = useMemo(
        () => customCourses.reduce((sum, topic) => sum + topic.words.length, 0),
        [customCourses],
    );

    const customDone = useMemo(
        () => customCourses.reduce(
            (sum, topic) => sum + topic.words.filter((word) => remembered[word.id]).length,
            0,
        ),
        [customCourses, remembered],
    );

    const builtInTotal = useMemo(
        () => courses.reduce((sum, course) => sum + Number(course.vocabulary_count || 0), 0),
        [courses],
    );

    const totalRemembered = useMemo(
        () => Object.keys(remembered).filter((key) => remembered[key]).length,
        [remembered],
    );

    const builtInDone = Math.max(totalRemembered - customDone, 0);
    const grandTotal = Math.max(builtInTotal + customTotal, totalRemembered, 1);
    const grandDone = builtInDone + customDone;
    const pct = Math.round((grandDone / grandTotal) * 100);

    const personalStats = [
        {
            label: 'Streak',
            value: isGuestUser ? 'Null' : `${dashboardProgress.streak} ngày`,
            icon: '🔥',
            tone: 'orange',
        },
        {
            label: 'Tổng EXP',
            value: isGuestUser ? 'Null' : xpTotal.toLocaleString('vi-VN'),
            icon: '⚡',
            tone: 'blue',
        },
        {
            label: 'Đã thuộc',
            value: `${grandDone}/${grandTotal} từ`,
            icon: '📚',
            tone: 'green',
        },
        {
            label: 'Tiến độ',
            value: `${pct}%`,
            icon: '📈',
            tone: 'purple',
        },
    ];

    const guestTodayTaskValue = isGuestUser
        ? 'Null'
        : `${dashboardProgress.tasks.filter((task) => task.isDone).length}/${dashboardProgress.tasks.length} task`;

    return (
        <main className="dash-main stats-page stats2-page" id="page-stats">
            <section className="stats2-hero reveal" data-reveal-order="0">
                <div className="stats2-hero-copy">
                    <div className="stats2-kicker">Thống kê</div>
                    <h1>Tổng quan tiến trình học tập</h1>
                    <p>Theo dõi tiến độ học tập, lượng từ đã ghi nhớ và những mốc EXP bạn đang tích lũy.</p>
                </div>
            </section>

            <div className="stats2-pills reveal" data-reveal-order="1">
                {personalStats.map((stat) => (
                    <div key={stat.label} className={`stats2-pill stats2-pill-${stat.tone}`}>
                        <span className="stats2-pill-icon">{stat.icon}</span>
                        <div className="stats2-pill-copy">
                            <span className="stats2-pill-label">{stat.label}</span>
                            <strong className="stats2-pill-value">{stat.value}</strong>
                        </div>
                    </div>
                ))}
            </div>

            <section className="stats2-board stats2-board-overview reveal" data-reveal-order="2">
                <header className="stats2-board-header">
                    <div className="stats2-board-copy">
                        <h2>Tiến độ tổng thể</h2>
                        <p>{grandDone} / {grandTotal} từ vựng đã được đánh dấu nhớ</p>
                    </div>
                    <span className="stats2-pct-badge">{pct}%</span>
                </header>
                <div className="stats2-overall-bar">
                    <div className="stats2-overall-fill" style={{ width: `${pct}%` }}></div>
                </div>
            </section>

            <div className="stats2-grid">
                <section className="stats2-board stats2-board-streak reveal">
                    <header className="stats2-board-header">
                        <div className="stats2-board-copy">
                            <h2>Hoạt động hôm nay</h2>
                            <p>EXP đã nhận và tiến độ daily task</p>
                        </div>
                    </header>
                    <div className="stats2-history">
                        <article className="stats2-history-item">
                            <div className="stats2-leader-main">
                                <div className="stats2-leader-copy">
                                    <strong>EXP hôm nay</strong>
                                    <small>{isGuestUser ? 'Null' : `${dashboardProgress.dailyXp} EXP`}</small>
                                </div>
                            </div>
                            <div className="stats2-history-values">
                                <span>{guestTodayTaskValue}</span>
                            </div>
                        </article>
                        <article className="stats2-history-item">
                            <div className="stats2-leader-main">
                                <div className="stats2-leader-copy">
                                    <strong>Từ mới hôm nay</strong>
                                    <small>{dashboardProgress.learnedWordIdsToday.length} từ</small>
                                </div>
                            </div>
                            <div className="stats2-history-values">
                                <span>Mục tiêu: 10 từ/ngày</span>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="stats2-board stats2-board-streak reveal">
                    <header className="stats2-board-header">
                        <div className="stats2-board-copy">
                            <h2>Bảng xếp hạng</h2>
                            <p>Top người học có tổng EXP cao nhất</p>
                        </div>
                    </header>
                    <div className="stats2-history">
                        {leaderboard.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-light)' }}>Chưa có dữ liệu xếp hạng từ server.</div>
                        ) : leaderboard.map((entry, index) => (
                            <article key={entry.id} className="stats2-history-item">
                                <div className="stats2-leader-main">
                                    <div
                                        className="stats2-leader-rank"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: index === 0 ? 'var(--orange-light)' : index === 1 ? 'var(--blue-light)' : index === 2 ? 'var(--green-light)' : 'var(--bg-card-hover)',
                                            color: index === 0 ? 'var(--orange)' : index === 1 ? 'var(--blue)' : index === 2 ? 'var(--green)' : 'var(--text-light)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            marginRight: '1rem',
                                        }}
                                    >
                                        #{index + 1}
                                    </div>
                                    <div className="stats2-leader-copy">
                                        <strong>{entry.name || 'Người dùng ẩn danh'}</strong>
                                        <small>Level {entry.level}</small>
                                    </div>
                                </div>
                                <div className="stats2-history-values">
                                    <span style={{ fontWeight: 'bold', color: 'var(--blue)' }}>{entry.score} XP</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
