import CustomModal from './CustomModal';
import ToastNotice from '../common/ToastNotice';

export default function TopicFormModal({
    isOpen,
    onClose,
    onSave,
    topicForm,
    setTopicForm,
    editingTopic,
    toastMessage,
    onToastHide,
    isSaving = false,
}) {
    const languageOptions = [
        { value: 'en', label: 'Tiếng Anh' },
        { value: 'ja', label: 'Tiếng Nhật' },
        { value: 'zh', label: 'Tiếng Trung (giản thể)' },
    ];

    const createTopicTitle = (
        <span className="cv-modal-title-with-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 20.8268V22H14.1734C14.5827 22 14.7874 22 14.9715 21.9238C15.1555 21.8475 15.3003 21.7028 15.5897 21.4134L20.4133 16.5894C20.6864 16.3164 20.8229 16.1799 20.8959 16.0327C21.0347 15.7525 21.0347 15.4236 20.8959 15.1434C20.8229 14.9961 20.6864 14.8596 20.4133 14.5866C20.1403 14.3136 20.0038 14.1771 19.8565 14.1041C19.5763 13.9653 19.2473 13.9653 18.9671 14.1041C18.8198 14.1771 18.6833 14.3136 18.4103 14.5866L18.4103 14.5866L13.5867 19.4106C13.2972 19.7 13.1525 19.8447 13.0762 20.0287C13 20.2128 13 20.4174 13 20.8268Z" />
                <path d="M19 11C19 11 19 9.4306 18.8478 9.06306C18.6955 8.69552 18.4065 8.40649 17.8284 7.82843L13.0919 3.09188C12.593 2.593 12.3436 2.34355 12.0345 2.19575C11.9702 2.165 11.9044 2.13772 11.8372 2.11401C11.5141 2 11.1614 2 10.4558 2C7.21082 2 5.58831 2 4.48933 2.88607C4.26731 3.06508 4.06508 3.26731 3.88607 3.48933C3 4.58831 3 6.21082 3 9.45584V14C3 17.7712 3 19.6569 4.17157 20.8284C5.23467 21.8915 6.8857 21.99 10 21.9991M12 2.5V3C12 5.82843 12 7.24264 12.8787 8.12132C13.7574 9 15.1716 9 18 9H18.5" />
            </svg>
            <span>Tạo chủ đề mới</span>
        </span>
    );

    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingTopic ? 'Sửa chủ đề' : createTopicTitle}
        >
            <ToastNotice message={toastMessage} onHide={onToastHide} />
            <div className="cv-modal-body">
                <div className="cv-form-group">
                    <label className="cv-form-label">
                        Tên chủ đề <span style={{ color: 'var(--red)' }}>*</span>
                    </label>
                    <input
                        className="cv-form-input"
                        maxLength="60"
                        placeholder="Ví dụ: Từ vựng văn phòng"
                        value={topicForm.title}
                        onChange={(event) => {
                            setTopicForm({ ...topicForm, title: event.target.value });
                            onToastHide?.();
                        }}
                    />
                </div>
                <div className="cv-form-row">
                    <div className="cv-form-group" style={{ flex: 1 }}>
                        <label className="cv-form-label">Mô tả</label>
                        <textarea
                            className="cv-form-input cv-form-textarea"
                            placeholder="Mô tả ngắn..."
                            rows="2"
                            value={topicForm.description}
                            onChange={(event) => {
                                setTopicForm({ ...topicForm, description: event.target.value });
                                onToastHide?.();
                            }}
                        />
                    </div>
                </div>
                <div className="cv-form-row">
                    <div className="cv-form-group" style={{ flex: 1 }}>
                        <label className="cv-form-label">
                            Ngôn ngữ <span style={{ color: 'var(--red)' }}>*</span>
                        </label>
                        <select
                            className="cv-form-input cv-form-select"
                            value={topicForm.lang || 'en'}
                            disabled={Boolean(editingTopic)}
                            onChange={(event) => {
                                setTopicForm({ ...topicForm, lang: event.target.value });
                                onToastHide?.();
                            }}
                        >
                            {languageOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {editingTopic ? (
                            <small style={{ display: 'block', marginTop: '6px', color: 'var(--gray-light)' }}>
                                Khi sửa chủ đề, ngôn ngữ được giữ cố định.
                            </small>
                        ) : null}
                    </div>
                </div>
                {!editingTopic ? (
                    <div className="cv-form-row">
                        <div className="cv-form-group" style={{ flex: 1 }}>
                            <label className="cv-form-label">Bộ từ vựng được chia sẻ</label>
                        <input
                            className="cv-form-input"
                            maxLength="120"
                            placeholder="Dán ID bộ từ vựng được chia sẻ"
                            value={topicForm.sharedTopicId || ''}
                            onChange={(event) => {
                                setTopicForm({ ...topicForm, sharedTopicId: event.target.value });
                                onToastHide?.();
                            }}
                        />
                    </div>
                </div>
                ) : null}
            </div>
            <div className="cv-modal-footer cv-modal-footer-split">
                <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                    Hủy
                </button>
                <button className="btn btn-primary" onClick={onSave} disabled={isSaving}>
                    {isSaving
                        ? (editingTopic ? 'Đang lưu...' : (topicForm.sharedTopicId ? 'Đang sao chép...' : 'Đang tạo...'))
                        : (editingTopic ? 'Lưu thay đổi' : (topicForm.sharedTopicId ? 'Sao chép & tạo chủ đề' : 'Tạo chủ đề'))}
                </button>
            </div>
        </CustomModal>
    );
}
