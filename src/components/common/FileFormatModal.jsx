import CustomModal from '../customDocs/CustomModal';

export default function FileFormatModal({
    isOpen,
    onClose,
    title,
    description,
    options,
}) {
    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={title} boxClassName="manager-format-modal">
            <div className="cv-modal-body manager-format-modal-body">
                {description ? <p className="manager-format-modal-copy">{description}</p> : null}
                <div className="manager-format-modal-options">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="manager-format-card"
                            onClick={() => option.onSelect(option.value)}
                        >
                            <strong>{option.label}</strong>
                            <span>{option.description}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="cv-modal-footer">
                <button className="btn btn-secondary" type="button" onClick={onClose}>
                    Hủy
                </button>
            </div>
        </CustomModal>
    );
}
