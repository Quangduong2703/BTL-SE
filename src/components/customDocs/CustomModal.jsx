import { useOverlayBehavior } from '../../hooks/useOverlayBehavior';

export default function CustomModal({ isOpen, onClose, title, children, boxClassName = '' }) {
    useOverlayBehavior(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div className="cv-modal-overlay cv-modal-active" onClick={onClose}>
            <div className={`cv-modal-box ${boxClassName}`.trim()} onClick={(e) => e.stopPropagation()}>
                <div className="cv-modal-header">
                    <h3>{title}</h3>
                    <button className="cv-modal-close" onClick={onClose}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}
