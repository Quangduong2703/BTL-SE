import { useEffect, useRef, useState } from 'react';
import { buildFlashcardDeck, getSpeechLang } from '../utils/studyModes';

const LANGUAGE_LABELS = {
    en: 'Tiếng Anh',
    ko: 'Tiếng Hàn',
    ja: 'Tiếng Nhật',
    zh: 'Tiếng Trung',
    fr: 'Tiếng Nhấp',
};

const ARROW_LEFT_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6" />
    </svg>
);

const ARROW_RIGHT_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
    </svg>
);

const SPEAKER_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
);

const EXIT_CLICK_SELECTOR = '.topbar, .sidebar, .mobile-nav, .sidebar-overlay';

const FLASHCARD_GRADIENTS = [
    { front: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', back: 'linear-gradient(135deg, #2dd4bf 0%, #3b82f6 100%)' },
    { front: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', back: 'linear-gradient(135deg, #3b82f6 0%, #34d399 100%)' },
    { front: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)', back: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)' },
    { front: 'linear-gradient(135deg, #fb7185 0%, #a78bfa 100%)', back: 'linear-gradient(135deg, #34d399 0%, #3b82f6 100%)' },
    { front: 'linear-gradient(135deg, #3b82f6 0%, #a78bfa 100%)', back: 'linear-gradient(135deg, #ec4899 0%, #fbbf24 100%)' },
    { front: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)', back: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
    { front: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)', back: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)' },
    { front: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', back: 'linear-gradient(135deg, #fbbf24 0%, #3b82f6 100%)' },
    { front: 'linear-gradient(135deg, #38bdf8 0%, #a3e635 100%)', back: 'linear-gradient(135deg, #d946ef 0%, #f59e0b 100%)' },
    { front: 'linear-gradient(135deg, #f87171 0%, #8b5cf6 100%)', back: 'linear-gradient(135deg, #2dd4bf 0%, #3b82f6 100%)' },
];

function getCardTheme(word, index) {
    if (!word) return FLASHCARD_GRADIENTS[0];

    const source = `${word.id ?? ''}-${word.word ?? ''}-${index}`;
    const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0);
    return FLASHCARD_GRADIENTS[hash % FLASHCARD_GRADIENTS.length];
}

export default function Flashcard({
    topicLang = 'en',
    words,
    onSaveLearnedWords,
    onSessionComplete,
    onExit,
    onBackToTopic,
    onStartQuiz,
}) {
    const [sessionWords, setSessionWords] = useState(() => buildFlashcardDeck(words));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const sessionLockedRef = useRef(false);

    useEffect(() => {
        const nextSessionWords = buildFlashcardDeck(words);
        setSessionWords(nextSessionWords);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
        sessionLockedRef.current = false;
    }, [words]);

    useEffect(() => {
        if (!words.length) return undefined;

        const handleExitClick = (event) => {
            if (sessionLockedRef.current) return;
            if (!event.target.closest(EXIT_CLICK_SELECTOR)) return;
            event.preventDefault();
            event.stopPropagation();
            onExit?.();
        };

        document.addEventListener('click', handleExitClick, true);
        return () => document.removeEventListener('click', handleExitClick, true);
    }, [onExit, words.length]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const totalCards = sessionWords.length;
    const currentWord = sessionWords[currentIndex];
    const isLastCard = currentIndex === totalCards - 1;
    const progressLabel = totalCards ? `${currentIndex + 1}/${totalCards}` : '0/0';
    const currentTheme = getCardTheme(currentWord, currentIndex);
    const languageLabel = LANGUAGE_LABELS[currentWord?.language || topicLang] || 'Từ vựng';

    const handlePrevious = () => {
        if (!totalCards) return;
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsFlipped(false);
        setHasFlippedOnce(false);
    };

    const handleNext = () => {
        if (!totalCards || !hasFlippedOnce) return;
        setCurrentIndex((prev) => Math.min(prev + 1, totalCards - 1));
        setIsFlipped(false);
        setHasFlippedOnce(false);
    };

    const handleComplete = () => {
        if (!hasFlippedOnce) return;

        setIsCompleted(true);
        setIsFlipped(false);
        sessionLockedRef.current = true;
        
        onSaveLearnedWords?.(words.map((w) => w.id)); // Add all words to SRS
        onSessionComplete?.();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePlayAgain = () => {
        const nextSessionWords = buildFlashcardDeck(words);
        setSessionWords(nextSessionWords);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
        sessionLockedRef.current = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const speakCurrentWord = () => {
        if (!currentWord || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = getSpeechLang(currentWord.language, topicLang);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const toggleFlip = () => {
        setIsFlipped((prev) => {
            if (!prev) {
                setHasFlippedOnce(true);
            }
            return !prev;
        });
    };

    const handleCardKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleFlip();
    };

    if (!sessionWords.length) {
        return (
            <section className="flashcard-shell">
                <div className="flashcard-empty">
                    <h3>Topic này chưa có từ vựng</h3>
                    <p>Hãy thêm từ vựng trước khi bắt đầu flashcard.</p>
                    <button type="button" className="btn btn-secondary" onClick={onBackToTopic}>
                        Quay lại
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="flashcard-shell">
            <div className="flashcard-header-meta">
                <div className="flashcard-progress">
                    <span>Tiến độ:</span>
                    <strong>{isCompleted ? `${totalCards}/${totalCards}` : progressLabel}</strong>
                </div>
                <div className="flashcard-header-actions">
                    <button type="button" className="btn btn-secondary flashcard-header-btn" onClick={handlePlayAgain}>
                        Học lại
                    </button>
                    <button type="button" className="btn btn-secondary flashcard-header-btn" onClick={onBackToTopic}>
                        Thoát
                    </button>
                </div>
            </div>

            {!isCompleted ? (
                <>
                    <div className="flashcard-stage">
                        <div className={`flashcard-card${isFlipped ? ' is-flipped' : ''}`}>
                            <div
                                className="flashcard-card-inner"
                                role="button"
                                tabIndex={0}
                                aria-label="Lat the flashcard"
                                onClick={toggleFlip}
                                onKeyDown={handleCardKeyDown}
                            >
                                <div className="flashcard-face flashcard-face-front" style={{ background: currentTheme.front }}>
                                    <div className="flashcard-face-topline">Từ {languageLabel}</div>
                                    <div className="flashcard-face-center">
                                        <strong className="flashcard-word">{currentWord.word}</strong>
                                        <span className="flashcard-wordtype flashcard-wordtype-front">{currentWord.wordtype || 'VOCABULARY'}</span>
                                        <span className="flashcard-transcription">{currentWord.transcription || '/dang-cap-nhat/'}</span>
                                    </div>
                                    <div className="flashcard-face-hint flashcard-face-hint-spaced">Nhấn space hoặc click để lật lại</div>
                                </div>

                                <div className="flashcard-face flashcard-face-back" style={{ background: currentTheme.back }}>
                                    <div className="flashcard-back-layout">
                                        <div className="flashcard-face-topline">Nghĩa tiếng Việt</div>
                                        <div className="flashcard-back-center">
                                            <strong className="flashcard-meaning flashcard-meaning-hero">{currentWord.mean || 'Chưa có nghĩa'}</strong>
                                            <div className="flashcard-detail-row flashcard-audio-row">
                                                <div className="flashcard-example-pill-copy">
                                                    <span className="flashcard-field-label">Phiên âm</span>
                                                    <span className="flashcard-transcription flashcard-transcription-back">{currentWord.transcription || '/dang-cap-nhat/'}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary flashcard-voice-btn"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        speakCurrentWord();
                                                    }}
                                                    aria-label="Nghe phát âm"
                                                >
                                                    {SPEAKER_ICON}
                                                </button>
                                            </div>
                                            <div className="flashcard-example-pill">
                                                <div className="flashcard-example-pill-copy">
                                                    <span className="flashcard-field-label">Ví dụ</span>
                                                    <span className="flashcard-example flashcard-example-main">{currentWord.example || 'Chưa có ví dụ tiếng Anh'}</span>
                                                    <span className="flashcard-example flashcard-example-vi">{currentWord.example_vi || 'Chưa có ví dụ tiếng Việt'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flashcard-face-hint flashcard-face-hint-back">
                                            Nhấn space hoặc click để lật lại
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flashcard-actions flashcard-actions-nav">
                        <button type="button" className="btn btn-primary flashcard-action-btn flashcard-action-btn-compact" onClick={handlePrevious} disabled={currentIndex === 0}>
                            <span className="flashcard-nav-icon">{ARROW_LEFT_ICON}</span>
                            <span>TRƯỚC</span>
                        </button>
                        {isLastCard ? (
                            <button type="button" className={`btn btn-primary flashcard-action-btn flashcard-action-btn-compact${!hasFlippedOnce ? ' flashcard-btn-locked' : ''}`} onClick={handleComplete} disabled={!hasFlippedOnce}>
                                <span>Hoàn thành</span>
                                <span className="flashcard-nav-icon">{ARROW_RIGHT_ICON}</span>
                            </button>
                        ) : (
                            <button type="button" className={`btn btn-primary flashcard-action-btn flashcard-action-btn-compact${!hasFlippedOnce ? ' flashcard-btn-locked' : ''}`} onClick={handleNext} disabled={!hasFlippedOnce}>
                                <span>TIẾP</span>
                                <span className="flashcard-nav-icon">{ARROW_RIGHT_ICON}</span>
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="flashcard-completion-view">
                    <div className="flashcard-completion-content">
                        <div className="flashcard-trophy">🏆</div>
                        <h2>Chúc mừng bạn!</h2>
                        <p>Bạn đã hoàn thành phiên học Flashcard.</p>
                        <div className="flashcard-xp-reward">
                            <span>+50 XP</span>
                        </div>
                        <p className="flashcard-completion-note">
                            Các từ vựng trong chủ đề này đã được tự động chuyển vào danh sách ôn tập thông minh (SRS).
                        </p>
                        <div className="flashcard-completion-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => onStartQuiz ? onStartQuiz() : handlePlayAgain()}>
                                Luyện tập ngay
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onBackToTopic}>
                                Quay về chủ đề
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
