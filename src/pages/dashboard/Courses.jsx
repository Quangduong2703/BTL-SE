import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import TopicFormModal from '../../components/customDocs/TopicFormModal';
import { useAuth } from '../../contexts/useAuth';
import { mergeGuestReadyCourses } from '../../data/guestToeicCourses';
import axiosClient from '../../utils/axiosClient';
import { useCourseProgress } from '../../hooks/useCourseProgress';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import { languageLabels } from '../../utils/language';

const CUSTOM_TOPIC_EMOJIS = ['📘', '📗', '📙', '📕', '🗂️', '📝', '📚', '🧠', '🎯', '💡', '🚀', '🌟'];

function getCustomTopicEmoji(topic) {
    const source = `${topic?.id || ''}-${topic?.title || ''}`;
    const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0);
    return CUSTOM_TOPIC_EMOJIS[hash % CUSTOM_TOPIC_EMOJIS.length];
}

export default function Courses() {
    const { user } = useAuth();
    const location = useLocation();
    const [activeLang, setActiveLang] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('tab') === 'custom' ? 'custom' : 'english';
    });
    const [modalType, setModalType] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);
    const [topicForm, setTopicForm] = useState({ title: '', description: '', lang: 'en', sharedTopicId: '' });
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('error');
    const [isSavingTopic, setIsSavingTopic] = useState(false);
    const [pendingDeleteTopic, setPendingDeleteTopic] = useState(null);
    const { customCourses, loading: customCoursesLoading, preloadTopicDetail, createTopic, updateTopic, deleteTopic } = useCustomCourses();
    const { remembered } = useCourseProgress();

    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoadingCourses(true);

        axiosClient.get('/courses')
            .then((res) => {
                if (cancelled) return;
                const data = res.data || res;
                const nextCourses = Array.isArray(data) ? data : [];
                setCourses(mergeGuestReadyCourses(nextCourses));
            })
            .catch((err) => {
                console.error('Fetch courses error:', err);
                if (!cancelled) setCourses(mergeGuestReadyCourses([]));
            })
            .finally(() => {
                if (!cancelled) setLoadingCourses(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const builtInTopicCount = useMemo(
        () => courses.reduce((sum, course) => sum + Number(course.topic_count || 0), 0),
        [courses],
    );

    const builtInWordCount = useMemo(
        () => courses.reduce((sum, course) => sum + Number(course.vocabulary_count || 0), 0),
        [courses],
    );

    const englishDocCards = useMemo(() => (
        courses.map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description || 'Bộ tài liệu học tập',
            courseId: course.slug || course.id,
            topicCount: Number(course.topic_count || 0),
            vocabularyCount: Number(course.vocabulary_count || 0),
        }))
    ), [courses]);

    const getTopicProgress = (topic) => {
        if (!topic.words?.length) {
            return { pct: 0, done: 0, total: 0 };
        }

        const total = topic.words.length;
        const done = topic.words.filter((word) => remembered[word.id]).length;

        return {
            pct: Math.round((done / total) * 100),
            done,
            total,
        };
    };

    const handleOpenTopicForm = (topic = null) => {
        if (topic) {
            setEditingTopic(topic);
            setTopicForm({
                title: topic.title,
                description: topic.description,
                lang: topic.language || topic.lang || 'en',
                sharedTopicId: '',
            });
        } else {
            setEditingTopic(null);
            setTopicForm({ title: '', description: '', lang: 'en', sharedTopicId: '' });
        }

        setModalType('topic-form');
    };

    const handleSaveTopic = async () => {
        if (!topicForm.title.trim()) {
            setToastMessage('Vui lòng nhập tên chủ đề');
            setToastType('error');
            return;
        }

        setIsSavingTopic(true);
        try {
            const isCopyCreate = !editingTopic && Boolean(String(topicForm.sharedTopicId || '').trim());
            const result = editingTopic
                ? await updateTopic(editingTopic.id, topicForm)
                : await createTopic(topicForm);

            if (result?.error) {
                setToastMessage(result.error);
                setToastType('error');
                return;
            }

            const createdWordCount = Array.isArray(result?.words) ? result.words.length : 0;
            if (editingTopic) {
                setToastMessage(`Đã lưu thay đổi cho chủ đề "${topicForm.title.trim()}".`);
                setToastType('success');
            } else if (isCopyCreate) {
                setToastMessage(
                    createdWordCount > 0
                        ? `Đã sao chép ${createdWordCount} từ và tạo chủ đề riêng "${topicForm.title.trim()}".`
                        : `Đã tạo chủ đề riêng "${topicForm.title.trim()}".`,
                );
                setToastType('success');
            } else {
                setToastMessage(`Đã tạo chủ đề "${topicForm.title.trim()}".`);
                setToastType('success');
            }

            setModalType(null);
            setEditingTopic(null);
            setTopicForm({ title: '', description: '', lang: 'en', sharedTopicId: '' });
        } finally {
            setIsSavingTopic(false);
        }
    };

    const handleShareTopic = async (topic, event) => {
        event.stopPropagation();
        const shareCode = String(topic.id || '').trim();
        if (!shareCode) {
            setToastMessage('Không lấy được mã chia sẻ.');
            setToastType('error');
            return;
        }

        try {
            await navigator.clipboard.writeText(shareCode);
            setToastMessage(`Đã sao chép mã chia sẻ: ${shareCode}`);
            setToastType('success');
        } catch {
            window.prompt('Sao chép mã chia sẻ này và gửi cho người khác:', shareCode);
        }
    };

    const handleDeleteTopic = async (topicId) => {
        const result = await deleteTopic(topicId);
        if (result?.error) {
            setToastMessage(result.error);
            setToastType('error');
            return;
        }

        setPendingDeleteTopic(null);
        setToastMessage('Đã xóa chủ đề');
        setToastType('success');
    };

    const handlePreloadTopic = (topicId) => {
        void preloadTopicDetail(topicId);
    };

    return (
        <main className="dash-main courses-page" id="page-courses">
            <ToastNotice
                message={toastMessage}
                type={toastType}
                onHide={() => {
                    setToastMessage('');
                    setToastType('error');
                }}
            />
            <section className="courses-banner reveal">
                <div className="courses-banner-text">
                    <div className="welcome-eyebrow">Thư viện tài liệu</div>
                    <h1 className="welcome-title">Học từ vựng cùng VocabUp!</h1>
                    <p className="welcome-sub">
                        Thư viện học tập được sắp xếp theo chủ đề rõ ràng, giúp bạn học từ vựng
                        và luyện tập đều đặn mỗi ngày.
                    </p>
                </div>
                <div className="courses-banner-badges">
                    <div className="courses-stat-pill">
                        <span className="courses-stat-num">{builtInTopicCount}</span>
                        <span className="courses-stat-label">Chủ đề TOEIC</span>
                    </div>
                    <div className="courses-stat-pill">
                        <span className="courses-stat-num">{builtInWordCount}</span>
                        <span className="courses-stat-label">Từ vựng</span>
                    </div>
                </div>
            </section>

            <div className="lang-tabs-wrapper">
                <div className="lang-tabs">
                    <button className={`lang-tab-btn ${activeLang === 'english' ? 'active' : ''}`} onClick={() => setActiveLang('english')}>
                        <span className="lang-tab-name">Topic</span>
                    </button>

                    <button className={`lang-tab-btn ${activeLang === 'custom' ? 'active' : ''}`} onClick={() => setActiveLang('custom')}>
                        <span className="lang-tab-name">Cá nhân</span>
                    </button>
                </div>
            </div>

            {activeLang === 'english' && (
                <div className="lang-content" id="lang-english">
                    <div className="lang-content-header">
                        <div>
                            <div className="card-eyebrow">Topic</div>
                            <h2 className="card-title-text">Tài liệu học tập</h2>
                        </div>
                    </div>

                    {loadingCourses ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-text)' }}>
                            Đang tải danh sách khóa học...
                        </div>
                    ) : (
                        <div className="doc-list">
                            {englishDocCards.map((course, index) => (
                                <div className="doc-card reveal revealed" key={course.id}>
                                    <div className="doc-icon-wrap doc-icon-blue">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                            <path d="M5 4H15V8H19V20H5V4ZM3.9985 2C3.44749 2 3 2.44405 3 2.9918V21.0082C3 21.5447 3.44476 22 3.9934 22H20.0066C20.5551 22 21 21.5489 21 21.0082V7L15 2H3.9985ZM10.4999 7.5C10.4999 9.70914 8.70914 11.5 6.49999 11.5V13.5C9.81371 13.5 12.4999 10.8137 12.4999 7.5H10.4999ZM7.5 7.5H5.5C5.5 9.70914 7.29086 11.5 9.5 11.5V9.5C8.39543 9.5 7.5 8.60457 7.5 7.5Z" />
                                        </svg>
                                    </div>
                                    <div className="doc-info">
                                        <h3 className="doc-name">
                                            {index + 1}. {course.title}
                                        </h3>
                                        <p className="doc-desc">
                                            {course.description}
                                        </p>
                                    </div>
                                        <div className="doc-action">
                                            <Link
                                                to={`/dashboard/courses/${course.courseId}`}
                                                className="btn btn-primary btn-small"
                                                onMouseEnter={() => handlePreloadTopic(course.id)}
                                                onMouseDown={() => handlePreloadTopic(course.id)}
                                                onFocus={() => handlePreloadTopic(course.id)}
                                                onTouchStart={() => handlePreloadTopic(course.id)}
                                            >
                                                Học ngay
                                            </Link>
                                        </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeLang === 'custom' && (
                <div className="lang-content" id="lang-custom">
                    <div className="lang-content-header">
                        <div>
                            <div className="card-eyebrow">Của bạn</div>
                            <h2 className="card-title-text">Tài liệu cá nhân</h2>
                        </div>
                        <button className="btn btn-primary btn-small" id="cv-create-topic-btn" onClick={() => handleOpenTopicForm()}>
                            + Tạo chủ đề
                        </button>
                    </div>

                    <div className="doc-list" id="cv-custom-list">
                        {customCoursesLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-text)' }}>
                                Đang tải tài liệu cá nhân...
                            </div>
                        ) : customCourses.length === 0 ? (
                            <div
                                className="cv-empty-state reveal revealed"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <div className="cv-empty-icon"></div>
                                <h3 className="cv-empty-title" style={{ marginTop: '8px' }}>
                                    Chưa có chủ đề nào
                                </h3>
                                <button className="btn btn-primary btn-small" style={{ marginTop: '8px' }} onClick={() => handleOpenTopicForm()}>
                                    + Tạo chủ đề đầu tiên
                                </button>
                            </div>
                        ) : (
                            customCourses.map((topic) => {
                                const progress = getTopicProgress(topic);

                                return (
                                    <div className="doc-card cv-custom-card reveal revealed" key={topic.id}>
                                        <div className="doc-icon-wrap cv-custom-icon-wrap">
                                            <span className="cv-custom-card-emoji">{getCustomTopicEmoji(topic)}</span>
                                        </div>
                                        <div className="doc-info">
                                            <div className="doc-meta-row">
                                                <span className="doc-type-badge cv-custom-badge">Cá nhân</span>
                                                <span className="doc-level">
                                                    {languageLabels[topic.language || topic.lang] || 'Ngôn ngữ'} · {progress.total} từ
                                                </span>
                                            </div>
                                            <h3 className="doc-name">{topic.title}</h3>
                                            <p className="doc-desc">{topic.description || 'Chủ đề từ vựng cá nhân của bạn'}</p>
                                            <div className="cv-custom-card-progress">
                                                <div className="cv-custom-card-bar">
                                                    <div className="cv-custom-card-bar-fill" style={{ width: `${progress.pct}%` }}></div>
                                                </div>
                                                <span className="cv-custom-card-pct">
                                                    {progress.done}/{progress.total}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="cv-custom-card-actions">
                                            <Link
                                                to={`/dashboard/courses/custom/topic/${topic.id}`}
                                                className="btn btn-primary btn-small cv-cc-learn"
                                                onMouseEnter={() => handlePreloadTopic(topic.id)}
                                                onMouseDown={() => handlePreloadTopic(topic.id)}
                                                onFocus={() => handlePreloadTopic(topic.id)}
                                                onTouchStart={() => handlePreloadTopic(topic.id)}
                                            >
                                                Học ngay
                                            </Link>
                                            <div className="cv-icon-btns">
                                                <button
                                                    type="button"
                                                    className="cv-icon-btn cv-cc-share"
                                                    title="Chia sẻ bộ từ vựng"
                                                    onClick={(event) => handleShareTopic(topic, event)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="18" cy="5" r="3"></circle>
                                                        <circle cx="6" cy="12" r="3"></circle>
                                                        <circle cx="18" cy="19" r="3"></circle>
                                                        <path d="M8.59 13.51l6.83 3.98"></path>
                                                        <path d="M15.41 6.51L8.59 10.49"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cv-icon-btn cv-cc-edit"
                                                    title="Sửa chủ đề"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleOpenTopicForm(topic);
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cv-icon-btn cv-cc-delete"
                                                    title="Xóa chủ đề"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setPendingDeleteTopic(topic);
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <TopicFormModal
                isOpen={modalType === 'topic-form'}
                onClose={() => {
                    setModalType(null);
                    setEditingTopic(null);
                    setTopicForm({ title: '', description: '', lang: 'en', sharedTopicId: '' });
                    setToastMessage('');
                    setToastType('error');
                    setIsSavingTopic(false);
                }}
                onSave={handleSaveTopic}
                topicForm={topicForm}
                setTopicForm={setTopicForm}
                editingTopic={editingTopic}
                toastMessage={toastMessage}
                onToastHide={() => setToastMessage('')}
                isSaving={isSavingTopic}
            />
            <ConfirmActionModal
                isOpen={Boolean(pendingDeleteTopic)}
                onClose={() => setPendingDeleteTopic(null)}
                onConfirm={() => handleDeleteTopic(pendingDeleteTopic.id)}
                title="Xác nhận xóa chủ đề"
                message={pendingDeleteTopic ? `Bạn có chắc muốn xóa chủ đề "${pendingDeleteTopic.title}" không?` : ''}
                confirmLabel="Xóa chủ đề"
            />
        </main>
    );
}
