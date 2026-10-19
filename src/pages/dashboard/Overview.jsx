import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../utils/axiosClient';
import { mergeGuestReadyCourses } from '../../data/guestToeicCourses';
import { useCourseProgress } from '../../hooks/useCourseProgress';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import { useAuth } from '../../contexts/useAuth';
import {
    completeDashboardTask,
    getDashboardUserKey,
    getTodayKey,
    readDashboardProgress,
    subscribeDashboardProgress,
    syncDashboardProgressWithServer,
} from '../../utils/dashboardProgress';
import { buildActivityChartData } from '../../utils/userStats';
import { XP_EVENT, getLevelInfo, getXpData, syncXpWithServer } from '../../utils/xpSystem';
import { getDueCount, checkSrsDecayWarning } from '../../utils/srsStorage';
import { isAuthenticatedUser } from '../../utils/userStorage';

export default function Overview() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isGuestUser = !isAuthenticatedUser(user);
    const { remembered } = useCourseProgress();
    const { customCourses } = useCustomCourses();
    const canvasRef = useRef(null);
    const dailyCheckinLockRef = useRef(false);
    const [allCourses, setAllCourses] = useState([]);
    const [stats, setStats] = useState({ streak: 0, words: 0, xp: 0 });
    const [chartPeriod, setChartPeriod] = useState('week');
    const [xpTotal, setXpTotal] = useState(() => getXpData().totalXp);

    useEffect(() => {
        axiosClient.get('/courses')
            .then((res) => {
                const data = res.data || res;
                const nextCourses = Array.isArray(data) ? data : [];
                setAllCourses(mergeGuestReadyCourses(nextCourses));
            })
            .catch((err) => {
                console.error('Fetch courses error:', err);
                setAllCourses(mergeGuestReadyCourses([]));
            });
    }, [user]);

    const userKey = useMemo(() => getDashboardUserKey(user), [user]);
    const [dashboardProgress, setDashboardProgress] = useState(() => readDashboardProgress(userKey));
    const levelInfo = getLevelInfo(xpTotal);
    const srsCount = getDueCount();
    const decayCount = checkSrsDecayWarning();

    useEffect(() => {
        if (!isGuestUser && user) {
            syncDashboardProgressWithServer(userKey);
            syncXpWithServer();
        }
    }, [isGuestUser, userKey, user]);

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

    useEffect(() => {
        setDashboardProgress(readDashboardProgress(userKey));

        return subscribeDashboardProgress((payload) => {
            if (payload && payload.userKey && payload.userKey !== userKey) return;
            setDashboardProgress(readDashboardProgress(userKey));
        });
    }, [userKey]);

    const builtInWordTotal = useMemo(
        () => allCourses.reduce((sum, course) => sum + Number(course.vocabulary_count || 0), 0),
        [allCourses],
    );

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

    const totalRememberedCount = useMemo(
        () => Object.keys(remembered).filter((key) => remembered[key]).length,
        [remembered],
    );

    const builtInDone = Math.max(totalRememberedCount - customDone, 0);
    const grandTotal = Math.max(builtInWordTotal + customTotal, totalRememberedCount);
    const grandDone = builtInDone + customDone;

    const tasks = dashboardProgress.tasks;
    const todayKey = getTodayKey();
    const claimedDailyTasks = dashboardProgress.dailyTaskClaimedAt || {};
    const tasksView = tasks.map((task) => {
        if (task.id === 'vocab-modes') {
            return {
                ...task,
                desc: `Hoàn thành ${(dashboardProgress.completedStudyModesToday || []).length}/7 mode: Flashcard, Quiz, Listening, Typing, Match, Flappy Bird, Mưa từ vựng · +24 EXP`,
            };
        }

        if (task.id === 'toeic-fulltest') {
            return {
                ...task,
                desc: 'Đạt tối thiểu 200 điểm trong 1 bài TOEIC Full Test hôm nay · +50 EXP',
            };
        }

        if (task.id === 'daily-checkin' && claimedDailyTasks[task.id] === todayKey) {
            return {
                ...task,
                isDone: true,
            };
        }

        return task;
    });

    const completedTasks = tasksView.filter((task) => task.isDone).length;
    const todayTaskPct = tasksView.length ? Math.round((completedTasks / tasksView.length) * 100) : 0;

    const currentChartSnapshot = useMemo(() => ({
        date: dashboardProgress.currentDate,
        dailyXp: dashboardProgress.dailyXp,
        learnedWords: Array.isArray(dashboardProgress.learnedWordEventIdsToday)
            ? dashboardProgress.learnedWordEventIdsToday.length
            : (Array.isArray(dashboardProgress.learnedWordIdsToday) ? dashboardProgress.learnedWordIdsToday.length : 0),
        rememberedTotal: grandDone,
        totalXp: xpTotal,
        streak: dashboardProgress.streak,
        tasksCompleted: completedTasks,
        taskTarget: tasksView.length,
    }), [
        dashboardProgress.currentDate,
        dashboardProgress.dailyXp,
        dashboardProgress.learnedWordEventIdsToday,
        dashboardProgress.learnedWordIdsToday,
        dashboardProgress.streak,
        grandDone,
        completedTasks,
        tasksView.length,
        xpTotal,
    ]);

    const targetStats = useMemo(() => ({
        streak: dashboardProgress.streak,
        words: grandDone,
        xp: xpTotal,
    }), [dashboardProgress.streak, grandDone, xpTotal]);

    const activeChartData = useMemo(
        () => buildActivityChartData(userKey, chartPeriod, currentChartSnapshot),
        [userKey, chartPeriod, currentChartSnapshot],
    );

    useEffect(() => {
        const duration = 700;
        const start = performance.now();

        function animate(now) {
            const progress = Math.min((now - start) / duration, 1);
            setStats({
                streak: Math.floor(targetStats.streak * progress),
                words: Math.floor(targetStats.words * progress),
                xp: Math.floor(targetStats.xp * progress),
            });

            if (progress < 1) requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }, [targetStats]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const data = activeChartData;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        const width = rect.width;
        const height = 160;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        function roundRect(context, x, y, w, h, radius) {
            if (h <= 0) return;

            const safeRadius = Math.min(radius, h / 2, w / 2);
            context.beginPath();
            context.moveTo(x + safeRadius, y);
            context.lineTo(x + w - safeRadius, y);
            context.quadraticCurveTo(x + w, y, x + w, y + safeRadius);
            context.lineTo(x + w, y + h);
            context.lineTo(x, y + h);
            context.lineTo(x, y + safeRadius);
            context.quadraticCurveTo(x, y, x + safeRadius, y);
            context.closePath();
        }

        const animationDuration = 800;
        const animationStart = performance.now();

        function drawFrame(now) {
            const progress = Math.min((now - animationStart) / animationDuration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            ctx.clearRect(0, 0, width, height);

            const count = data.labels.length;
            const padL = 36;
            const padR = 12;
            const padT = 12;
            const padB = 28;
            const plotW = width - padL - padR;
            const plotH = height - padT - padB;
            const maxVal = Math.max(...data.xp, ...data.words, 1) * 1.15;
            const groupW = plotW / count;
            const barW = Math.min(groupW * 0.32, 16);
            const gap = 4;

            ctx.strokeStyle = 'rgba(0,0,0,.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i += 1) {
                const y = padT + (plotH / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padL, y);
                ctx.lineTo(width - padR, y);
                ctx.stroke();

                const val = Math.round(maxVal - (maxVal / 4) * i);
                ctx.fillStyle = 'rgba(119,119,119,.7)';
                ctx.font = '600 10px Nunito, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(val, padL - 6, y + 4);
            }

            data.labels.forEach((label, i) => {
                const cx = padL + groupW * i + groupW / 2;

                const reviewH = (data.xp[i] / maxVal) * plotH * ease;
                ctx.fillStyle = 'rgba(28,176,246,.78)';
                roundRect(ctx, cx - barW - gap / 2, padT + plotH - reviewH, barW, reviewH, 4);
                ctx.fill();

                const learnH = (data.words[i] / maxVal) * plotH * ease;
                ctx.fillStyle = 'rgba(88,204,2,.88)';
                roundRect(ctx, cx + gap / 2, padT + plotH - learnH, barW, learnH, 4);
                ctx.fill();

                ctx.fillStyle = 'rgba(119,119,119,.92)';
                ctx.font = '700 11px Nunito, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, cx, height - 6);
            });

            if (progress < 1) requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }, [activeChartData]);

    const handleTaskAction = (task) => {
        if (task.id === 'daily-checkin') {
            if (dailyCheckinLockRef.current || claimedDailyTasks[task.id] === todayKey) {
                return;
            }
            dailyCheckinLockRef.current = true;
            try {
                const result = completeDashboardTask(userKey, task.id);
                setDashboardProgress(result.progress);
            } finally {
                window.setTimeout(() => {
                    dailyCheckinLockRef.current = false;
                }, 0);
            }
            return;
        }

        if (task.page) {
            navigate(`/dashboard/${task.page}`);
        }
    };

    const totalLearn = activeChartData.totalWords;
    const totalReview = activeChartData.totalXp;
    const customPct = customTotal > 0 ? Math.round((customDone / customTotal) * 100) : 0;

    return (
        <main className="dash-main" id="page-dashboard">
            <section className="welcome-banner reveal" data-reveal-order="0">
                <div className="welcome-layout">
                    <div className="welcome-text">
                        <div className="welcome-eyebrow" id="dash-today-label">
                            {new Date().toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            })}
                        </div>
                        <h1 className="welcome-title">Tiếp tục hành trình học từ vựng</h1>
                        <p className="welcome-sub">
                            Bạn đã học <strong id="dash-total-remembered">{stats.words}</strong> từ vựng trên tổng
                            <strong id="dash-total-words"> {grandTotal}</strong> từ. Duy trì nhịp độ ổn định để kho từ
                            vựng tăng đều mỗi ngày.
                        </p>
                        <div className="welcome-actions">
                            <Link to="/dashboard/courses"><button className="btn btn-primary btn-large" id="startStudyBtn">Topic</button></Link>
                            <Link to="/dashboard/games"><button className="btn btn-secondary">Trò chơi</button></Link>
                        </div>
                    </div>

                    <div className="welcome-panel">
                        <div className="welcome-pill-row">
                            <div className="welcome-pill">
                                <span>Streak</span>
                                <strong>{`${stats.streak} ngày`}</strong>
                            </div>
                            <div className="welcome-pill">
                                <span>Tổng EXP</span>
                                <strong>{stats.xp}</strong>
                            </div>
                        </div>

                        <div className="welcome-focus-card welcome-focus-card-level">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: '1.5rem' }}>{levelInfo.badge}</span>
                                <div>
                                    <strong className="welcome-focus-heading">Level {levelInfo.level}</strong>
                                    <div className="welcome-focus-meta">{levelInfo.totalXp} XP tổng cộng</div>
                                </div>
                            </div>
                            <div className="welcome-focus-progress">
                                <div className="welcome-focus-progress-fill" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
                            </div>
                            {levelInfo.nextLevel && (
                                <span className="welcome-focus-note">
                                    Còn {levelInfo.xpForNext - levelInfo.xpInLevel} XP đến Level {levelInfo.nextLevel.level}
                                </span>
                            )}
                            {!levelInfo.nextLevel && (
                                <span className="welcome-focus-note">Đã đạt cấp cao nhất</span>
                            )}
                        </div>

                        {decayCount > 0 && (
                            <div className="welcome-focus-card welcome-focus-card-alert">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                                    <div>
                                        <strong className="welcome-focus-heading welcome-focus-heading-alert">Báo động đỏ!</strong>
                                        <p className="welcome-focus-copy">
                                            Có <strong>{decayCount}</strong> từ vựng đang phai mờ khỏi ký ức vì bị bỏ quên.
                                            <Link to="/dashboard/games" className="welcome-focus-link welcome-focus-link-alert"> Cứu ngay!</Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {srsCount > 0 && decayCount === 0 && (
                            <div className="welcome-focus-card welcome-focus-card-srs">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.3rem' }}>📋</span>
                                    <div>
                                        <strong className="welcome-focus-heading welcome-focus-heading-srs">Ôn tập SRS</strong>
                                        <p className="welcome-focus-copy">Bạn có <strong>{srsCount}</strong> từ cần ôn tập hôm nay</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="mid-grid">
                <div className="chart-card reveal" data-reveal-order="1">
                    <div className="card-header">
                        <div>
                            <div className="card-eyebrow">Hoạt động</div>
                            <h2 className="card-title-text">{chartPeriod === 'week' ? 'Tuần này' : '4 tuần gần nhất'}</h2>
                        </div>
                        <div className="chart-tabs">
                            <button className={`chart-tab ${chartPeriod === 'week' ? 'active' : ''}`} onClick={() => setChartPeriod('week')}>Tuần</button>
                            <button className={`chart-tab ${chartPeriod === 'month' ? 'active' : ''}`} onClick={() => setChartPeriod('month')}>4 tuần</button>
                        </div>
                    </div>

                    <div className="chart-area" id="chartArea" style={{ height: '160px', position: 'relative' }}>
                        <canvas ref={canvasRef} />
                    </div>

                    <div className="chart-summary">
                        <div className="chart-summary-card">
                            <span>{chartPeriod === 'week' ? 'Lượt học mới 7 ngày' : 'Lượt học mới 4 tuần'}</span>
                            <strong>{totalLearn}</strong>
                        </div>
                        <div className="chart-summary-card">
                            <span>{chartPeriod === 'week' ? 'EXP tích lũy 7 ngày' : 'EXP tích lũy 4 tuần'}</span>
                            <strong>{totalReview}</strong>
                        </div>
                    </div>

                    <div className="chart-legend">
                        <span className="legend-dot" style={{ background: 'var(--blue)' }}></span> EXP tích lũy
                        <span className="legend-dot" style={{ background: 'var(--green)', marginLeft: '16px' }}></span> Từ mới đã học
                    </div>
                </div>

                <div className="today-card reveal" data-reveal-order="2">
                    <div className="card-header">
                        <div>
                            <div className="card-eyebrow">Hôm nay</div>
                            <h2 className="card-title-text">Mục tiêu ngày</h2>
                        </div>
                        <span className="badge badge-streak">{`${completedTasks}/${tasksView.length} task hoàn thành`}</span>
                    </div>

                    <div className="today-progress">
                        <div className="today-progress-bar">
                            <span style={{ width: `${Math.max(todayTaskPct, 8)}%` }}></span>
                        </div>
                        <p>Task chỉ được tính xong khi bạn thực hiện đúng hành động tương ứng trong hệ thống.</p>
                    </div>

                    <div className="task-list">
                        {tasksView.map((task) => (
                            <div key={task.id} className={`task-item ${task.isDone ? 'done' : 'active'}`}>
                                <span className={`task-check ${!task.isDone ? 'pending' : ''}`}>{task.isDone ? '✓' : '○'}</span>
                                <div className="task-info">
                                    <strong>{task.title}</strong>
                                    <span>{task.desc}</span>
                                </div>
                                <button
                                    className={`btn btn-small ${task.isDone ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={() => !task.isDone && handleTaskAction(task)}
                                    disabled={task.isDone || (task.id === 'daily-checkin' && claimedDailyTasks[task.id] === todayKey)}
                                >
                                    {task.isDone ? 'Hoàn thành' : 'Làm ngay'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <section className="courses-section">
                <div className="section-header-dash">
                    <div>
                        <div className="card-eyebrow">Module</div>
                        <h2 className="card-title-text">Tài liệu học tập có sẵn</h2>
                    </div>
                </div>

                <div className="courses-grid-dash">
                    {allCourses.map((course) => {
                        const totalWords = Number(course.vocabulary_count || 0);
                        const pct = totalWords > 0 ? Math.round((builtInDone / totalWords) * 100) : 0;
                        const langName = 'Topic';

                        return (
                            <div key={course.id} className="course-dash-card reveal revealed" data-course-id={course.id}>
                                <div className="course-dash-top course-dash-top-english">
                                    <span className="course-flag">{langName}</span>
                                </div>
                                <div className="course-dash-body">
                                    <h3 className="course-dash-name">{course.title}</h3>
                                    <p className="course-dash-desc">{course.description || ''}</p>
                                    <div className="course-progress-section">
                                        <div className="course-progress-header">
                                            <span>Tiến độ</span>
                                            <span><strong className="cd-pct">{pct}%</strong></span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill course-fill"
                                                style={{
                                                    background: 'var(--blue)',
                                                    width: `${pct}%`,
                                                    transition: 'width 0.6s ease',
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="course-dash-footer">
                                    <Link
                                        to="/dashboard/courses?tab=english"
                                        className="btn btn-primary btn-small cd-view-btn"
                                    >
                                        Xem ngay
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    <div className="course-dash-card reveal revealed" style={{ transitionDelay: '160ms' }}>
                        <div className="course-dash-top course-dash-top-custom">
                            <span className="course-flag">Cá nhân</span>
                        </div>
                        <div className="course-dash-body">
                            <h3 className="course-dash-name">Bộ từ vựng của riêng bạn</h3>
                            <p className="course-dash-desc">Danh sách các chủ đề từ vựng do bạn tự thêm và quản lý cá nhân.</p>
                            <div className="course-dash-meta">
                                <span className="cd-meta-words-custom">{customTotal} từ</span>
                                <span className="cd-meta-topics-custom">{customCourses.length} chủ đề</span>
                            </div>
                            <div className="course-progress-section">
                                <div className="course-progress-header">
                                    <span>Tiến độ</span>
                                    <span>
                                        <strong className="cd-done-custom">{customDone}</strong> /
                                        <strong className="cd-total-custom">{customTotal}</strong> từ ·
                                        <strong className="cd-pct-custom"> {customPct}%</strong>
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill course-fill-custom"
                                        style={{
                                            background: 'var(--golden)',
                                            width: `${customPct}%`,
                                            transition: 'width 0.6s ease',
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="course-dash-footer">
                            <button
                                className="btn btn-small"
                                onClick={() => navigate('/dashboard/courses?tab=custom')}
                                style={{ background: 'linear-gradient(135deg,var(--golden),#ffad00)', boxShadow: '0 3px 0 #cc8800', color: '#fff', width: '100%', fontSize: '13px', borderRadius: '10px' }}
                            >
                                Xem ngay
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
