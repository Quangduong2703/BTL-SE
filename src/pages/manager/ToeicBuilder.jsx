import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import CustomModal from '../../components/customDocs/CustomModal';
import axiosClient from '../../utils/axiosClient';
import { resolveGuestToeicSeedTestId } from '../../utils/guestToeic';
import { normalizeErrorMessage } from '../../utils/normalizeErrorMessage';

const PAGE_SIZE = 10;

function createEmptyGroupForm() {
    return {
        part: 3,
        audioUrl: '',
        imageUrl: '',
        passageText: '',
    };
}

function createEmptyQuestionForm() {
    return {
        part: 1,
        groupId: '',
        questionNumber: '',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        explanation: '',
        audioUrl: '',
        imageUrl: '',
        audioSource: '',
        imageSource: '',
    };
}

function buildToastErrorMessage(err, fallback) {
    return normalizeErrorMessage(
        err.response?.data?.error || err.response?.data || err.message,
        fallback,
    );
}

function buildToastSuccessMessage(message) {
    return `Đã ${message}.`;
}

function GroupFormModal({ isOpen, mode, form, onChange, onClose, onSubmit, submitting }) {
    const isEdit = mode === 'edit';

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Chỉnh sửa nhóm câu hỏi' : 'Tạo nhóm câu hỏi'}>
            <div className="cv-modal-body manager-form-grid">
                <label className="manager-field">
                    <span>Part</span>
                    <select value={form.part} onChange={(event) => onChange('part', event.target.value)}>
                        {[1, 2, 3, 4, 5, 6, 7].map((part) => (
                            <option key={part} value={part}>Part {part}</option>
                        ))}
                    </select>
                </label>

                <label className="manager-field">
                    <span>Audio URL</span>
                    <input value={form.audioUrl} onChange={(event) => onChange('audioUrl', event.target.value)} placeholder="https://..." />
                </label>

                <label className="manager-field">
                    <span>Image URL</span>
                    <input value={form.imageUrl} onChange={(event) => onChange('imageUrl', event.target.value)} placeholder="https://..." />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Passage / Transcript</span>
                    <textarea
                        rows="6"
                        value={form.passageText}
                        onChange={(event) => onChange('passageText', event.target.value)}
                        placeholder="Nội dung đoạn văn hoặc transcript dùng chung cho nhóm"
                    />
                </label>
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" type="button" onClick={onClose}>Hủy</button>
                <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật nhóm' : 'Tạo nhóm'}
                </button>
            </div>
        </CustomModal>
    );
}

function QuestionFormModal({ isOpen, mode, form, groups, onChange, onClose, onSubmit, submitting }) {
    const isEdit = mode === 'edit';

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Chỉnh sửa câu hỏi TOEIC' : 'Tạo câu hỏi TOEIC'}>
            <div className="cv-modal-body manager-form-grid">
                <label className="manager-field">
                    <span>Part</span>
                    <select value={form.part} onChange={(event) => onChange('part', event.target.value)}>
                        {[1, 2, 3, 4, 5, 6, 7].map((part) => (
                            <option key={part} value={part}>Part {part}</option>
                        ))}
                    </select>
                </label>

                {!isEdit ? (
                    <label className="manager-field">
                        <span>Nhóm câu hỏi</span>
                        <select value={form.groupId} onChange={(event) => onChange('groupId', event.target.value)}>
                            <option value="">Không thuộc nhóm</option>
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    Group #{group.id} - Part {group.part}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                {!isEdit ? (
                    <label className="manager-field">
                        <span>Số câu</span>
                        <input type="number" min="1" value={form.questionNumber} onChange={(event) => onChange('questionNumber', event.target.value)} placeholder="1" />
                    </label>
                ) : null}

                <label className="manager-field">
                    <span>Đáp án đúng</span>
                    <select value={form.correctAnswer} onChange={(event) => onChange('correctAnswer', event.target.value)}>
                        {['A', 'B', 'C', 'D'].map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>

                <label className="manager-field manager-field-full">
                    <span>Nội dung câu hỏi</span>
                    <textarea rows="4" value={form.questionText} onChange={(event) => onChange('questionText', event.target.value)} placeholder="Nhập nội dung câu hỏi" />
                </label>

                {['A', 'B', 'C', 'D'].map((option) => (
                    <label key={option} className="manager-field">
                        <span>Đáp án {option}</span>
                        <input
                            value={form[`option${option}`]}
                            onChange={(event) => onChange(`option${option}`, event.target.value)}
                            placeholder={`Nội dung đáp án ${option}`}
                        />
                    </label>
                ))}

                <label className="manager-field">
                    <span>Audio URL</span>
                    <input value={form.audioUrl} onChange={(event) => onChange('audioUrl', event.target.value)} placeholder="https://..." />
                </label>

                <label className="manager-field">
                    <span>Image URL</span>
                    <input value={form.imageUrl} onChange={(event) => onChange('imageUrl', event.target.value)} placeholder="https://..." />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Giải thích đáp án</span>
                    <textarea rows="4" value={form.explanation} onChange={(event) => onChange('explanation', event.target.value)} placeholder="Nhập giải thích đáp án" />
                </label>
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" type="button" onClick={onClose}>Hủy</button>
                <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật câu hỏi' : 'Tạo câu hỏi'}
                </button>
            </div>
        </CustomModal>
    );
}

function buildQuestionPayload(form) {
    return {
        part: Number(form.part),
        groupId: form.groupId ? Number(form.groupId) : null,
        questionNumber: form.questionNumber ? Number(form.questionNumber) : '',
        questionText: form.questionText,
        options: {
            A: form.optionA,
            B: form.optionB,
            C: form.optionC,
            D: form.optionD,
        },
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
        audioUrl: form.audioUrl,
        imageUrl: form.imageUrl,
    };
}

function getQuestionMediaPreview(question, groups) {
    if (!question) {
        return {
            audioUrl: '',
            imageUrl: '',
            audioSource: '',
            imageSource: '',
            group: null,
        };
    }

    const relatedGroup = question.groupId
        ? groups.find((group) => String(group.id) === String(question.groupId))
        : null;

    return {
        audioUrl: question.audioUrl || relatedGroup?.audioUrl || '',
        imageUrl: question.imageUrl || relatedGroup?.imageUrl || '',
        audioSource: question.audioUrl ? 'câu hỏi' : relatedGroup?.audioUrl ? `Group #${relatedGroup.id}` : '',
        imageSource: question.imageUrl ? 'câu hỏi' : relatedGroup?.imageUrl ? `Group #${relatedGroup.id}` : '',
        group: relatedGroup || null,
    };
}

export default function ManagerToeicBuilder() {
    const { testId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [test, setTest] = useState(null);
    const [resolvedTestId, setResolvedTestId] = useState(testId);
    const [resolvingTestId, setResolvingTestId] = useState(false);
    const [groups, setGroups] = useState([]);
    const [questionsData, setQuestionsData] = useState({ items: [], meta: null, filters: null });
    const [searchInput, setSearchInput] = useState('');
    const deferredSearch = useDeferredValue(searchInput);
    const [search, setSearch] = useState('');
    const [partFilter, setPartFilter] = useState(searchParams.get('part') || '');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [groupModalMode, setGroupModalMode] = useState('');
    const [questionModalMode, setQuestionModalMode] = useState('');
    const [groupForm, setGroupForm] = useState(createEmptyGroupForm());
    const [questionForm, setQuestionForm] = useState(createEmptyQuestionForm());
    const [editingGroup, setEditingGroup] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedQuestionLoading, setSelectedQuestionLoading] = useState(false);
    const [autoEditHandled, setAutoEditHandled] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setSearch(deferredSearch.trim());
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [deferredSearch]);

    useEffect(() => {
        const part = searchParams.get('part') || '';
        const questionId = searchParams.get('question') || '';
        setPartFilter(part);
        if (!questionId) setSelectedQuestion(null);
        setAutoEditHandled(false);
    }, [searchParams]);

    useEffect(() => {
        let active = true;
        const trimmedTestId = String(testId || '').trim();
        const guestAliasMatch = trimmedTestId.match(/^guest-toeic-test-(\d+)$/i);

        setLoading(true);
        setError('');
        setResolvedTestId(trimmedTestId);
        setResolvingTestId(Boolean(guestAliasMatch));

        if (!guestAliasMatch) {
            return () => {
                active = false;
            };
        }

        axiosClient.get('/admin/toeic/tests?page=1&limit=1000')
            .then((data) => {
                if (!active) return;

                const apiTests = Array.isArray(data?.items) ? data.items : [];
                const resolvedId = resolveGuestToeicSeedTestId(trimmedTestId, apiTests);
                setResolvedTestId(resolvedId || trimmedTestId);
            })
            .catch(() => {
                if (!active) return;
                setResolvedTestId(trimmedTestId);
            })
            .finally(() => {
                if (active) setResolvingTestId(false);
            });

        return () => {
            active = false;
        };
    }, [testId]);

    const fetchBuilderData = async (nextPage = page, activeTestId = resolvedTestId) => {
        const params = new URLSearchParams();
        params.set('page', String(nextPage));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);
        if (partFilter) params.set('part', partFilter);
        const [testData, groupsData, questions] = await Promise.all([
            axiosClient.get(`/admin/toeic/tests/${activeTestId}`),
            axiosClient.get(`/admin/toeic/tests/${activeTestId}/groups`),
            axiosClient.get(`/admin/toeic/tests/${activeTestId}/questions?${params.toString()}`),
        ]);

        setTest(testData);
        setGroups(groupsData);
        setQuestionsData(questions);
    };

    useEffect(() => {
        let active = true;
        if (resolvingTestId) {
            return () => {
                active = false;
            };
        }

        setLoading(true);
        setError('');

            fetchBuilderData(page, resolvedTestId)
            .catch((err) => {
                if (!active) return;
                setError(buildToastErrorMessage(err, 'Không thể tải dữ liệu TOEIC builder.'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [testId, page, search, partFilter, resolvedTestId, resolvingTestId]);

    const questionItems = questionsData?.items || [];
    const meta = questionsData?.meta;
    const questionDetailId = searchParams.get('question') || '';

    useEffect(() => {
        if (!questionDetailId) return;

        const localMatch = questionItems.find((item) => String(item.id) === String(questionDetailId));
        if (localMatch) {
            setSelectedQuestion(localMatch);
            return;
        }

        let active = true;
        setSelectedQuestionLoading(true);

        axiosClient.get(`/admin/toeic/questions/${questionDetailId}`)
            .then((data) => {
                if (!active) return;
                setSelectedQuestion(data);
            })
            .catch(() => {
                if (!active) return;
                setSelectedQuestion(null);
            })
            .finally(() => {
                if (active) setSelectedQuestionLoading(false);
            });

        return () => {
            active = false;
        };
    }, [questionDetailId, questionItems]);

    useEffect(() => {
        const shouldAutoEdit = searchParams.get('edit') === '1';
        if (!shouldAutoEdit || !selectedQuestion || autoEditHandled) return;

        openEditQuestionModal(selectedQuestion);
        setAutoEditHandled(true);
    }, [selectedQuestion, autoEditHandled, searchParams]);

    const updateQueryState = ({ nextPart = partFilter, nextQuestion = '', nextEdit = '' }) => {
        const params = new URLSearchParams(searchParams);

        if (nextPart) params.set('part', String(nextPart));
        else params.delete('part');

        if (nextQuestion) params.set('question', String(nextQuestion));
        else params.delete('question');

        if (nextEdit) params.set('edit', String(nextEdit));
        else params.delete('edit');

        setSearchParams(params);
    };

    const openCreateGroupModal = () => {
        setEditingGroup(null);
        setGroupForm(createEmptyGroupForm());
        setGroupModalMode('create');
    };

    const openEditGroupModal = (group) => {
        setEditingGroup(group);
        setGroupForm({
            part: group.part,
            audioUrl: group.audioUrl || '',
            imageUrl: group.imageUrl || '',
            passageText: group.passageText || '',
        });
        setGroupModalMode('edit');
    };

    const closeGroupModal = () => {
        setGroupModalMode('');
        setEditingGroup(null);
        setGroupForm(createEmptyGroupForm());
    };

    const openCreateQuestionModal = () => {
        setEditingQuestion(null);
        setQuestionForm({
            ...createEmptyQuestionForm(),
            part: partFilter ? Number(partFilter) : 1,
        });
        setQuestionModalMode('create');
    };

    const openEditQuestionModal = (question) => {
        const mediaPreview = getQuestionMediaPreview(question, groups);
        setEditingQuestion(question);
        setQuestionForm({
            part: question.part,
            groupId: question.groupId || '',
            questionNumber: question.questionNumber,
            questionText: question.questionText || '',
            optionA: question.options?.A || '',
            optionB: question.options?.B || '',
            optionC: question.options?.C || '',
            optionD: question.options?.D || '',
            correctAnswer: question.correctAnswer || 'A',
            explanation: question.explanation || '',
            audioUrl: mediaPreview.audioUrl || '',
            imageUrl: mediaPreview.imageUrl || '',
            audioSource: mediaPreview.audioSource || '',
            imageSource: mediaPreview.imageSource || '',
        });
        setQuestionModalMode('edit');
    };

    const handleFocusQuestion = (question) => {
        setSelectedQuestion(question);
        updateQueryState({ nextPart: question.part, nextQuestion: question.id });
    };

    const handleOpenQuestionDetail = (question) => {
        handleFocusQuestion(question);
        setDetailModalOpen(true);
    };

    const handleOpenQuestionPreview = (question) => {
        handleFocusQuestion(question);
        setPreviewModalOpen(true);
    };

    const handleOpenQuestionEditor = (question) => {
        handleFocusQuestion(question);
        openEditQuestionModal(question);
    };

    const closeDetailModal = () => {
        setDetailModalOpen(false);
    };

    const closePreviewModal = () => {
        setPreviewModalOpen(false);
    };

    const closeQuestionModal = () => {
        setQuestionModalMode('');
        setEditingQuestion(null);
        setQuestionForm(createEmptyQuestionForm());
    };

    const handleSaveGroup = async () => {
        setSubmitting(true);
        try {
            if (groupModalMode === 'edit' && editingGroup) {
                await axiosClient.put(`/admin/toeic/groups/${editingGroup.id}`, groupForm);
                setToast({ message: buildToastSuccessMessage('cập nhật nhóm #' + editingGroup.id), type: 'success' });
            } else {
                await axiosClient.post(`/admin/toeic/tests/${resolvedTestId}/groups`, groupForm);
                setToast({ message: buildToastSuccessMessage('tạo nhóm câu hỏi mới'), type: 'success' });
            }
            closeGroupModal();
            await fetchBuilderData(page);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể lưu nhóm câu hỏi.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveQuestion = async () => {
        setSubmitting(true);
        try {
            const payload = buildQuestionPayload(questionForm);
            if (questionModalMode === 'edit' && editingQuestion) {
                await axiosClient.put(`/admin/toeic/questions/${editingQuestion.id}`, payload);
                setToast({ message: buildToastSuccessMessage('cập nhật câu hỏi #' + editingQuestion.questionNumber), type: 'success' });
            } else {
                await axiosClient.post(`/admin/toeic/tests/${resolvedTestId}/questions`, payload);
                setToast({ message: buildToastSuccessMessage('tạo câu hỏi TOEIC mới'), type: 'success' });
            }

            closeQuestionModal();
            await fetchBuilderData(page);

            if (editingQuestion) {
                const refreshed = await axiosClient.get(`/admin/toeic/questions/${editingQuestion.id}`);
                setSelectedQuestion(refreshed);
                updateQueryState({ nextQuestion: editingQuestion.id });
            }
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể lưu câu hỏi TOEIC.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePending = async () => {
        if (!pendingDelete) return;

        setSubmitting(true);
        try {
            if (pendingDelete.type === 'group') {
                await axiosClient.delete(`/admin/toeic/groups/${pendingDelete.item.id}`);
                setToast({ message: buildToastSuccessMessage('xóa nhóm #' + pendingDelete.item.id), type: 'success' });
            } else {
                await axiosClient.delete(`/admin/toeic/questions/${pendingDelete.item.id}`);
                setToast({ message: buildToastSuccessMessage('xóa câu hỏi #' + pendingDelete.item.questionNumber), type: 'success' });
                if (String(selectedQuestion?.id) === String(pendingDelete.item.id)) {
                    setSelectedQuestion(null);
                }
            }

            setPendingDelete(null);
            await fetchBuilderData(page);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể xóa dữ liệu TOEIC.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const groupSummary = useMemo(() => {
        if (!groups.length) return 'Chua co nhom cau hoi';
        return `${groups.length} nhom cau hoi`;
    }, [groups]);

    const questionsByPart = useMemo(() => {
        const next = {};
        questionItems.forEach((question) => {
            if (!next[question.part]) next[question.part] = [];
            next[question.part].push(question);
        });
        return next;
    }, [questionItems]);

    const selectedQuestionMedia = useMemo(
        () => getQuestionMediaPreview(selectedQuestion, groups),
        [selectedQuestion, groups],
    );

    return (
        <main className="manager-page">
            <section className="manager-panel">
                <div className="manager-panel-head manager-panel-head-wrap">
                    <div>
                        <h3>Câu hỏi TOEIC</h3>
                        <p className="manager-muted-text">Xem toàn bộ danh sách câu hỏi trong từng part, mở chi tiết từng câu và chỉnh sửa trực tiếp nếu cần.</p>
                    </div>
                    <div className="manager-topbar-actions">
                        <span className="manager-chip">{loading ? 'Đang tải' : `${questionsData?.meta?.total || 0} câu hỏi`}</span>
                        <Link to="/manager/toeic" className="manager-secondary-btn manager-inline-button">Quay lại danh sách đề</Link>
                        <button type="button" className="manager-primary-btn" onClick={openCreateQuestionModal}>Tạo câu hỏi</button>
                    </div>
                </div>

                {error ? <p className="manager-error-text">{error}</p> : null}


                <div className="manager-segmented manager-toeic-part-tabs">
                    <button
                        type="button"
                        className={`manager-segmented-btn ${partFilter === '' ? 'active' : ''}`}
                        onClick={() => {
                            setPartFilter('');
                            setPage(1);
                            updateQueryState({ nextPart: '', nextQuestion: '' });
                        }}
                    >
                        Tất cả
                    </button>
                    {[1, 2, 3, 4, 5, 6, 7].map((part) => (
                        <button
                            key={part}
                            type="button"
                            className={`manager-segmented-btn ${String(partFilter) === String(part) ? 'active' : ''}`}
                            onClick={() => {
                                setPartFilter(String(part));
                                setPage(1);
                                updateQueryState({ nextPart: part, nextQuestion: '' });
                            }}
                        >
                            Part {part}
                        </button>
                    ))}
                </div>

                <div className="manager-toolbar">
                    <label className="manager-field manager-field-grow">
                        <span>Tìm kiếm</span>
                        <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo nội dung câu hỏi" />
                    </label>

                    <label className="manager-field">
                        <span>Part</span>
                        <select value={partFilter} onChange={(event) => { setPartFilter(event.target.value); setPage(1); updateQueryState({ nextPart: event.target.value, nextQuestion: '' }); }}>
                            <option value="">Tất cả part</option>
                            {[1, 2, 3, 4, 5, 6, 7].map((part) => (
                                <option key={part} value={part}>Part {part}</option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        className="manager-secondary-btn"
                        onClick={() => {
                            setSearchInput('');
                            setSearch('');
                            setPartFilter('');
                            setPage(1);
                            updateQueryState({ nextPart: '', nextQuestion: '' });
                        }}
                    >
                        Đặt lại
                    </button>
                </div>


                <div className="manager-table-shell">
                    <table className="manager-table manager-toeic-question-table">
                        <colgroup>
                            <col className="manager-toeic-col-question-number" />
                            <col className="manager-toeic-col-part" />
                            <col className="manager-toeic-col-content" />
                            <col className="manager-toeic-col-answer" />
                            <col className="manager-toeic-col-actions" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Câu</th>
                                <th>Part</th>
                                <th>Nội dung</th>
                                <th>Đáp án đúng</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`toeic-question-skeleton-${index}`}>
                                        <td colSpan="5"><div className="manager-table-loading-row">Đang tải danh sách câu hỏi...</div></td>
                                    </tr>
                                ))
                            ) : null}

                            {!loading && !questionItems.length ? (
                                <tr>
                                    <td colSpan="5"><div className="manager-table-empty">Chưa có câu hỏi nào khớp với bộ lọc hiện tại.</div></td>
                                </tr>
                            ) : null}

                            {!loading && questionItems.map((question) => (
                                <tr
                                    key={question.id}
                                    className={`manager-clickable-row ${String(selectedQuestion?.id) === String(question.id) ? 'is-selected' : ''}`}
                                    onClick={() => handleOpenQuestionEditor(question)}
                                >
                                    <td>#{question.questionNumber}</td>
                                    <td>Part {question.part}</td>
                                    <td>
                                        <div className="manager-table-primary">{question.questionText || 'Câu hỏi không có nội dung text'}</div>
                                        <div className="manager-table-secondary">
                                            A. {question.options?.A} | B. {question.options?.B} | C. {question.options?.C} | D. {question.options?.D}
                                        </div>
                                    </td>
                                    <td><span className="manager-table-pill is-accent">{question.correctAnswer}</span></td>
                                    <td>
                                        <div className="manager-table-actions manager-toeic-question-actions">
                                            <button
                                                type="button"
                                                className="manager-table-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenQuestionPreview(question);
                                                }}
                                            >
                                                Preview
                                            </button>
                                            <button
                                                type="button"
                                                className="manager-table-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenQuestionDetail(question);
                                                }}
                                            >
                                                Chi tiết
                                            </button>
                                            <button
                                                type="button"
                                                className="manager-table-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenQuestionEditor(question);
                                                }}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                className="manager-table-action is-danger"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setPendingDelete({ type: 'question', item: question });
                                                }}
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
                    <button type="button" className="manager-secondary-btn" disabled={!meta || meta.page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                        Trước
                    </button>
                    <span className="manager-pagination-status">Trang {meta?.page || 1} / {meta?.totalPages || 1}</span>
                    <button type="button" className="manager-secondary-btn" disabled={!meta || meta.page >= meta.totalPages || loading || !meta?.totalPages} onClick={() => setPage((current) => current + 1)}>
                        Sau
                    </button>
                </div>

            </section>


            <GroupFormModal
                isOpen={groupModalMode === 'create' || groupModalMode === 'edit'}
                mode={groupModalMode}
                form={groupForm}
                onChange={(field, value) => setGroupForm((current) => ({ ...current, [field]: value }))}
                onClose={closeGroupModal}
                onSubmit={handleSaveGroup}
                submitting={submitting}
            />

            <QuestionFormModal
                isOpen={questionModalMode === 'create' || questionModalMode === 'edit'}
                mode={questionModalMode}
                form={questionForm}
                groups={groups}
                onChange={(field, value) => setQuestionForm((current) => ({ ...current, [field]: value }))}
                onClose={closeQuestionModal}
                onSubmit={handleSaveQuestion}
                submitting={submitting}
            />

            <CustomModal
                isOpen={previewModalOpen}
                onClose={closePreviewModal}
                title={selectedQuestionLoading ? 'Preview câu hỏi' : `Preview câu #${selectedQuestion?.questionNumber || ''} - Part ${selectedQuestion?.part || ''}`}
                boxClassName="manager-preview-modal-box"
            >
                <div className="cv-modal-body">
                    {selectedQuestionLoading ? (
                        <div className="manager-table-loading-row">Đang tải preview...</div>
                    ) : selectedQuestion ? (
                        <div className="manager-detail-modal-content">
                            <div className="manager-preview-layout">
                                <div className="manager-media-preview-card manager-preview-summary-card">
                                    <span>Preview câu hỏi</span>
                                    <div className="manager-kv-list manager-kv-list-single">
                                        <div>
                                            <span>Nội dung câu hỏi</span>
                                            <strong>{selectedQuestion.questionText || 'Chưa có nội dung câu hỏi.'}</strong>
                                        </div>
                                        <div>
                                            <span>Đáp án</span>
                                            <strong className="manager-inline-answer-list">
                                                <span>{selectedQuestion.options?.A || '--'}</span>
                                                <span>{selectedQuestion.options?.B || '--'}</span>
                                                <span>{selectedQuestion.options?.C || '--'}</span>
                                                <span>{selectedQuestion.options?.D || '--'}</span>
                                            </strong>
                                        </div>
                                        <div>
                                            <strong>{`Đáp án đúng: ${selectedQuestion.correctAnswer || '--'}`}</strong>
                                        </div>
                                        {selectedQuestion.explanation ? (
                                            <div>
                                                <span>Giải thích đáp án</span>
                                                <strong>{selectedQuestion.explanation}</strong>
                                            </div>
                                        ) : null}
                                        {selectedQuestionMedia.group?.passageText ? (
                                            <div>
                                                <span>Passage / Transcript tu group</span>
                                                <strong>{selectedQuestionMedia.group.passageText}</strong>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="manager-preview-media-column">
                                    <div className="manager-media-preview-card">
                                        <span>Preview hình ảnh</span>
                                        {selectedQuestionMedia.imageUrl ? (
                                            <>
                                                <img src={selectedQuestionMedia.imageUrl} alt={`Preview cau ${selectedQuestion.questionNumber}`} />
                                            </>
                                        ) : (
                                            <p className="manager-muted-text">Câu hỏi này chưa có hình riêng hoặc hình dùng chung từ group.</p>
                                        )}
                                    </div>

                                    <div className="manager-media-preview-card">
                                        <span>Preview audio</span>
                                        {selectedQuestionMedia.audioUrl ? (
                                            <>
                                                <audio controls preload="none" src={selectedQuestionMedia.audioUrl}>
                                                    Trình duyệt không hỗ trợ phát audio.
                                                </audio>
                                            </>
                                        ) : (
                                            <p className="manager-muted-text">Câu hỏi này chưa có audio riêng hoặc audio dùng chung từ group.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="manager-table-empty">Chưa có dữ liệu preview cho câu hỏi này.</div>
                    )}
                </div>
                <div className="cv-modal-footer cv-modal-footer-split">
                    <button className="btn btn-secondary" type="button" onClick={closePreviewModal}>Đóng</button>
                    {selectedQuestion ? (
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => {
                                closePreviewModal();
                                openEditQuestionModal(selectedQuestion);
                            }}
                        >
                            Sửa câu hỏi này
                        </button>
                    ) : null}
                </div>
            </CustomModal>

            <CustomModal
                isOpen={detailModalOpen}
                onClose={closeDetailModal}
                title={selectedQuestionLoading ? 'Chi tiết câu hỏi' : `Câu #${selectedQuestion?.questionNumber || ''} - Part ${selectedQuestion?.part || ''}`}
            >
                <div className="cv-modal-body">
                    {selectedQuestionLoading ? (
                        <div className="manager-table-loading-row">Đang tải chi tiết...</div>
                    ) : selectedQuestion ? (
                        <div className="manager-detail-modal-content">
                            <div className="manager-kv-list manager-kv-list-single">
                                <div>
                                    <span>Nội dung câu hỏi</span>
                                    <strong>{selectedQuestion.questionText || 'Chưa có nội dung câu hỏi.'}</strong>
                                </div>
                                <div>
                                    <span>Đáp án A</span>
                                    <strong>{selectedQuestion.options?.A}</strong>
                                </div>
                                <div>
                                    <span>Đáp án B</span>
                                    <strong>{selectedQuestion.options?.B}</strong>
                                </div>
                                <div>
                                    <span>Đáp án C</span>
                                    <strong>{selectedQuestion.options?.C}</strong>
                                </div>
                                <div>
                                    <span>Đáp án D</span>
                                    <strong>{selectedQuestion.options?.D}</strong>
                                </div>
                                <div>
                                    <span>Đáp án đúng</span>
                                    <strong>{selectedQuestion.correctAnswer}</strong>
                                </div>
                                <div>
                                    <span>Nhóm câu hỏi</span>
                                    <strong>{selectedQuestion.groupId ? `Group #${selectedQuestion.groupId}` : 'Không thuộc nhóm'}</strong>
                                </div>
                                <div>
                                    <span>Audio URL</span>
                                    <strong>{selectedQuestion.audioUrl || 'Không có audio riêng'}</strong>
                                </div>
                                <div>
                                    <span>Image URL</span>
                                    <strong>{selectedQuestion.imageUrl || 'Không có hình riêng'}</strong>
                                </div>
                                <div>
                                    <span>Giải thích đáp án</span>
                                    <strong>{selectedQuestion.explanation || 'Chua co giai thich dap an.'}</strong>
                                </div>
                                {selectedQuestionMedia.group?.passageText ? (
                                    <div>
                                        <span>Passage / Transcript từ group</span>
                                        <strong>{selectedQuestionMedia.group.passageText}</strong>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="manager-table-empty">Chưa có dữ liệu chi tiết cho câu hỏi này.</div>
                    )}
                </div>
                <div className="cv-modal-footer cv-modal-footer-split">
                    <button className="btn btn-secondary" type="button" onClick={closeDetailModal}>Đóng</button>
                    {selectedQuestion ? (
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => {
                                closeDetailModal();
                                openEditQuestionModal(selectedQuestion);
                            }}
                        >
                            Sửa câu hỏi này
                        </button>
                    ) : null}
                </div>
            </CustomModal>

            <ConfirmActionModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDeletePending}
                title={pendingDelete?.type === 'group' ? 'Xóa nhóm câu hỏi này?' : 'Xóa câu hỏi này?'}
                message={pendingDelete?.type === 'group'
                    ? `Group #${pendingDelete?.item?.id} và các câu hỏi thuộc group này sẽ bị xóa.`
                    : `Câu hỏi #${pendingDelete?.item?.questionNumber} sẽ bị xóa khỏi đề.`}
                confirmLabel={submitting ? 'Đang xóa...' : 'Xóa'}
                cancelLabel="Hủy"
            />

            {toast.message ? (
                <ToastNotice message={toast.message} type={toast.type} onHide={() => setToast({ message: '', type: 'error' })} />
            ) : null}
        </main>
    );
}
