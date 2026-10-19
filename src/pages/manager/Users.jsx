import { useEffect, useMemo, useState } from 'react';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import { useAuth } from '../../contexts/useAuth';
import axiosClient from '../../utils/axiosClient';
import { normalizeErrorMessage } from '../../utils/normalizeErrorMessage';
import { clearUserStudyLocalState } from '../../utils/userStorage';

const PAGE_SIZE = 10;

function formatNumber(value) {
    return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return '--';

    try {
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
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

function buildToastSuccessMessage(action, target) {
    return `Đã ${action} ${target}.`;
}

function UserStatusPill({ status }) {
    return (
        <span className={`manager-table-pill ${status === 'banned' ? 'is-danger' : 'is-ok'}`}>
            {status === 'banned' ? 'Đã khóa' : 'Đang hoạt động'}
        </span>
    );
}

function UserRolePill({ role, isRootAdmin }) {
    return (
        <span className={`manager-table-pill ${role === 'admin' ? 'is-accent' : ''}`}>
            {isRootAdmin ? 'Admin root' : role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
        </span>
    );
}

export default function ManagerUsers() {
    const { user: currentUser } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [usersData, setUsersData] = useState({ items: [], meta: null, filters: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [pendingAction, setPendingAction] = useState(null);
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
        if (role) params.set('role', role);
        if (status) params.set('status', status);

        setLoading(true);
        setError('');

        axiosClient.get(`/admin/users?${params.toString()}`)
            .then((data) => {
                if (!active) return;
                setUsersData(data);
            })
            .catch((err) => {
                if (!active) return;
                setError(
                    normalizeErrorMessage(
                        err.response?.data?.error || err.response?.data || err.message,
                        'Không tải được danh sách người dùng.',
                    ),
                );
                setUsersData({ items: [], meta: null, filters: null });
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [page, search, role, status]);

    const items = usersData?.items || [];
    const meta = usersData?.meta;

    const paginationSummary = useMemo(() => {
        if (!meta || !meta.total) return '0 người dùng';
        const start = (meta.page - 1) * meta.limit + 1;
        const end = Math.min(meta.page * meta.limit, meta.total);
        return `${start}-${end} / ${meta.total} người dùng`;
    }, [meta]);

    const openRoleAction = (targetUser, nextRole) => {
        setPendingAction({
            type: 'role',
            user: targetUser,
            nextValue: nextRole,
            title: nextRole === 'admin' ? 'Cấp quyền quản trị viên?' : 'Chuyển về người dùng thường?',
            message: `Tài khoản ${targetUser.email} sẽ được cập nhật quyền thành "${nextRole === 'admin' ? 'quản trị viên' : 'người dùng'}".`,
            confirmLabel: nextRole === 'admin' ? 'Cấp quyền' : 'Cập nhật quyền',
        });
    };

    const openStatusAction = (targetUser, nextStatus) => {
        setPendingAction({
            type: 'status',
            user: targetUser,
            nextValue: nextStatus,
            title: nextStatus === 'banned' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?',
            message: nextStatus === 'banned'
                ? `Người dùng ${targetUser.email} sẽ không thể đăng nhập cho đến khi được mở khóa.`
                : `Người dùng ${targetUser.email} sẽ có thể đăng nhập lại.`,
            confirmLabel: nextStatus === 'banned' ? 'Khóa tài khoản' : 'Mở khóa',
        });
    };

    const openResetStudyAction = (targetUser) => {
        setPendingAction({
            type: 'study-reset',
            user: targetUser,
            title: 'Xóa toàn bộ dữ liệu học?',
            message: `Tất cả tiến trình học, XP, streak, từ đã nhớ, lượt thi TOEIC, SRS và tài liệu cá nhân của ${targetUser.email} sẽ bị xóa để trở về trạng thái như mới đăng ký.`,
            confirmLabel: 'Xóa dữ liệu học',
        });
    };

    const openDeleteAccountAction = (targetUser) => {
        setPendingAction({
            type: 'account-delete',
            user: targetUser,
            title: 'Xóa tài khoản này?',
            message: `Tài khoản ${targetUser.email} và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này không thể hoàn tác.`,
            confirmLabel: 'Xóa tài khoản',
        });
    };

    const closePendingAction = () => setPendingAction(null);

    const refetchCurrentPage = async () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (search) params.set('search', search);
        if (role) params.set('role', role);
        if (status) params.set('status', status);

        const data = await axiosClient.get(`/admin/users?${params.toString()}`);
        setUsersData(data);
    };

    const handleConfirmAction = async () => {
        if (!pendingAction?.user?.id) return;

        const actionKey = `${pendingAction.type}:${pendingAction.user.id}`;
        setSubmittingKey(actionKey);

        try {
            if (pendingAction.type === 'role') {
                await axiosClient.patch(`/admin/users/${pendingAction.user.id}/role`, {
                    role: pendingAction.nextValue,
                });
                setToast({
                    message: buildToastSuccessMessage('cập nhật quyền cho', pendingAction.user.email),
                    type: 'success',
                });
            }

            if (pendingAction.type === 'status') {
                await axiosClient.patch(`/admin/users/${pendingAction.user.id}/status`, {
                    status: pendingAction.nextValue,
                });
                setToast({
                    message: buildToastSuccessMessage('cập nhật trạng thái cho', pendingAction.user.email),
                    type: 'success',
                });
            }

            if (pendingAction.type === 'study-reset') {
                await axiosClient.post(`/admin/users/${pendingAction.user.id}/reset-study`);
                if (Number(currentUser?.id) === Number(pendingAction.user.id)) {
                    clearUserStudyLocalState(currentUser);
                }
                setToast({
                    message: buildToastSuccessMessage('xóa toàn bộ dữ liệu học của', pendingAction.user.email),
                    type: 'success',
                });
            }

            if (pendingAction.type === 'account-delete') {
                await axiosClient.delete(`/admin/users/${pendingAction.user.id}`);
                setToast({
                    message: buildToastSuccessMessage('xóa tài khoản', pendingAction.user.email),
                    type: 'success',
                });
            }

            closePendingAction();
            await refetchCurrentPage();
        } catch (err) {
            setToast({
                message: buildToastErrorMessage(err, 'Không thể cập nhật người dùng.'),
                type: 'error',
            });
        } finally {
            setSubmittingKey('');
        }
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setRole('');
        setStatus('');
        setPage(1);
    };

    return (
        <main className="manager-page">
            <section className="manager-panel">
                <div className="manager-panel-head manager-panel-head-wrap">
                    <div>
                        <h2>Người dùng</h2>
                        <p className="manager-muted-text">
                            Theo dõi tài khoản học viên, tìm kiếm nhanh theo email hoặc tên và cập nhật quyền, trạng thái hay dữ liệu học tập.
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
                            placeholder="Tìm theo email hoặc họ tên"
                        />
                    </label>

                    <label className="manager-field">
                        <span>Quyền</span>
                        <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
                            <option value="">Tất cả quyền</option>
                            <option value="user">Người dùng</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </label>

                    <label className="manager-field">
                        <span>Trạng thái</span>
                        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="banned">Đã khóa</option>
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
                                <th>Email</th>
                                <th>Họ tên</th>
                                <th>Ngày tạo</th>
                                <th>Quyền</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <tr key={`skeleton-${index}`}>
                                        <td colSpan="8">
                                            <div className="manager-table-loading-row">Đang tải dữ liệu người dùng...</div>
                                        </td>
                                    </tr>
                                ))
                            ) : null}

                            {!loading && !items.length ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className="manager-table-empty">
                                            Không có người dùng nào khớp với bộ lọc hiện tại.
                                        </div>
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && items.map((item) => {
                                const isCurrentUser = Number(currentUser?.id) === Number(item.id);
                                const isRootAdmin = Boolean(item.isRootAdmin);
                                const roleActionKey = `role:${item.id}`;
                                const statusActionKey = `status:${item.id}`;
                                const resetStudyActionKey = `study-reset:${item.id}`;
                                const deleteAccountActionKey = `account-delete:${item.id}`;

                                return (
                                    <tr key={item.id}>
                                        <td>#{item.id}</td>
                                        <td>
                                            <div className="manager-table-primary">{item.email}</div>
                                            <div className="manager-table-secondary">{formatNumber(item.currentXp)} XP</div>
                                        </td>
                                        <td>
                                            <div className="manager-table-primary">{item.name || '--'}</div>
                                            <div className="manager-table-secondary">
                                                {item.currentStreak ? `${item.currentStreak} ngày streak` : 'Chưa có streak'}
                                            </div>
                                        </td>
                                        <td>{formatDate(item.createdAt)}</td>
                                        <td><UserRolePill role={item.role} isRootAdmin={isRootAdmin} /></td>
                                        <td><UserStatusPill status={item.status} /></td>
                                        <td>
                                            <div className="manager-table-actions manager-user-actions">
                                                <button
                                                    type="button"
                                                    className="manager-table-action"
                                                    disabled={submittingKey === roleActionKey || isCurrentUser || isRootAdmin}
                                                    onClick={() => openRoleAction(item, item.role === 'admin' ? 'user' : 'admin')}
                                                >
                                                    {submittingKey === roleActionKey
                                                        ? 'Đang lưu...'
                                                        : isRootAdmin
                                                            ? 'Tài khoản gốc'
                                                            : item.role === 'admin'
                                                                ? 'Đổi thành người dùng'
                                                                : 'Cấp quyền admin'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`manager-table-action ${item.status === 'banned' ? 'is-success' : 'is-danger'}`}
                                                    disabled={submittingKey === statusActionKey || isCurrentUser || isRootAdmin}
                                                    onClick={() => openStatusAction(item, item.status === 'banned' ? 'active' : 'banned')}
                                                >
                                                    {submittingKey === statusActionKey
                                                        ? 'Đang lưu...'
                                                        : isRootAdmin
                                                            ? 'Không thể khóa'
                                                            : item.status === 'banned'
                                                                ? 'Mở khóa'
                                                                : 'Khóa'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="manager-table-action is-danger"
                                                    disabled={submittingKey === resetStudyActionKey}
                                                    onClick={() => openResetStudyAction(item)}
                                                >
                                                    {submittingKey === resetStudyActionKey ? 'Đang xóa...' : 'Xóa dữ liệu học'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="manager-table-action is-danger"
                                                    disabled={submittingKey === deleteAccountActionKey || isCurrentUser || isRootAdmin}
                                                    onClick={() => openDeleteAccountAction(item)}
                                                >
                                                    {submittingKey === deleteAccountActionKey
                                                        ? 'Đang xóa...'
                                                        : isRootAdmin
                                                            ? 'Không thể xóa tài khoản gốc'
                                                            : isCurrentUser
                                                                ? 'Không thể tự xóa'
                                                                : 'Xóa tài khoản'}
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
                title={pendingAction?.title || 'Xác nhận thao tác'}
                message={pendingAction?.message || ''}
                confirmLabel={pendingAction?.confirmLabel || 'Xác nhận'}
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
