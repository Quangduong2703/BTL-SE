// CHI TIẾT VỀ WORD (KHI ẤN VÀO 1 WORD NÀO ĐẤY TRONG CÁI LIST WORD Ở TRONG MỘT TOPIC BẤT KỲ)

import { useOverlayBehavior } from '../../hooks/useOverlayBehavior';
import { languageLabels, languageVoiceMap } from '../../utils/language';

export default function WordDetailOverlay({
    isOpen,
    onClose,
    word,
    topicLang,
    showAddBtn,
    onAdd,
    onAskAI,
}) {
    useOverlayBehavior(isOpen, onClose);

    if (!isOpen || !word) {
        return null;
    }

    const effectiveLang = word.language || topicLang || 'en';
    const voiceIconMd = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.8871 3.73857C11.7129 3.52485 11.3991 3.49335 11.1854 3.66756L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 13.9004 17.2558 15.6248 16.0497 16.9003L14.6319 15.4826C15.4819 14.5699 16 13.3459 16 12C16 10.6541 15.4819 9.43013 14.6319 8.51742L16.0497 7.09966C17.2558 8.37516 18 10.0996 18 12Z" />
        </svg>
    );

    const voiceBtnStyle = {
        padding: '6px 12px',
        fontSize: '.82rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
    };

    return (
        <div className="cv-topic-picker-overlay cv-tp-active" onClick={onClose}>
            <div className="cv-topic-picker-box" id="cv-word-detail-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 className="cv-word-detail-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                            {word.word}
                        </h3>
                        {word.transcription && (
                            <span style={{ fontSize: '.85rem', color: 'var(--gray-light)', fontWeight: 500 }}>
                                {word.transcription}
                            </span>
                        )}
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '.75rem',
                                background: 'var(--bg-page)',
                                padding: '2px 9px',
                                borderRadius: '20px',
                                color: 'var(--gray-light)',
                                fontWeight: 600,
                                border: '1px solid var(--border)',
                            }}
                        >
                            {languageLabels[effectiveLang] || effectiveLang.toUpperCase()}
                        </span>
                    </div>
                    <button className="cv-modal-close" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="cv-modal-body">
                    <div className="cv-expand-grid" style={{ gap: '14px 24px' }}>
                        <div className="cv-expand-item">
                            <span className="cv-expand-label">Nghe phát âm</span>
                            <button
                                className="cv-voice-btn cv-expand-voice"
                                style={voiceBtnStyle}
                                onClick={() => {
                                    if (window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                        const utterance = new SpeechSynthesisUtterance(word.word);
                                        utterance.lang = languageVoiceMap[effectiveLang] || 'en-US';
                                        window.speechSynthesis.speak(utterance);
                                    }
                                }}
                            >
                                {voiceIconMd}&thinsp;Nghe
                            </button>
                        </div>
                        <div className="cv-expand-item">
                            <span className="cv-expand-label">Nghĩa</span>
                            <span className="cv-expand-val cv-mean">{word.mean || '—'}</span>
                        </div>
                        <div className="cv-expand-item">
                            <span className="cv-expand-label">Loại từ</span>
                            <span className="cv-expand-val">
                                <span className="cv-type-badge">{word.wordtype || '—'}</span>
                            </span>
                        </div>
                        {word.example && (
                            <div className="cv-expand-item cv-expand-item-full">
                                <span className="cv-expand-label">Ví dụ</span>
                                <span className="cv-expand-val" style={{ lineHeight: 1.6, fontStyle: 'italic' }}>
                                    {word.example}
                                </span>
                                {word.example_vi && (
                                    <span className="cv-example-vi" style={{ fontStyle: 'normal', marginTop: '2px', display: 'block' }}>
                                        ({word.example_vi})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="cv-modal-footer cv-modal-footer-split">
                    <button className="cv-ask-ai-btn" type="button" onClick={() => onAskAI?.(word)}>
                        ✨ Hỏi AI chi tiết về từ này
                    </button>
                    {showAddBtn && (
                        <button className="cv-add-to-my-btn" type="button" onClick={() => onAdd?.(word)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                            </svg>
                            Thêm vào bộ từ của tôi
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
