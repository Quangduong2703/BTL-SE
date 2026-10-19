import CustomModal from '../customDocs/CustomModal';

function normalizeMessage(message) {
    if (typeof message === 'string') return message;
    if (!message) return '';
    if (typeof message?.message === 'string') return message.message;
    if (typeof message?.error === 'string') return message.error;

    try {
        return JSON.stringify(message);
    } catch {
        return String(message);
    }
}

export default function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận thao tác',
    message,
    confirmLabel = 'Xóa',
    cancelLabel = 'Hủy',
}) {
    const safeMessage = normalizeMessage(message);

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="cv-modal-body">
                <p className="cv-confirm-copy">{safeMessage}</p>
                <p className="cv-confirm-hint">Thao tác này sẽ được thực hiện ngay khi bạn xác nhận.</p>
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" type="button" onClick={onClose}>
                    {cancelLabel}
                </button>
                <button className="btn btn-danger" type="button" onClick={onConfirm}>
                    {confirmLabel}
                </button>
            </div>
        </CustomModal>
    );
}
