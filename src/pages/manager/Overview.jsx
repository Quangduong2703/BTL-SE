import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../utils/axiosClient';

function formatNumber(value) {
    return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function normalizeErrorMessage(error, fallback) {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return fallback;
    }
}

function safeText(value, fallback = '') {
    if (typeof value === 'string') return value;
    if (value == null) return fallback;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
}

function SummaryCard({ label, value, hint, loading }) {
    return (
        <article className="manager-stat-card">
            <span className="manager-stat-label">{safeText(label, '--')}</span>
            <strong className="manager-stat-value">{loading ? '...' : formatNumber(value)}</strong>
            <p className="manager-stat-hint">{safeText(hint)}</p>
        </article>
    );
}

function OverviewBarChart({ points, maxCount }) {
    if (!points.length) {
        return <div className="manager-chart-empty">Chưa có dữ liệu đăng ký trong khoảng thời gian này.</div>;
    }

    const width = 760;
    const height = 280;
    const padding = { top: 30, right: 20, bottom: 42, left: 20 };
    const max = Math.max(maxCount || 0, 1);
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const slotWidth = innerWidth / points.length;
    const barWidth = Math.min(Math.max(slotWidth * 0.52, 18), 34);
    const yAxisTicks = (() => {
        if (max <= 4) {
            return Array.from({ length: max + 1 }, (_, index) => index);
        }

        const step = Math.ceil(max / 4);
        const ticks = new Set([0]);

        for (let value = step; value < max; value += step) {
            ticks.add(value);
        }

        ticks.add(max);
        return Array.from(ticks).sort((a, b) => a - b);
    })();

    return (
        <div className="manager-chart-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} className="manager-bar-chart-svg" role="img" aria-label="Biểu đồ cột người dùng đăng ký mới">
                {yAxisTicks.map((tickValue) => {
                    const y = padding.top + innerHeight - ((tickValue / max) * innerHeight);

                    return (
                        <g key={tickValue}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={width - padding.right}
                                y2={y}
                                className="manager-bar-chart-grid"
                            />
                            <text
                                x={width - padding.right}
                                y={y - 6}
                                textAnchor="end"
                                className="manager-bar-chart-axis-text"
                            >
                                {tickValue}
                            </text>
                        </g>
                    );
                })}

                {points.map((point, index) => {
                    const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
                    const barHeight = point.count ? Math.max((point.count / max) * innerHeight, 10) : 0;
                    const y = padding.top + innerHeight - barHeight;
                    const centerX = x + barWidth / 2;

                    return (
                        <g key={point.date}>
                            {barHeight > 0 ? (
                                <>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        rx="12"
                                        className="manager-bar-chart-bar"
                                    />
                                    <text
                                        x={centerX}
                                        y={Math.max(y - 10, padding.top - 2)}
                                        textAnchor="middle"
                                        className="manager-bar-chart-top-label"
                                    >
                                        {formatNumber(point.count)}
                                    </text>
                                </>
                            ) : (
                                <text
                                    x={centerX}
                                    y={padding.top + innerHeight - 8}
                                    textAnchor="middle"
                                    className="manager-bar-chart-zero"
                                >
                                    0
                                </text>
                            )}

                            <text
                                x={centerX}
                                y={height - 12}
                                textAnchor="middle"
                                className="manager-bar-chart-label"
                            >
                                {point.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function OverviewDonutChart({ items, total, emptyMessage }) {
    const safeTotal = Math.max(total || 0, items.reduce((sum, item) => sum + Number(item.value || 0), 0));
    const radius = 72;
    const stroke = 18;
    const circumference = 2 * Math.PI * radius;
    let offsetCursor = 0;
    const colors = ['#1cb0f6', '#58cc02', '#d98f3f', '#7f8aa3'];

    if (!items.length || !safeTotal) {
        return <div className="manager-chart-empty manager-chart-empty-compact">{safeText(emptyMessage, 'Chưa có dữ liệu để hiển thị.')}</div>;
    }

    return (
        <div className="manager-donut-shell">
            <div className="manager-donut-visual" role="img" aria-label="Biểu đồ tròn cơ cấu hoạt động học">
                <svg viewBox="0 0 220 220" className="manager-donut-svg">
                    <circle cx="110" cy="110" r={radius} className="manager-donut-track" />
                    {items.map((item, index) => {
                        const value = Number(item.value || 0);
                        const ratio = value / safeTotal;
                        const dash = circumference * ratio;
                        const gap = circumference - dash;
                        const currentOffset = offsetCursor;
                        offsetCursor += dash;

                        return (
                            <circle
                                key={item.label}
                                cx="110"
                                cy="110"
                                r={radius}
                                className="manager-donut-ring"
                                stroke={colors[index % colors.length]}
                                strokeWidth={stroke}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={-currentOffset}
                            />
                        );
                    })}
                </svg>
                <div className="manager-donut-center">
                    <span>Tổng</span>
                    <strong>{formatNumber(safeTotal)}</strong>
                </div>
            </div>

            <div className="manager-donut-legend">
                {items.map((item, index) => (
                    <div key={item.label} className="manager-donut-legend-item">
                        <span className="manager-donut-swatch" style={{ backgroundColor: colors[index % colors.length] }} />
                        <div>
                            <strong>{item.label}</strong>
                            <span>{formatNumber(item.value)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ManagerOverview() {
    const [rangeDays, setRangeDays] = useState(7);
    const [summary, setSummary] = useState(null);
    const [chart, setChart] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [summaryError, setSummaryError] = useState('');
    const [chartError, setChartError] = useState('');
    const totalVocabularyActivities = Number(summary?.totalSrsReviews || 0) + Number(summary?.totalVocabModeCompletions || 0);
    const totalLearningActivities = Number(summary?.totalToeicAttempts || 0) + totalVocabularyActivities;

    useEffect(() => {
        let active = true;
        setSummaryLoading(true);
        setSummaryError('');

        axiosClient.get('/admin/overview/summary')
            .then((data) => {
                if (!active) return;
                setSummary(data);
            })
            .catch((err) => {
                if (!active) return;
                setSummaryError(
                    normalizeErrorMessage(
                        err.response?.data?.error || err.response?.data || err.message,
                        'Không thể tải tổng quan hệ thống.',
                    ),
                );
                setSummary({
                    totalUsers: 0,
                    totalCourses: 0,
                    totalToeicTests: 0,
                    totalFlashcards: 0,
                    totalToeicQuestions: 0,
                    totalToeicAttempts: 0,
                    totalSrsReviews: 0,
                    totalVocabModeCompletions: 0,
                    activeUsersToday: 0,
                    activityBreakdown: { toeicAttempts: 0, srsReviews: 0 },
                });
            })
            .finally(() => {
                if (active) setSummaryLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setChartLoading(true);
        setChartError('');

        axiosClient.get(`/admin/overview/registrations?days=${rangeDays}`)
            .then((data) => {
                if (!active) return;
                setChart(data);
            })
            .catch((err) => {
                if (!active) return;
                setChartError(
                    normalizeErrorMessage(
                        err.response?.data?.error || err.response?.data || err.message,
                        'Không thể tải dữ liệu đăng ký mới.',
                    ),
                );
                setChart({
                    points: [],
                    maxCount: 0,
                    totalRegistrations: 0,
                    range: null,
                });
            })
            .finally(() => {
                if (active) setChartLoading(false);
            });

        return () => {
            active = false;
        };
    }, [rangeDays]);

    const summaryCards = useMemo(() => ([
        {
            label: 'Tổng người dùng',
            value: summary?.totalUsers,
            hint: 'Tổng số tài khoản đã đăng ký trên hệ thống.',
        },
        {
            label: 'Khóa học',
            value: summary?.totalCourses,
            hint: `Flashcards: ${formatNumber(summary?.totalFlashcards)}`,
        },
        {
            label: 'Đề TOEIC',
            value: summary?.totalToeicTests,
            hint: `Câu hỏi: ${formatNumber(summary?.totalToeicQuestions)}`,
        },
        {
            label: 'Lượt học từ vựng',
            value: totalVocabularyActivities,
            hint: 'Bao gồm flashcard, quiz, listening, typing, match, flappy bird và ôn SRS.',
        },
        {
            label: 'Lượt thi TOEIC',
            value: summary?.totalToeicAttempts,
            hint: 'Tổng số lượt làm bài TOEIC đã được ghi nhận.',
        },
    ]), [summary, totalVocabularyActivities]);

    const activityChartItems = useMemo(() => ([
        { label: 'Thi TOEIC', value: Number(summary?.activityBreakdown?.toeicAttempts || 0) },
        { label: 'Học từ vựng', value: totalVocabularyActivities },
    ]), [summary, totalVocabularyActivities]);

    const displayedChart = useMemo(() => {
        if (!chart?.points?.length) {
            return {
                points: [],
                maxCount: 0,
                totalRegistrations: chart?.totalRegistrations || 0,
                range: chart?.range || null,
            };
        }

        if (rangeDays !== 30) {
            return {
                points: chart.points,
                maxCount: chart.maxCount || 0,
                totalRegistrations: chart.totalRegistrations || 0,
                range: chart.range || null,
            };
        }

        const bucketSize = Math.ceil(chart.points.length / 4);
        const weeklyPoints = Array.from({ length: 4 }, (_, index) => {
            const start = index * bucketSize;
            const end = start + bucketSize;
            const group = chart.points.slice(start, end);

            return {
                date: `week-${index + 1}`,
                label: `Tuần ${index + 1}`,
                count: group.reduce((sum, point) => sum + Number(point.count || 0), 0),
            };
        }).filter((item, index) => index < 4 && (item.count > 0 || index * bucketSize < chart.points.length));

        return {
            points: weeklyPoints,
            maxCount: Math.max(...weeklyPoints.map((item) => item.count), 0),
            totalRegistrations: chart.totalRegistrations || 0,
            range: chart.range || null,
        };
    }, [chart, rangeDays]);

    return (
        <main className="manager-page">
            <section className="manager-panel manager-overview-hero">
                <div className="manager-overview-hero-copy">
                    <h2>Tổng quan vận hành</h2>
                    <p>
                        Theo dõi nhanh người dùng, nội dung và hoạt động học tập trong hệ thống.
                    </p>
                    <div className="manager-overview-hero-notes">
                        <span>Người dùng</span>
                        <span>Nội dung</span>
                        <span>Hoạt động học</span>
                    </div>
                </div>

                <div className="manager-overview-hero-metrics">
                    <article className="manager-overview-metric-card is-primary">
                        <span>Người dùng hoạt động hôm nay</span>
                        <strong>{summaryLoading ? '...' : formatNumber(summary?.activeUsersToday)}</strong>
                        <small>Người dùng có phát sinh hoạt động học trong ngày hôm nay.</small>
                    </article>
                </div>
            </section>

            {summaryError ? (
                <section className="manager-panel">
                    <div className="manager-panel-head">
                        <h3>Lỗi tải tổng quan</h3>
                        <span className="manager-chip">Cần kiểm tra</span>
                    </div>
                    <p className="manager-error-text">{safeText(summaryError, 'Không thể tải tổng quan hệ thống.')}</p>
                </section>
            ) : null}

            <section className="manager-overview-stats">
                {summaryCards.map((card) => (
                    <SummaryCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        hint={card.hint}
                        loading={summaryLoading}
                    />
                ))}
            </section>

            <section className="manager-grid manager-grid-overview manager-overview-chart-grid">
                <article className="manager-panel">
                    <div className="manager-panel-head manager-panel-head-wrap">
                        <div>
                            <h3>Người dùng đăng ký mới</h3>
                            <p className="manager-muted-text">
                                Biểu đồ cột theo dõi số người dùng đăng ký mới trong {rangeDays} ngày gần đây.
                            </p>
                        </div>
                        <div className="manager-segmented">
                            {[7, 30].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    className={`manager-segmented-btn ${rangeDays === days ? 'active' : ''}`}
                                    onClick={() => setRangeDays(days)}
                                >
                                    {days} ngày
                                </button>
                            ))}
                        </div>
                    </div>

                    {chartError ? <p className="manager-error-text">{safeText(chartError, 'Không thể tải dữ liệu đăng ký mới.')}</p> : null}
                    {chartLoading ? <div className="manager-chart-loading">Đang tải biểu đồ đăng ký mới...</div> : null}
                    {!chartLoading && !chartError ? (
                        <OverviewBarChart points={displayedChart.points} maxCount={displayedChart.maxCount} />
                    ) : null}

                </article>

                <article className="manager-panel">
                    <div className="manager-panel-head manager-panel-head-wrap">
                        <div>
                            <h3>Cơ cấu hoạt động học</h3>
                            <p className="manager-muted-text">
                                Biểu đồ tròn tổng hợp tỷ trọng giữa các nhóm hoạt động học đang diễn ra trên hệ thống.
                            </p>
                        </div>
                    </div>
                    {summaryLoading ? <div className="manager-chart-loading">Đang tải biểu đồ cơ cấu...</div> : null}
                    {!summaryLoading ? (
                        <OverviewDonutChart
                            items={activityChartItems}
                            total={totalLearningActivities}
                            emptyMessage="Chưa có dữ liệu để hiển thị."
                        />
                    ) : null}

                </article>
            </section>
        </main>
    );
}
