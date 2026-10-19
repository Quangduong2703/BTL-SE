import { useEffect, useMemo, useState } from 'react';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import CustomModal from '../../components/customDocs/CustomModal';
import axiosClient from '../../utils/axiosClient';
import { normalizeErrorMessage } from '../../utils/normalizeErrorMessage';

const PAGE_SIZE = 10;

function formatDateTime(value) {
    if (!value) return '--';

    try {
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
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

function SupportTypePill({ type }) {
    return (
        <span className={`manager-table-pill ${type === 'bao-loi' ? 'is-danger' : 'is-accent'}`}>
            {type === 'bao-loi' ? 'Báo lỗi' : 'Góp ý'}
        </span>
    );
}

function SupportStatusPill({ status }) {
    const className = status === 'agreed'
        ? 'is-ok'
        : status === 'rejected'
            ? 'is-danger'
            : '';

    const label = status === 'agreed'
        ? 'Đã xử lý'
        : status === 'rejected'
            ? 'Từ chối'
            : 'Chờ xử lý';

    return <span className={`manager-table-pill ${className}`}>{label}</span>;
}

export default function ManagerSupport() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const [supportData, setSupportData] = useState({ items: [], meta: null, filters: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [pendingAction, setPendingAction] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [submittingKey, setSubmittingKey] = useState('');

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    useEffect(() => {
        let active = true;
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (type) params.set('type', type);

        setLoading(true);
        setError('');

        axiosClient.get(`/admin/support?${params.toString()}`)
            .then((data) => {
                if (!active) return;
                setSupportData(data);
            })
            .catch((err) => {
                if (!active) return;
                setError(
                    normalizeErrorMessage(
                        err.response?.data?.error || err.response?.data || err.message,
                        'Không tải được danh sách góp ý.',
                    ),
                );
                setSupportData({ items: [], meta: null, filters: null });
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [page, search, status, type]);

    const items = supportData?.items || [];
    const meta = supportData?.meta;

    const paginationSummary = useMemo(() => {
        if (!meta || !meta.total) return '0 phản hồi';
        const start = (meta.page - 1) * meta.limit + 1;
        const end = Math.min(meta.page * meta.limit, meta.total);
        return `${start}-${end} / ${meta.total} phản hồi`;
    }, [meta]);

    const refetchCurrentPage = async () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (type) params.set('type', type);

        const data = await axiosClient.get(`/admin/support?${params.toString()}`);
        setSupportData(data);
    };

    const openReviewAction = (item, nextStatus) => {
        setPendingAction({
            item,
            nextStatus,
            title: nextStatus === 'agreed'
                ? 'Đánh dấu đã xử lý cho phản hồi này?'
                : nextStatus === 'pending'
                    ? 'Đưa phản hồi này về chờ xử lý?'
                    : 'Đánh dấu từ chối cho phản hồi này?',
            message: nextStatus === 'agreed'
                ? `Phản hồi "${item.title}" sẽ được đánh dấu là đã xử lý.`
                : nextStatus === 'pending'
                    ? `Phản hồi "${item.title}" sẽ được đưa về trạng thái chờ xử lý.`
                    : `Phản hồi "${item.title}" sẽ được đánh dấu là từ chối.`,
            confirmLabel: nextStatus === 'agreed' ? 'Đã xử lý' : nextStatus === 'pending' ? 'Chờ xử lý' : 'Từ chối',
        });
    };

    const closePendingAction = () => setPendingAction(null);

    const handleConfirmAction = async () => {
        if (!pendingAction?.item?.id || !pendingAction?.nextStatus) return;

        const actionKey = `${pendingAction.nextStatus}:${pendingAction.item.id}`;
        setSubmittingKey(actionKey);

        try {
            await axiosClient.patch(`/admin/support/${pendingAction.item.id}/status`, {
                status: pendingAction.nextStatus,
            });
            setToast({
                message: pendingAction.nextStatus === 'agreed'
                    ? buildToastSuccessMessage('đánh dấu phản hồi là đã xử lý')
                    : pendingAction.nextStatus === 'pending'
                        ? buildToastSuccessMessage('đưa phản hồi về chờ xử lý')
                        : buildToastSuccessMessage('đánh dấu phản hồi là từ chối'),
                type: 'success',
            });
            closePendingAction();
            await refetchCurrentPage();
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể cập nhật phản hồi.'),
                type: 'error',
            });
        } finally {
            setSubmittingKey('');
        }
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setStatus('');
        setType('');
        setPage(1);
    };

    const closeDetailModal = () => setSelectedItem(null);

    return (
        <main className="manager-page">
            <section className="manager-panel">
                <div className="manager-panel-head manager-panel-head-wrap">
                    <div>
                        <h2>Góp ý và báo lỗi</h2>
                        <p className="manager-muted-text">
                            Ghi nhận phản hồi từ người dùng, lọc nhanh theo loại hoặc trạng thái và tick Agree/Reject cho từng mục.
                        </p>
                    </div>
                    <span className="manager-chip">{loading ? 'Đang tải' : paginationSummary}</span>
                </div>

                <div className="manager-toolbar">
                    <label className="manager-field manager-field-grow">
                        <span>Tìm kiếm</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Tìm theo tiêu đề, nội dung, email hoặc tên"
                        />
                    </label>

                    <label className="manager-field">
                        <span>Loại</span>
                        <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                            <option value="">Tất cả loại</option>
                            <option value="gop-y">Góp ý</option>
                            <option value="bao-loi">Báo lỗi</option>
                        </select>
                    </label>

                    <label className="manager-field">
                        <span>Trạng thái</span>
                        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending">Pending</option>
                            <option value="agreed">Resolved</option>
                            <option value="rejected">Reject</option>
                        </select>
                    </label>

                    <button type="button" className="manager-secondary-btn" onClick={clearFilters}>
                        Đặt lại
                    </button>
                </div>

                {error ? <p className="manager-error-text">{error}</p> : null}

                <div className="manager-table-shell">
                    <table className="manager-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Người gửi</th>
                                <th>Nội dung</th>
                                <th>Loại</th>
                                <th>Trạng thái</th>
                                <th>Thời gian</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`support-skeleton-${index}`}>
                                        <td colSpan="7">
                                            <div className="manager-table-loading-row">Đang tải danh sách phản hồi...</div>
                                        </td>
                                    </tr>
                                ))
                            ) : null}

                            {!loading && !items.length ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="manager-table-empty">
                                            Chưa có phản hồi nào khớp với bộ lọc hiện tại.
                                        </div>
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && items.map((item) => {
                                const resolveKey = `agreed:${item.id}`;
                                const pendingKey = `pending:${item.id}`;
                                const rejectKey = `rejected:${item.id}`;

                                return (
                                    <tr key={item.id}>
                                        <td>#{item.id}</td>
                                        <td>
                                            <div className="manager-table-primary">{item.userName || item.userEmail}</div>
                                            <div className="manager-table-secondary">{item.userEmail}</div>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="manager-secondary-btn manager-support-view-btn"
                                                onClick={() => setSelectedItem(item)}
                                            >
                                                Xem
                                            </button>
                                        </td>
                                        <td><SupportTypePill type={item.type} /></td>
                                        <td>
                                            <SupportStatusPill status={item.status} />
                                            {item.reviewerName || item.reviewedAt ? (
                                                <div className="manager-table-secondary manager-support-review-meta">
                                                    {item.reviewerName ? `Bởi ${item.reviewerName}` : 'Đã xử lý'}
                                                    {item.reviewedAt ? ` · ${formatDateTime(item.reviewedAt)}` : ''}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td>{formatDateTime(item.createdAt)}</td>
                                        <td>
                                            <div className="manager-table-actions manager-support-actions">
                                                <button
                                                    type="button"
                                                    className={`manager-table-action ${item.status === 'agreed' ? 'is-success' : ''}`}
                                                    disabled={submittingKey === resolveKey || item.status === 'agreed'}
                                                    onClick={() => openReviewAction(item, 'agreed')}
                                                >
                                                    {submittingKey === resolveKey ? 'Đang lưu...' : 'Đã xử lý'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="manager-table-action"
                                                    disabled={submittingKey === pendingKey || item.status === 'pending'}
                                                    onClick={() => openReviewAction(item, 'pending')}
                                                >
                                                    {submittingKey === pendingKey ? 'Đang lưu...' : 'Chờ xử lý'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`manager-table-action is-danger ${item.status === 'rejected' ? 'is-active' : ''}`}
                                                    disabled={submittingKey === rejectKey || item.status === 'rejected'}
                                                    onClick={() => openReviewAction(item, 'rejected')}
                                                >
                                                    {submittingKey === rejectKey ? 'Đang lưu...' : 'Từ chối'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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

            <ConfirmActionModal
                isOpen={Boolean(pendingAction)}
                onClose={closePendingAction}
                onConfirm={handleConfirmAction}
                title={pendingAction?.title}
                message={pendingAction?.message}
                confirmLabel={pendingAction?.confirmLabel}
            />

            <ToastNotice
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ message: '', type: 'error' })}
            />

            <CustomModal
                isOpen={Boolean(selectedItem)}
                onClose={closeDetailModal}
                title="Chi tiết phản hồi"
            >
                <div className="cv-modal-body">
                    <div className="manager-support-detail">
                        <div className="manager-support-detail-block">
                            <span className="manager-support-detail-label">Tiêu đề</span>
                            <strong>{selectedItem?.title || '--'}</strong>
                        </div>
                        <div className="manager-support-detail-block">
                            <span className="manager-support-detail-label">Nội dung</span>
                            <p>{selectedItem?.content || '--'}</p>
                        </div>
                    </div>
                </div>
                <div className="cv-modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeDetailModal}>
                        Đóng
                    </button>
                </div>
            </CustomModal>
        </main>
    );
}
