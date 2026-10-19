import { useDeferredValue, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import CustomModal from '../../components/customDocs/CustomModal';
import axiosClient from '../../utils/axiosClient';
import { normalizeErrorMessage } from '../../utils/normalizeErrorMessage';

const PAGE_SIZE = 10;

function createEmptyTopicForm() {
    return {
        title: '',
        slug: '',
        description: '',
    };
}

function createEmptyWordForm() {
    return {
        word: '',
        transcription: '',
        meaning: '',
        wordType: '',
        example: '',
        exampleVi: '',
        language: 'en',
    };
}

function buildToastErrorMessage(err, fallback) {
    return normalizeErrorMessage(
        err.response?.data?.error || err.response?.data || err.message,
        fallback,
    );
}

function buildToastSuccessMessage(action, entity, value) {
    const label = value?.trim() ? ` "${value.trim()}"` : '';
    return `Đã ${action} ${entity}${label}.`;
}

function TopicFormModal({ isOpen, mode, form, onChange, onClose, onSubmit, submitting }) {
    const isEdit = mode === 'edit';

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Chỉnh sửa chủ đề' : 'Tạo chủ đề'}>
            <div className="cv-modal-body manager-form-grid">
                <label className="manager-field">
                    <span>Tên chủ đề</span>
                    <input
                        value={form.title}
                        onChange={(event) => onChange('title', event.target.value)}
                        placeholder="Lesson 1: Contracts"
                    />
                </label>

                <label className="manager-field">
                    <span>Slug</span>
                    <input
                        value={form.slug}
                        onChange={(event) => onChange('slug', event.target.value)}
                        placeholder="toeic-contract"
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Mô tả</span>
                    <textarea
                        rows="4"
                        value={form.description}
                        onChange={(event) => onChange('description', event.target.value)}
                        placeholder="Mô tả ngắn về chủ đề"
                    />
                </label>
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" type="button" onClick={onClose}>
                    Hủy
                </button>
                <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật chủ đề' : 'Tạo chủ đề'}
                </button>
            </div>
        </CustomModal>
    );
}

function WordFormModal({ isOpen, mode, form, onChange, onClose, onSubmit, submitting, topicTitle }) {
    const isEdit = mode === 'edit';

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng'}>
            <div className="cv-modal-body manager-form-grid">
                <label className="manager-field">
                    <span>Từ</span>
                    <input
                        value={form.word}
                        onChange={(event) => onChange('word', event.target.value)}
                        placeholder="contract"
                    />
                </label>

                <label className="manager-field">
                    <span>Loại từ</span>
                    <input
                        value={form.wordType}
                        onChange={(event) => onChange('wordType', event.target.value)}
                        placeholder="n."
                    />
                </label>

                <label className="manager-field">
                    <span>Phiên âm</span>
                    <input
                        value={form.transcription}
                        onChange={(event) => onChange('transcription', event.target.value)}
                        placeholder="/'kɒntrækt/"
                    />
                </label>

                <label className="manager-field">
                    <span>Ngôn ngữ</span>
                    <input
                        value={form.language}
                        onChange={(event) => onChange('language', event.target.value)}
                        placeholder="en"
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Nghĩa</span>
                    <input
                        value={form.meaning}
                        onChange={(event) => onChange('meaning', event.target.value)}
                        placeholder="hợp đồng"
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Ví dụ</span>
                    <textarea
                        rows="3"
                        value={form.example}
                        onChange={(event) => onChange('example', event.target.value)}
                        placeholder="They signed a contract yesterday."
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Ví dụ nghĩa Việt</span>
                    <textarea
                        rows="3"
                        value={form.exampleVi}
                        onChange={(event) => onChange('exampleVi', event.target.value)}
                        placeholder="Họ đã ký một hợp đồng vào hôm qua."
                    />
                </label>
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <div className="manager-table-note">{topicTitle ? `Chủ đề: ${topicTitle}` : ''}</div>
                <div className="manager-table-actions">
                    <button className="btn btn-secondary" type="button" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
                        {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật từ' : 'Thêm từ'}
                    </button>
                </div>
            </div>
        </CustomModal>
    );
}

export default function ManagerTopics() {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const deferredSearch = useDeferredValue(searchInput);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [topicsData, setTopicsData] = useState({ items: [], meta: null, filters: null });
    const [loading, setLoading] = useState(true);
    const [courseError, setCourseError] = useState('');
    const [topicsError, setTopicsError] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [modalMode, setModalMode] = useState('');
    const [form, setForm] = useState(createEmptyTopicForm());
    const [editingTopic, setEditingTopic] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [viewingWordsTopic, setViewingWordsTopic] = useState(null);
    const [flashcardsByTopic, setFlashcardsByTopic] = useState({});
    const [flashcardsErrorByTopic, setFlashcardsErrorByTopic] = useState({});
    const [flashcardsLoadingTopicId, setFlashcardsLoadingTopicId] = useState(null);
    const [wordModalMode, setWordModalMode] = useState('');
    const [wordForm, setWordForm] = useState(createEmptyWordForm());
    const [activeWordTopic, setActiveWordTopic] = useState(null);
    const [editingWord, setEditingWord] = useState(null);
    const [pendingWordDelete, setPendingWordDelete] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setSearch(deferredSearch.trim());
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [deferredSearch]);

    useEffect(() => {
        let active = true;

        axiosClient.get(`/admin/courses/${courseId}`)
            .then((data) => {
                if (!active) return;
                setCourse(data);
                setCourseError('');
            })
            .catch((err) => {
                if (!active) return;
                setCourse(null);
                setCourseError(buildToastErrorMessage(err, 'Không thể tải thông tin khóa học.'));
            });

        return () => {
            active = false;
        };
    }, [courseId]);

    useEffect(() => {
        let active = true;
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);

        setLoading(true);
        setTopicsError('');

        axiosClient.get(`/admin/courses/${courseId}/topics?${params.toString()}`)
            .then((data) => {
                if (!active) return;
                setTopicsData(data);
            })
            .catch((err) => {
                if (!active) return;
                setTopicsData({ items: [], meta: null, filters: null });
                setTopicsError(buildToastErrorMessage(err, 'Không thể tải danh sách chủ đề.'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [courseId, page, search]);

    const items = topicsData?.items || [];
    const meta = topicsData?.meta;
    const error = courseError || topicsError;

    useEffect(() => {
        if (!loading && meta?.totalPages > 0 && page > meta.totalPages) {
            setPage(meta.totalPages);
        }
    }, [loading, meta?.totalPages, page]);

    const closeForm = () => {
        setModalMode('');
        setEditingTopic(null);
        setForm(createEmptyTopicForm());
    };

    const openCreateModal = () => {
        setEditingTopic(null);
        setForm(createEmptyTopicForm());
        setModalMode('create');
    };

    const openEditModal = (topic) => {
        setEditingTopic(topic);
        setForm({
            title: topic.title || '',
            slug: topic.slug || '',
            description: topic.description || '',
        });
        setModalMode('edit');
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updateWordForm = (field, value) => {
        setWordForm((current) => ({ ...current, [field]: value }));
    };

    const syncTopicVocabularyCount = (topicId, nextCount) => {
        setTopicsData((current) => ({
            ...current,
            items: (current.items || []).map((item) => (
                Number(item.id) === Number(topicId)
                    ? { ...item, vocabularyCount: Number(nextCount) }
                    : item
            )),
        }));
    };

    const refetchTopics = async (nextPage = page) => {
        const params = new URLSearchParams();
        params.set('page', String(nextPage));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);

        const data = await axiosClient.get(`/admin/courses/${courseId}/topics?${params.toString()}`);
        setTopicsData(data);
    };

    const refetchFlashcards = async (topicId, { force = true } = {}) => {
        if (!force && flashcardsByTopic[topicId]) {
            return flashcardsByTopic[topicId];
        }

        setFlashcardsLoadingTopicId(topicId);
        setFlashcardsErrorByTopic((current) => ({
            ...current,
            [topicId]: '',
        }));

        try {
            const data = await axiosClient.get(`/admin/topics/${topicId}/flashcards`);
            const nextItems = data.items || [];
            setFlashcardsByTopic((current) => ({
                ...current,
                [topicId]: nextItems,
            }));
            syncTopicVocabularyCount(topicId, nextItems.length);
            return nextItems;
        } catch (err) {
            setFlashcardsErrorByTopic((current) => ({
                ...current,
                [topicId]: buildToastErrorMessage(err, 'Không thể tải danh sách từ vựng.'),
            }));
            return [];
        } finally {
            setFlashcardsLoadingTopicId((current) => (Number(current) === Number(topicId) ? null : current));
        }
    };

    const handleSubmitTopic = async () => {
        setSubmitting(true);

        try {
            if (modalMode === 'edit' && editingTopic) {
                await axiosClient.put(`/admin/topics/${editingTopic.id}`, form);
                setToast({ message: buildToastSuccessMessage('cập nhật', 'chủ đề', form.title), type: 'success' });
            } else {
                await axiosClient.post(`/admin/courses/${courseId}/topics`, form);
                setToast({ message: buildToastSuccessMessage('tạo', 'chủ đề', form.title), type: 'success' });
            }

            closeForm();
            setPage(1);
            await refetchTopics(modalMode === 'create' ? 1 : page);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể lưu chủ đề.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTopic = async () => {
        if (!pendingDelete?.id) return;

        setSubmitting(true);
        try {
            await axiosClient.delete(`/admin/topics/${pendingDelete.id}`);
            setToast({ message: buildToastSuccessMessage('xóa', 'chủ đề', pendingDelete.title), type: 'success' });
            setPendingDelete(null);
            const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
            if (nextPage !== page) {
                setPage(nextPage);
            }
            await refetchTopics(nextPage);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể xóa chủ đề.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const openCreateWordModal = (topic) => {
        setActiveWordTopic(topic);
        setEditingWord(null);
        setWordForm(createEmptyWordForm());
        setWordModalMode('create');
    };

    const openEditWordModal = (topic, word) => {
        setActiveWordTopic(topic);
        setEditingWord(word);
        setWordForm({
            word: word.word || '',
            transcription: word.transcription || '',
            meaning: word.meaning || '',
            wordType: word.wordType || '',
            example: word.example || '',
            exampleVi: word.exampleVi || '',
            language: word.language || 'en',
        });
        setWordModalMode('edit');
    };

    const closeWordModal = () => {
        setWordModalMode('');
        setWordForm(createEmptyWordForm());
        setActiveWordTopic(null);
        setEditingWord(null);
    };

    const toggleTopicWords = async (topic) => {
        setViewingWordsTopic(topic);
        await refetchFlashcards(topic.id, { force: !flashcardsByTopic[topic.id] });
    };

    const closeWordsModal = () => {
        setViewingWordsTopic(null);
    };

    const handleSubmitWord = async () => {
        if (!activeWordTopic?.id) return;

        setSubmitting(true);
        try {
            const targetTopicId = activeWordTopic.id;
            if (wordModalMode === 'edit' && editingWord) {
                await axiosClient.put(`/admin/flashcards/${editingWord.id}`, wordForm);
                setToast({ message: buildToastSuccessMessage('cập nhật', 'từ', wordForm.word), type: 'success' });
            } else {
                await axiosClient.post(`/admin/topics/${targetTopicId}/flashcards`, wordForm);
                setToast({ message: buildToastSuccessMessage('thêm', 'từ', wordForm.word), type: 'success' });
            }

            closeWordModal();
            await refetchFlashcards(targetTopicId, { force: true });
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể lưu từ vựng.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWord = async () => {
        if (!pendingWordDelete?.id || !activeWordTopic?.id) return;

        setSubmitting(true);
        try {
            const targetTopicId = activeWordTopic.id;
            await axiosClient.delete(`/admin/flashcards/${pendingWordDelete.id}`);
            setToast({ message: buildToastSuccessMessage('xóa', 'từ', pendingWordDelete.word), type: 'success' });
            setPendingWordDelete(null);
            await refetchFlashcards(targetTopicId, { force: true });
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể xóa từ vựng.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="manager-page">
            <section className="manager-panel">
                <div className="manager-panel-head manager-panel-head-wrap">
                    <div>
                        <h2>Chủ đề của {course?.title || `Khóa học #${courseId}`}</h2>
                        <p className="manager-muted-text">
                            Quản lý chủ đề con, slug và tổng số thẻ từ thuộc khóa học này.
                        </p>
                    </div>
                    <div className="manager-topbar-actions">
                        <Link to="/manager/courses" className="manager-secondary-btn manager-inline-button">
                            Quay lại khóa học
                        </Link>
                        <button type="button" className="manager-primary-btn" onClick={openCreateModal}>
                            Tạo chủ đề
                        </button>
                    </div>
                </div>

                <div className="manager-toolbar manager-toolbar-courses">
                    <label className="manager-field manager-field-grow">
                        <span>Tìm kiếm</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Tìm theo tên hoặc slug"
                        />
                    </label>
                    <button
                        type="button"
                        className="manager-secondary-btn"
                        onClick={() => {
                            setSearchInput('');
                            setSearch('');
                            setPage(1);
                        }}
                    >
                        Đặt lại
                    </button>
                </div>

                {error ? <p className="manager-error-text">{error}</p> : null}

                <div className="manager-table-shell">
                    <table className="manager-table">
                        <thead>
                            <tr>
                                <th>Tên chủ đề</th>
                                <th>Slug</th>
                                <th>Mô tả</th>
                                <th>Thẻ từ</th>
                                <th className="manager-topic-actions-col">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`topic-skeleton-${index}`}>
                                        <td colSpan="5">
                                            <div className="manager-table-loading-row">Đang tải danh sách chủ đề...</div>
                                        </td>
                                    </tr>
                                ))
                            ) : null}

                            {!loading && !items.length ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="manager-table-empty">Chưa có chủ đề nào khớp với bộ lọc hiện tại.</div>
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && items.map((topic) => (
                                <tr key={topic.id}>
                                    <td>
                                        <div className="manager-table-primary">{topic.title}</div>
                                    </td>
                                    <td>{topic.slug}</td>
                                    <td className="manager-topic-description">{topic.description || 'Chưa có mô tả.'}</td>
                                    <td>{topic.vocabularyCount}</td>
                                    <td className="manager-topic-actions-col">
                                        <div className="manager-table-actions">
                                            <button type="button" className="manager-table-action" onClick={() => toggleTopicWords(topic)}>
                                                Xem từ
                                            </button>
                                            <button type="button" className="manager-table-action" onClick={() => openEditModal(topic)}>
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                className="manager-table-action is-danger"
                                                onClick={() => setPendingDelete(topic)}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="manager-pagination">
                    <button
                        type="button"
                        className="manager-secondary-btn"
                        disabled={!meta || meta.page <= 1 || loading}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                        Trước
                    </button>
                    <span className="manager-pagination-status">
                        Trang {meta?.page || 1} / {meta?.totalPages || 1}
                    </span>
                    <button
                        type="button"
                        className="manager-secondary-btn"
                        disabled={!meta || meta.page >= meta.totalPages || loading || !meta?.totalPages}
                        onClick={() => setPage((current) => current + 1)}
                    >
                        Sau
                    </button>
                </div>
            </section>

            <TopicFormModal
                isOpen={modalMode === 'create' || modalMode === 'edit'}
                mode={modalMode}
                form={form}
                onChange={updateForm}
                onClose={closeForm}
                onSubmit={handleSubmitTopic}
                submitting={submitting}
            />

            <CustomModal
                isOpen={Boolean(viewingWordsTopic)}
                onClose={closeWordsModal}
                title={viewingWordsTopic ? `Từ vựng trong chủ đề ${viewingWordsTopic.title}` : 'Từ vựng trong chủ đề'}
                boxClassName="manager-words-modal-box"
            >
                <div className="cv-modal-body">
                    <div className="manager-topic-flashcards">
                        <div className="manager-panel-head manager-panel-head-wrap">
                            <div>
                                <p className="manager-muted-text">
                                    {viewingWordsTopic && Number(flashcardsLoadingTopicId) === Number(viewingWordsTopic.id)
                                        ? 'Đang tải danh sách từ...'
                                        : `${viewingWordsTopic ? (flashcardsByTopic[viewingWordsTopic.id] || []).length : 0} từ vựng trong chủ đề này`}
                                </p>
                            </div>
                            {viewingWordsTopic ? (
                                <button
                                    type="button"
                                    className="manager-secondary-btn"
                                    onClick={() => openCreateWordModal(viewingWordsTopic)}
                                >
                                    Thêm từ
                                </button>
                            ) : null}
                        </div>

                        {viewingWordsTopic && flashcardsErrorByTopic[viewingWordsTopic.id] ? (
                            <p className="manager-error-text">{flashcardsErrorByTopic[viewingWordsTopic.id]}</p>
                        ) : null}

                        {viewingWordsTopic && Number(flashcardsLoadingTopicId) === Number(viewingWordsTopic.id) ? (
                            <div className="manager-table-loading-row">Đang tải từ vựng...</div>
                        ) : null}

                        {viewingWordsTopic && Number(flashcardsLoadingTopicId) !== Number(viewingWordsTopic.id) && !(flashcardsByTopic[viewingWordsTopic.id] || []).length ? (
                            <div className="manager-table-empty">Chủ đề này chưa có từ vựng.</div>
                        ) : null}

                        {viewingWordsTopic && Number(flashcardsLoadingTopicId) !== Number(viewingWordsTopic.id) && (flashcardsByTopic[viewingWordsTopic.id] || []).length ? (
                            <div className="manager-table-shell manager-table-shell-nested">
                                <table className="manager-table">
                                    <thead>
                                        <tr>
                                            <th>Từ</th>
                                            <th>Nghĩa</th>
                                            <th>Loại từ</th>
                                            <th>Ví dụ</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(flashcardsByTopic[viewingWordsTopic.id] || []).map((word) => (
                                            <tr key={word.id}>
                                                <td>
                                                    <div className="manager-table-primary">{word.word}</div>
                                                    <div className="manager-table-secondary">{word.transcription || 'Chưa có phiên âm'}</div>
                                                </td>
                                                <td>{word.meaning}</td>
                                                <td>{word.wordType || 'Chưa có'}</td>
                                                <td className="manager-topic-description">
                                                    {word.example || word.exampleVi || 'Chưa có ví dụ.'}
                                                </td>
                                                <td>
                                                    <div className="manager-table-actions">
                                                        <button
                                                            type="button"
                                                            className="manager-table-action"
                                                            onClick={() => openEditWordModal(viewingWordsTopic, word)}
                                                        >
                                                            Sửa từ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="manager-table-action is-danger"
                                                            onClick={() => {
                                                                setActiveWordTopic(viewingWordsTopic);
                                                                setPendingWordDelete(word);
                                                            }}
                                                        >
                                                            Xóa từ
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="cv-modal-footer cv-modal-footer-split">
                    <button className="btn btn-secondary" type="button" onClick={closeWordsModal}>
                        Đóng
                    </button>
                </div>
            </CustomModal>

            <WordFormModal
                isOpen={wordModalMode === 'create' || wordModalMode === 'edit'}
                mode={wordModalMode}
                form={wordForm}
                onChange={updateWordForm}
                onClose={closeWordModal}
                onSubmit={handleSubmitWord}
                submitting={submitting}
                topicTitle={activeWordTopic?.title}
            />

            <ConfirmActionModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDeleteTopic}
                title="Xóa chủ đề này?"
                message={pendingDelete ? `Chủ đề "${pendingDelete.title}" và toàn bộ thẻ từ bên trong sẽ bị xóa.` : ''}
                confirmLabel={submitting ? 'Đang xóa...' : 'Xóa chủ đề'}
                cancelLabel="Hủy"
            />

            <ConfirmActionModal
                isOpen={Boolean(pendingWordDelete)}
                onClose={() => setPendingWordDelete(null)}
                onConfirm={handleDeleteWord}
                title="Xóa từ vựng này?"
                message={pendingWordDelete ? `Từ "${pendingWordDelete.word}" sẽ bị xóa khỏi chủ đề này.` : ''}
                confirmLabel={submitting ? 'Đang xóa...' : 'Xóa từ'}
                cancelLabel="Hủy"
            />

            {toast.message ? (
                <ToastNotice
                    message={toast.message}
                    type={toast.type}
                    onHide={() => setToast({ message: '', type: 'error' })}
                />
            ) : null}
        </main>
    );
}
