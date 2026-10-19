import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import axiosClient from '../../utils/axiosClient';
import { getSettingsPreferences, setSettingsPreferences } from '../../utils/preferences';

function safeText(value, fallback = '') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return fallback;
}

const preferences = [
    {
        key: 'notifications',
        iconTone: 'blue',
        title: 'Thông báo học tập',
        desc: 'Nhắc bạn quay lại học đúng nhịp mỗi ngày.',
    },
    {
        key: 'darkMode',
        iconTone: 'green',
        title: 'Dark Mode',
        desc: 'Chuyển toàn bộ giao diện sang nền tối trên tất cả các trang.',
    },
];

const supportActions = [
    {
        iconTone: 'orange',
        title: 'Góp ý và báo lỗi',
        desc: 'Chia sẻ vấn đề hoặc đề xuất để cải thiện trải nghiệm.',
        cta: 'Mở form',
    },
    {
        iconTone: 'blue',
        title: 'Hướng dẫn nhanh',
        desc: 'Xem lại cách sử dụng dashboard và lộ trình học.',
        cta: 'Xem ngay',
        link: '/dashboard/courses',
    },
];

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const displayName = safeText(user?.name, 'Guest User');

    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState('gop-y');
    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackContent, setFeedbackContent] = useState('');
    const [submitState, setSubmitState] = useState('idle');
    const [toggles, setToggles] = useState(() => ({
        ...getSettingsPreferences(),
        darkMode: getSavedTheme() === 'dark',
    }));

    useEffect(() => {
        document.body.style.overflow = feedbackOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [feedbackOpen]);

    useEffect(() => {
        setSettingsPreferences({ notifications: toggles.notifications });
    }, [toggles.notifications]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleTogglePreference = (key) => {
        setToggles((prev) => {
            const next = { ...prev, [key]: !prev[key] };

            if (key === 'darkMode') {
                applyTheme(next.darkMode ? 'dark' : 'light');
            }

            return next;
        });
    };

    const closeFeedback = () => {
        setFeedbackOpen(false);
        setSubmitState('idle');
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackTitle.trim() || !feedbackContent.trim()) {
            setSubmitState('error');
            setTimeout(() => setSubmitState('idle'), 1800);
            return;
        }

        setSubmitState('submitting');

        try {
            await axiosClient.post('/support', {
                type: feedbackType,
                title: feedbackTitle.trim(),
                content: feedbackContent.trim(),
                sourcePage: '/dashboard/settings',
            });

            setSubmitState('success');
            setFeedbackTitle('');
            setFeedbackContent('');
            setTimeout(() => {
                closeFeedback();
                setSubmitState('idle');
            }, 1800);
        } catch {
            setSubmitState('error');
            setTimeout(() => setSubmitState('idle'), 1800);
        }
    };

    return (
        <main className="dash-main settings-page settings2-page" id="page-settings">
            <section className="settings2-hero reveal" data-reveal-order="0">
                <div className="settings2-hero-main">
                    <div className="settings2-avatar">{displayName ? displayName.charAt(0).toUpperCase() : 'G'}</div>
                    <div className="settings2-copy">
                        <div className="settings2-kicker">Cài đặt tài khoản</div>
                        <h1>{displayName}</h1>
                        <p>Tinh chỉnh trải nghiệm học tập, quản lý hỗ trợ và giữ giao diện đồng bộ, rõ ràng trên cả laptop lẫn mobile.</p>
                    </div>
                </div>
            </section>

            <div className="settings2-grid">
                <section className="settings2-card reveal" data-reveal-order="1">
                    <header className="settings2-card-head">
                        <div>
                            <span className="settings2-section-label">Tùy chỉnh</span>
                            <h2>Trải nghiệm học tập</h2>
                        </div>
                        <span className="settings2-chip">2 mục</span>
                    </header>

                    <div className="settings2-stack">
                        {preferences.map((item) => (
                            <div key={item.key} className="settings2-row">
                                <div className={`settings2-icon tone-${item.iconTone}`}>
                                    {item.key === 'notifications' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M22 20H2V18H3V11.0314C3 6.04348 7.02944 2 12 2C16.9706 2 21 6.04348 21 11.0314V18H22V20ZM9.5 21H14.5C14.5 22.3807 13.3807 23.5 12 23.5C10.6193 23.5 9.5 22.3807 9.5 21Z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M10 2H14V4.07C17.39 4.56 20 7.47 20 11C20 14.87 16.87 18 13 18H11C7.13 18 4 14.87 4 11C4 7.47 6.61 4.56 10 4.07V2ZM11 6C8.24 6 6 8.24 6 11C6 13.76 8.24 16 11 16H13C15.76 16 18 13.76 18 11C18 8.24 15.76 6 13 6H11ZM11 8H13V11H16V13H11V8Z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="settings2-row-copy">
                                    <strong>{item.title}</strong>
                                    <span>{item.desc}</span>
                                </div>
                                <label className="cv-switch settings2-switch" title={toggles[item.key] ? 'Đang bật' : 'Đang tắt'}>
                                    <input
                                        type="checkbox"
                                        className="cv-switch-chk"
                                        checked={toggles[item.key]}
                                        onChange={() => handleTogglePreference(item.key)}
                                    />
                                    <span className="cv-switch-track"><span className="cv-switch-thumb"></span></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="settings2-card reveal" data-reveal-order="2">
                    <header className="settings2-card-head">
                        <div>
                            <span className="settings2-section-label">Hỗ trợ</span>
                            <h2>Kênh liên hệ</h2>
                        </div>
                    </header>

                    <div className="settings2-stack">
                        {supportActions.map((item, index) => (
                            <button
                                key={item.title}
                                type="button"
                                className="settings2-action"
                                onClick={() => {
                                    if (index === 0) setFeedbackOpen(true);
                                    else if (item.link) navigate(item.link);
                                }}
                            >
                                <div className={`settings2-icon tone-${item.iconTone}`}>
                                    {index === 0 ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M6.45455 19L2 22.5V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.45455Z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="settings2-row-copy">
                                    <strong>{item.title}</strong>
                                    <span>{item.desc}</span>
                                </div>
                                <span className="settings2-action-cta">{item.cta}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <section className="settings2-actions reveal" data-reveal-order="3">
                <Link to="/" className="settings2-action-link">
                    <button className="btn settings2-btn settings2-btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M20 20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V11L1 11L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11L20 11V20Z" />
                        </svg>
                        Về trang chủ
                    </button>
                </Link>
                <button className="btn settings2-btn settings2-btn-secondary" onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M5 22C4.44772 22 4 21.5523 4 21V3C4 2.44772 4.44772 2 5 2H19C19.5523 2 20 2.44772 20 3V6H18V4H6V20H18V18H20V21C20 21.5523 19.5523 22 19 22H5ZM18 16V13H11V11H18V8L23 12L18 16Z" />
                    </svg>
                    Đăng xuất
                </button>
            </section>

            {feedbackOpen && (
                <div className="settings2-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeFeedback(); }}>
                    <div className="settings2-modal">
                        <div className="settings2-modal-head">
                            <div>
                                <span className="settings2-section-label">Phản hồi</span>
                                <h3>Góp ý và báo lỗi</h3>
                            </div>
                            <button type="button" className="settings2-close" onClick={closeFeedback}>×</button>
                        </div>

                        <div className="settings2-pill-switch">
                            <button
                                type="button"
                                className={feedbackType === 'gop-y' ? 'active' : ''}
                                onClick={() => setFeedbackType('gop-y')}
                            >
                                Góp ý
                            </button>
                            <button
                                type="button"
                                className={feedbackType === 'bao-loi' ? 'active danger' : 'danger'}
                                onClick={() => setFeedbackType('bao-loi')}
                            >
                                Báo lỗi
                            </button>
                        </div>

                        <div className="settings2-form">
                            <label>
                                <span>Tiêu đề</span>
                                <input
                                    type="text"
                                    value={feedbackTitle}
                                    onChange={(e) => setFeedbackTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề ngắn gọn"
                                />
                            </label>

                            <label>
                                <span>Nội dung</span>
                                <textarea
                                    value={feedbackContent}
                                    onChange={(e) => setFeedbackContent(e.target.value)}
                                    placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn"
                                ></textarea>
                            </label>

                            <button
                                type="button"
                                className={`settings2-submit ${submitState}`}
                                onClick={handleSubmitFeedback}
                                disabled={submitState === 'submitting'}
                            >
                                {submitState === 'submitting'
                                    ? 'Đang gửi phản hồi...'
                                    : submitState === 'success'
                                    ? 'Đã gửi phản hồi'
                                    : submitState === 'error'
                                        ? 'Vui lòng điền đầy đủ thông tin'
                                        : 'Gửi phản hồi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
