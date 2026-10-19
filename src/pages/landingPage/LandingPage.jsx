import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

import { useLandingReveal, useCounterAnimation } from './hooks';
import { FEATURES, SVGS, COURSE_CARDS } from '../../data/landingData';
import CourseCard from './CourseCard';
import axiosClient from '../../utils/axiosClient';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../supabase';

export default function LandingPage() {
    useLandingReveal();
    useCounterAnimation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [tests, setTests] = useState([]);
    const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
    const [isGoogleLoginLoading, setIsGoogleLoginLoading] = useState(false);

    useEffect(() => {
        axiosClient.get('/courses')
            .then((res) => {
                const data = res.data || res;
                setCourses(Array.isArray(data) ? data : []);
            })
            .catch(() => setCourses([]));

        axiosClient.get('/toeic/tests')
            .then((res) => {
                const data = res.data || res;
                setTests(Array.isArray(data) ? data : []);
            })
            .catch(() => setTests([]));
    }, []);

    useEffect(() => {
        document.body.classList.toggle('landing-google-modal-open', isGoogleModalOpen);

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsGoogleModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            document.body.classList.remove('landing-google-modal-open');
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isGoogleModalOpen]);

    const catalogSummary = useMemo(() => ({
        topics: courses.reduce((sum, course) => sum + Number(course.topic_count || 0), 0),
        words: courses.reduce((sum, course) => sum + Number(course.vocabulary_count || 0), 0),
        tests: tests.length,
    }), [courses, tests]);

    const courseCards = useMemo(() => (
        COURSE_CARDS.map((card, index) => {
            if (index !== 0) return card;
            return {
                ...card,
                tags: [
                    { label: 'TOEIC', color: 'blue' },
                    { label: `${catalogSummary.words || 600} từ`, color: 'blue' },
                    { label: `${catalogSummary.topics || 50} lessons`, color: 'blue' },
                ],
                desc: 'Bộ từ vựng TOEIC theo chủ đề, kết hợp bài học nền tảng và lộ trình luyện tập phù hợp cho người học tự ôn mỗi ngày.',
            };
        })
    ), [catalogSummary]);

    const isAuthenticated = Boolean(user?.token);
    const heroPrimaryLabel = isAuthenticated ? 'Vào dashboard' : 'Bắt đầu ngay';
    const heroSecondaryLabel = isAuthenticated ? 'Đăng xuất' : 'Đăng ký tài khoản';

    const handleHeroPrimary = () => {
        if (isAuthenticated) {
            navigate('/dashboard');
            return;
        }
        setIsGoogleModalOpen(true);
    };

    const handleHeroSecondary = async () => {
        if (isAuthenticated) {
            await logout();
            navigate('/');
        } else {
            navigate('/register');
        }
    };

    const closeGoogleModal = () => {
        setIsGoogleLoginLoading(false);
        setIsGoogleModalOpen(false);
    };

    const handleGoogleStart = async () => {
        setIsGoogleLoginLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/logined`,
                },
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            setIsGoogleLoginLoading(false);
        }
    };

    return (
        <>
            <header className="hero" id="hero-section">
                <div className="hero-left">
                    <div className="lp-eyebrow lp-eyebrow-blue"><span style={{ backgroundColor: 'var(--blue)', color: '#fff', borderRadius: '10px', padding: '2px 7px', fontSize: '12px', fontWeight: 'bold' }}>New</span> Học thử miễn phí ngay!</div>
                    <h1 className="be-vietnam-pro-extrabold">Học từ vựng và ôn luyện TOEIC hiệu quả cùng <span className="name-logo">VocabUp</span> ngay hôm nay!</h1>
                    <p>
                        Học từ vựng TOEIC theo chủ đề, kết hợp luyện tập kỹ năng và làm đề để duy trì nhịp học ổn định mỗi ngày.
                    </p>
                    <div className="hero-buttons">
                        <button type="button" className="btn btn-primary hero-btn" id="btn-get-started" onClick={handleHeroPrimary}>
                            {heroPrimaryLabel}
                        </button>
                        <button type="button" className="btn btn-secondary hero-btn" onClick={handleHeroSecondary}>
                            {heroSecondaryLabel}
                        </button>
                    </div>
                </div>
                {isGoogleModalOpen ? (
                    <div className="lp-google-modal-overlay" role="presentation" onClick={closeGoogleModal}>
                        <div
                            className="lp-google-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="lp-google-modal-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="lp-google-modal-close"
                                onClick={closeGoogleModal}
                                aria-label="Đóng"
                            >
                                ×
                            </button>

                            <div className="lp-google-modal-header">
                                <h2 className="lp-google-modal-title" id="lp-google-modal-title">
                                    Đăng nhập nhanh
                                </h2>
                                <p className="lp-google-modal-copy">
                                    Dùng tài khoản Google để vào hệ thống ngay, không cần nhập thêm mật khẩu.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn-google btn-lg btn-block lp-google-modal-btn"
                                onClick={handleGoogleStart}
                                disabled={isGoogleLoginLoading}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                                </svg>
                                {isGoogleLoginLoading ? 'Đang chuyển hướng...' : 'Bắt đầu ngay với Google'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </header>

            <section className="lp-section lp-features" id="gioi-thieu">
                <div className="lp-container">
                    <div className="lp-features-header lp-reveal">
                        <div className="lp-eyebrow lp-eyebrow-blue">
                            Giới thiệu tính năng
                        </div>
                        <h2 className="lp-heading be-vietnam-pro-extrabold">Các <span className="name-logo">tính năng</span> chính</h2>
                        <p className="lp-subheading">
                            Khám phá các trải nghiệm nổi bật: hỏi đáp cùng AI, học bằng nhiều chế độ, ôn luyện với kho TOEIC và vừa chơi vừa học qua các hoạt động tương tác.
                        </p>
                    </div>

                    <div className="lp-features-grid">
                        {FEATURES.map((feat, i) => (
                            <div
                                key={i}
                                className={`lp-feat-card lp-feat-card--${feat.tone} lp-reveal`}
                                style={{ transitionDelay: `${i * 80}ms` }}
                            >
                                <div className={`lp-feat-icon lp-feat-icon--${feat.tone}`}>
                                    {feat.icon}
                                </div>
                                <h3 className="lp-feat-title">{feat.title}</h3>
                                <p className="lp-feat-desc">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="lp-section lp-courses" id="tai-lieu">
                <div className="lp-container">
                    <div className="lp-courses-layout">
                        <div className="lp-courses-text lp-reveal">
                            <div>
                                <div className="lp-eyebrow lp-eyebrow-blue">
                                    Danh sách tài liệu
                                </div>
                                <h2 className="lp-heading be-vietnam-pro-extrabold">Xây dựng vốn từ, học đâu nhớ đó cùng <span className="name-logo">VocabUp.</span></h2>
                                <p className="lp-subheading">
                                    Thư viện học tập được tổ chức theo chủ đề rõ ràng, giúp bạn ôn từ vựng và luyện đề trong cùng một lộ trình học liền mạch.
                                </p>
                            </div>

                            <div className="lp-courses-cta">
                                <Link to="/dashboard/courses" className="lp-btn lp-btn--primary lp-cta-btn">
                                    Xem tài liệu
                                </Link>
                                <Link to="/dashboard/courses?tab=custom" className="lp-btn lp-btn--secondary lp-cta-btn">
                                    Bộ từ cá nhân
                                </Link>
                            </div>

                            <p
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--gray-light)',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                {SVGS[3].svg} Bạn có thể học thử ngay mà không cần đăng nhập!
                            </p>
                        </div>

                        <div className="lp-courses-cards">
                            {courseCards.map((card, i) => (
                                <CourseCard key={i} {...card} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="lp-section lp-ai" id="chatbot-ai">
                <div className="lp-container">
                    <div className="lp-ai-shell">
                        <div className="lp-ai-copy lp-reveal">
                            <div className="lp-eyebrow lp-eyebrow-blue" style={{ width: 'fit-content' }}>
                                Hệ thống Chatbot AI
                            </div>
                            <h2 className="lp-heading be-vietnam-pro-extrabold">
                                <span className="name-logo">Trợ lý AI</span> giúp bạn tối ưu thời gian, học tập hiệu quả.
                            </h2>
                            <p className="lp-subheading">
                                Từ hỏi đáp từ vựng, ngữ pháp và phát âm đến tạo bộ từ theo chủ đề, trợ lý AI trong VocabUp được xây dựng để rút ngắn thời gian hiểu bài và biến việc ôn tập thành một luồng học liền mạch.
                            </p>

                            <div className="lp-ai-feature-list">
                                <article className="lp-ai-feature-row">
                                    <span className="lp-ai-feature-index">01</span>
                                    <div>
                                        <strong>Hỏi điều bạn cần ngay lập tức</strong>
                                        <p>Tra nghĩa từ, ngữ pháp, phát âm, cách dùng và ví dụ thực tế trong một cuộc hội thoại tự nhiên.</p>
                                    </div>
                                </article>
                                <article className="lp-ai-feature-row">
                                    <span className="lp-ai-feature-index">02</span>
                                    <div>
                                        <strong>Đào sâu từng từ vựng</strong>
                                        <p>Từ màn hình học từ vựng, bạn có thể hỏi AI chi tiết hơn để hiểu kỹ một từ trước khi ghi nhớ.</p>
                                    </div>
                                </article>
                                <article className="lp-ai-feature-row">
                                    <span className="lp-ai-feature-index">03</span>
                                    <div>
                                        <strong>Tạo nội dung học thật nhanh</strong>
                                        <p>Tạo nhanh bộ từ theo chủ đề với nghĩa, phiên âm và câu ví dụ để đưa thẳng vào quy trình học.</p>
                                    </div>
                                </article>
                            </div>
                        </div>

                        <div className="lp-ai-stage lp-reveal" style={{ transitionDelay: '90ms' }}>
                            <div className="lp-ai-workspace">
                                <div className="lp-ai-commandbar">
                                    <span className="lp-ai-command-label">AI hỗ trợ 24/7</span>
                                    <button
                                        type="button"
                                        className="lp-btn lp-btn--primary lp-ai-launch-btn"
                                        onClick={() => window.dispatchEvent(new CustomEvent('toggleFloatChat'))}
                                    >
                                        Thử ngay
                                    </button>
                                </div>

                                <div className="lp-ai-card lp-ai-card-chat">
                                    <div className="lp-ai-card-top">
                                        <span className="lp-ai-chip">Trợ lý trực tuyến</span>
                                        <span className="lp-ai-card-meta">Sẵn sàng hỗ trợ</span>
                                    </div>
                                    <div className="lp-ai-conversation">
                                        <div className="lp-ai-line lp-ai-line-user">
                                            Giải thích từ <strong>allocate</strong> thật dễ hiểu giúp mình.
                                        </div>
                                        <div className="lp-ai-line lp-ai-line-bot">
                                            <strong>allocate</strong> có nghĩa là phân bổ hoặc dành ra cho một mục đích cụ thể.
                                            Ví dụ: "We allocated more time to speaking practice."
                                        </div>
                                    </div>
                                </div>

                                <div className="lp-ai-grid">
                                    <article className="lp-ai-card lp-ai-card-mini">
                                        <span className="lp-ai-mini-label">Hỗ trợ theo từ</span>
                                        <strong>Hỏi AI ngay trong lúc học từ vựng</strong>
                                        <p>Xem giải thích sâu hơn cho từng từ mà không cần rời khỏi mạch học.</p>
                                    </article>
                                    <article className="lp-ai-card lp-ai-card-mini">
                                        <span className="lp-ai-mini-label">Tạo nhanh hàng loạt</span>
                                        <strong>Tạo bộ từ theo chủ đề chỉ trong vài giây</strong>
                                        <p>Tạo danh sách từ với nghĩa, phiên âm và ví dụ đi kèm.</p>
                                    </article>
                                    <article className="lp-ai-card lp-ai-card-wide">
                                        <span className="lp-ai-mini-label">Luồng học liền mạch</span>
                                        <strong>Tạo từ, lưu vào danh sách, rồi tiếp tục ôn bằng flashcard, quiz, listening và typing.</strong>
                                        <div className="lp-ai-tag-row">
                                            <span className="lp-ai-tag">Giải thích</span>
                                            <span className="lp-ai-tag">Sửa lỗi</span>
                                            <span className="lp-ai-tag">Tạo từ</span>
                                            <span className="lp-ai-tag">Luyện tập</span>
                                        </div>
                                    </article>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
