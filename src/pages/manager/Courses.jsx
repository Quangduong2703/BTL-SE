import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import FileFormatModal from '../../components/common/FileFormatModal';
import ToastNotice from '../../components/common/ToastNotice';
import CustomModal from '../../components/customDocs/CustomModal';
import { getGuestReadyCourseManagerFallbacks } from '../../data/guestToeicCourses';
import axiosClient from '../../utils/axiosClient';
import { normalizeErrorMessage } from '../../utils/normalizeErrorMessage';
import {
    downloadCourseExportFile,
    downloadCourseSampleFile,
    IMPORT_FILE_ACCEPT,
    parseCourseImportFile,
} from '../../utils/adminImportExport';

const PAGE_SIZE = 8;

function createEmptyCourseForm() {
    return {
        title: '',
        slug: '',
        description: '',
        thumbnailUrl: '',
        language: 'en',
    };
}

function buildToastErrorMessage(err, fallback) {
    return normalizeErrorMessage(
        err.response?.data?.error || err.response?.data || err.message,
        fallback,
    );
}

function buildToastSuccessMessage(action, target) {
    return `Đã ${action} ${target}.`;
}

function CourseFormModal({
    isOpen,
    mode,
    form,
    onChange,
    onClose,
    onSubmit,
    submitting,
}) {
    const isEdit = mode === 'edit';

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Chỉnh sửa khóa học' : 'Tạo khóa học'}>
            <div className="cv-modal-body manager-form-grid">
                <label className="manager-field">
                    <span>Tên khóa học</span>
                    <input
                        value={form.title}
                        onChange={(event) => onChange('title', event.target.value)}
                        placeholder="TOEIC Starter"
                    />
                </label>

                <label className={isEdit ? 'manager-field' : 'manager-field manager-field-full'}>
                    <span>Slug</span>
                    <input
                        value={form.slug}
                        onChange={(event) => onChange('slug', event.target.value)}
                        placeholder="toeic-starter"
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Mô tả</span>
                    <textarea
                        rows="4"
                        value={form.description}
                        onChange={(event) => onChange('description', event.target.value)}
                        placeholder="Mô tả ngắn về khóa học"
                    />
                </label>

                <label className="manager-field manager-field-full">
                    <span>Liên kết ảnh thumbnail</span>
                    <input
                        value={form.thumbnailUrl}
                        onChange={(event) => onChange('thumbnailUrl', event.target.value)}
                        placeholder="https://example.com/course-thumb.jpg"
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
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" type="button" onClick={onClose}>
                    Hủy
                </button>
                <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật khóa học' : 'Tạo khóa học'}
                </button>
            </div>
        </CustomModal>
    );
}

export default function ManagerCourses() {
    const [searchInput, setSearchInput] = useState('');
    const deferredSearch = useDeferredValue(searchInput);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [coursesData, setCoursesData] = useState({ items: [], meta: null, filters: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [modalMode, setModalMode] = useState('');
    const [form, setForm] = useState(createEmptyCourseForm());
    const [editingCourse, setEditingCourse] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [exportingCourseId, setExportingCourseId] = useState(null);
    const [importing, setImporting] = useState(false);
    const [downloadingSample, setDownloadingSample] = useState(false);
    const [exportTargetCourse, setExportTargetCourse] = useState(null);
    const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
    const importInputRef = useRef(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setSearch(deferredSearch.trim());
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [deferredSearch]);

    useEffect(() => {
        let active = true;
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);

        setLoading(true);
        setError('');

        axiosClient.get(`/admin/courses?${params.toString()}`)
            .then((data) => {
                if (!active) return;
                setCoursesData({
                    ...data,
                    items: data?.items?.length ? data.items : getGuestReadyCourseManagerFallbacks(),
                });
            })
            .catch((err) => {
                if (!active) return;
                setCoursesData({
                    items: getGuestReadyCourseManagerFallbacks(),
                    meta: null,
                    filters: null,
                });
                setError(
                    normalizeErrorMessage(
                        err.response?.data?.error || err.response?.data || err.message,
                        'Không tải được danh sách khóa học.',
                    ),
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [page, search]);

    const meta = coursesData?.meta;
    const items = coursesData?.items || [];

    useEffect(() => {
        if (!loading && meta?.totalPages > 0 && page > meta.totalPages) {
            setPage(meta.totalPages);
        }
    }, [loading, meta?.totalPages, page]);

    const closeForm = () => {
        setModalMode('');
        setEditingCourse(null);
        setForm(createEmptyCourseForm());
    };

    const openCreateModal = () => {
        setEditingCourse(null);
        setForm(createEmptyCourseForm());
        setModalMode('create');
    };

    const openEditModal = (course) => {
        if (course?.isCatalogFallback) {
            setToast({ message: 'Khóa học này đang là dữ liệu fallback, cần seed/sync vào DB trước khi chỉnh sửa.', type: 'error' });
            return;
        }

        setEditingCourse(course);
        setForm({
            title: course.title || '',
            slug: course.slug || '',
            description: course.description || '',
            thumbnailUrl: course.thumbnailUrl || '',
            language: course.language || 'en',
        });
        setModalMode('edit');
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const refetchCourses = async (nextPage = page) => {
        const params = new URLSearchParams();
        params.set('page', String(nextPage));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);

        const data = await axiosClient.get(`/admin/courses?${params.toString()}`);
        setCoursesData({
            ...data,
            items: data?.items?.length ? data.items : getGuestReadyCourseManagerFallbacks(),
        });
    };

    const handleSubmitCourse = async () => {
        setSubmitting(true);

        try {
            if (modalMode === 'edit' && editingCourse) {
                await axiosClient.put(`/admin/courses/${editingCourse.id}`, form);
                setToast({ message: buildToastSuccessMessage('cập nhật khóa học', form.title), type: 'success' });
            } else {
                await axiosClient.post('/admin/courses', form);
                setToast({ message: buildToastSuccessMessage('tạo khóa học', form.title), type: 'success' });
            }

            closeForm();
            setPage(1);
            await refetchCourses(modalMode === 'create' ? 1 : page);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể lưu khóa học.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!pendingDelete?.id) return;
        if (pendingDelete?.isCatalogFallback) {
            setToast({ message: 'Khóa học fallback chưa có bản ghi DB để xóa.', type: 'error' });
            setPendingDelete(null);
            return;
        }

        setSubmitting(true);
        try {
            await axiosClient.delete(`/admin/courses/${pendingDelete.id}`);
            setToast({ message: buildToastSuccessMessage('xóa khóa học', pendingDelete.title), type: 'success' });
            setPendingDelete(null);
            const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
            if (nextPage !== page) {
                setPage(nextPage);
            }
            await refetchCourses(nextPage);
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể xóa khóa học.'),
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportCourse = (course) => {
        if (!course?.id) return;
        if (course?.isCatalogFallback) {
            setToast({ message: 'Khóa học fallback chưa có bản ghi DB để xuất file.', type: 'error' });
            return;
        }

        setExportTargetCourse(course);
    };

    const handleExportCourseWithFormat = async (fileFormat) => {
        if (!exportTargetCourse?.id) return;

        const course = exportTargetCourse;
        setExportTargetCourse(null);
        setExportingCourseId(course.id);
        try {
            const data = await axiosClient.get(`/admin/courses/${course.id}/export`);
            downloadCourseExportFile(data, fileFormat);
            setToast({ message: buildToastSuccessMessage('xuất khóa học', course.title), type: 'success' });
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể xuất khóa học.'),
                type: 'error',
            });
        } finally {
            setExportingCourseId(null);
        }
    };

    const handleImportButtonClick = () => {
        importInputRef.current?.click();
    };

    const handleDownloadSample = async (fileFormat) => {
        setDownloadingSample(true);
        try {
            downloadCourseSampleFile(fileFormat);
            setIsSampleModalOpen(false);
            setToast({
                message: `Đã tải file mẫu khóa học (${fileFormat === 'excel' ? 'Excel' : 'JSON'}).`,
                type: 'success',
            });
        } catch (err) {
            setToast({
                message: err.message || 'Không thể tải file mẫu khóa học.',
                type: 'error',
            });
        } finally {
            setDownloadingSample(false);
        }
    };

    const handleImportCourse = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setImporting(true);
        try {
            const payload = await parseCourseImportFile(file);
            const data = await axiosClient.post('/admin/courses/import', payload);
            setPage(1);
            await refetchCourses(1);
            setToast({
                message: buildToastSuccessMessage('import khóa học', data.course?.title || payload?.course?.title || file.name),
                type: 'success',
            });
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể import khóa học.'),
                type: 'error',
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <main className="manager-page">
            <section className="manager-panel">
                <div className="manager-panel-head manager-panel-head-wrap">
                    <div>
                        <h2>Khóa học</h2>
                        <p className="manager-muted-text">
                            Quản lý khóa học, ảnh thumbnail, slug và cấu trúc nội dung cấp khóa học trong hệ thống.
                        </p>
                    </div>
                    <div className="manager-head-actions">
                        <input
                            ref={importInputRef}
                            type="file"
                            accept={IMPORT_FILE_ACCEPT}
                            className="manager-course-import-input"
                            onChange={handleImportCourse}
                        />
                        <button
                            type="button"
                            className="manager-secondary-btn manager-course-import-btn"
                            onClick={handleImportButtonClick}
                            disabled={importing}
                        >
                            {importing ? 'Đang nhập...' : 'Nhập'}
                        </button>
                        <button
                            type="button"
                            className="manager-secondary-btn"
                            onClick={() => setIsSampleModalOpen(true)}
                            disabled={downloadingSample}
                        >
                            {downloadingSample ? 'Đang tải mẫu...' : 'Tải file mẫu'}
                        </button>
                        <button type="button" className="manager-primary-btn" onClick={openCreateModal}>
                            Tạo khóa học
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

                <div className="manager-card-grid">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <article key={`course-skeleton-${index}`} className="manager-content-card manager-card-skeleton">
                                <div className="manager-card-skeleton-block"></div>
                                <div className="manager-card-skeleton-line"></div>
                                <div className="manager-card-skeleton-line short"></div>
                            </article>
                        ))
                    ) : null}

                    {!loading && !items.length ? (
                        <div className="manager-chart-empty">Không có khóa học nào khớp với bộ lọc hiện tại.</div>
                    ) : null}

                    {!loading && items.map((course) => (
                        <article key={course.id} className="manager-content-card">
                            <div className="manager-content-card-top">
                                <div className="manager-content-main">
                                    <h3>{course.title}</h3>
                                </div>
                            </div>

                            <div className="manager-course-thumbnail">
                                {course.thumbnailUrl ? (
                                    <img src={course.thumbnailUrl} alt={course.title} />
                                ) : (
                                    <div className="manager-course-thumbnail-empty">Chưa có ảnh</div>
                                )}
                            </div>

                            <p className="manager-muted-text manager-card-description">{course.description || 'Chưa có mô tả.'}</p>

                            <div className="manager-course-metrics">
                                <div>
                                    <span>Chủ đề</span>
                                    <strong>{course.topicCount}</strong>
                                </div>
                                <div>
                                    <span>Thẻ từ</span>
                                    <strong>{course.vocabularyCount}</strong>
                                </div>
                            </div>

                            <div className="manager-course-meta">
                                <span className="manager-course-slug">Slug: {course.slug}</span>
                                <span>Cập nhật: {new Date(course.updatedAt).toLocaleDateString('vi-VN')}</span>
                            </div>

                            <div className="manager-table-actions">
                                {course.isCatalogFallback ? (
                                    <button
                                        type="button"
                                        className="manager-table-action"
                                        onClick={() => setToast({ message: 'Khóa học fallback cần được seed/sync vào DB trước khi quản lý chủ đề.', type: 'error' })}
                                    >
                                        Xem chi tiết
                                    </button>
                                ) : (
                                    <Link to={`/manager/courses/${course.id}/topics`} className="manager-inline-action">
                                        Xem chi tiết
                                    </Link>
                                )}
                                <button type="button" className="manager-table-action" onClick={() => openEditModal(course)}>
                                    Sửa
                                </button>
                                <button
                                    type="button"
                                    className="manager-table-action"
                                    onClick={() => handleExportCourse(course)}
                                    disabled={Number(exportingCourseId) === Number(course.id)}
                                >
                                    {Number(exportingCourseId) === Number(course.id) ? 'Đang xuất...' : 'Xuất'}
                                </button>
                                <button
                                    type="button"
                                    className="manager-table-action is-danger"
                                    onClick={() => setPendingDelete(course)}
                                >
                                    Xóa
                                </button>
                            </div>
                        </article>
                    ))}
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

            <CourseFormModal
                isOpen={modalMode === 'create' || modalMode === 'edit'}
                mode={modalMode}
                form={form}
                onChange={updateForm}
                onClose={closeForm}
                onSubmit={handleSubmitCourse}
                submitting={submitting}
            />

            <FileFormatModal
                isOpen={Boolean(exportTargetCourse)}
                onClose={() => setExportTargetCourse(null)}
                title="Chọn định dạng xuất khóa học"
                description="Hãy chọn loại file muốn tải xuống. Cấu trúc file xuất sẽ tương thích trực tiếp với file nhập."
                options={[
                    {
                        value: 'excel',
                        label: 'Excel (.xlsx)',
                        description: 'Phù hợp khi admin muốn chỉnh sửa topic và từ vựng trực tiếp trên bảng tính.',
                        onSelect: handleExportCourseWithFormat,
                    },
                    {
                        value: 'json',
                        label: 'JSON (.json)',
                        description: 'Giữ nguyên định dạng JSON hiện tại để tiếp tục dùng luồng nhập/xuất đã ổn định.',
                        onSelect: handleExportCourseWithFormat,
                    },
                ]}
            />

            <FileFormatModal
                isOpen={isSampleModalOpen}
                onClose={() => setIsSampleModalOpen(false)}
                title="Tải file mẫu khóa học"
                description="File mẫu gồm thông tin khóa học, 2 topic và mỗi topic có 2 từ vựng để admin dễ kiểm tra dữ liệu trước khi nhập."
                options={[
                    {
                        value: 'excel',
                        label: 'Excel (.xlsx)',
                        description: 'Workbook gồm các sheet Course, Topics và Flashcards.',
                        onSelect: handleDownloadSample,
                    },
                    {
                        value: 'json',
                        label: 'JSON (.json)',
                        description: 'JSON mẫu cùng schema với file nhập/xuất hiện tại.',
                        onSelect: handleDownloadSample,
                    },
                ]}
            />

            <ConfirmActionModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDeleteCourse}
                title="Xóa khóa học này?"
                message={pendingDelete ? `Khóa học "${pendingDelete.title}" và toàn bộ chủ đề, thẻ từ bên trong sẽ bị xóa.` : ''}
                confirmLabel={submitting ? 'Đang xóa...' : 'Xóa khóa học'}
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
