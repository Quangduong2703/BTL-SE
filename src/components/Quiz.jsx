import { useEffect, useRef, useState } from 'react';
import {
    buildQuizQuestions,
    getSpeechLang,
} from '../utils/studyModes';
import { playCorrectSound, playIncorrectSound } from '../utils/feedbackAudio';

const EXIT_CLICK_SELECTOR = '.topbar, .sidebar, .mobile-nav, .sidebar-overlay';

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

export default function Quiz({
    topicLang = 'en',
    words,
    allTopicWords,
    onSaveLearnedWords,
    onSessionComplete,
    onExit,
    onBackToTopic,
}) {
    const distractorsPool = allTopicWords || words;
    const [questions, setQuestions] = useState(() => buildQuizQuestions(words, distractorsPool));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersByWordId, setAnswersByWordId] = useState({});
    const [isCompleted, setIsCompleted] = useState(false);
    const sessionLockedRef = useRef(false);

    useEffect(() => {
        const nextQuestions = buildQuizQuestions(words, distractorsPool);
        setQuestions(nextQuestions);
        setCurrentIndex(0);
        setAnswersByWordId({});
        setIsCompleted(false);
        sessionLockedRef.current = false;
    }, [words, distractorsPool]);

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
        return () => {
            document.removeEventListener('click', handleExitClick, true);
        };
    }, [onExit, words.length]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const totalQuestions = questions.length;
    const currentQuestion = questions[currentIndex];
    const currentAnswer = currentQuestion ? answersByWordId[currentQuestion.wordId] : null;
    const answeredCount = Object.keys(answersByWordId).length;
    const correctCount = Object.values(answersByWordId).filter((answer) => answer.isCorrect).length;
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const progressLabel = totalQuestions ? `${currentIndex + 1}/${totalQuestions}` : '0/0';
    const hasEnoughWords = words.length >= 4;
    const hasFullChoiceSet = questions.every((question) => question.choices.length === 4);

    const speakCurrentWord = () => {
        if (!currentQuestion?.word || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentQuestion.word.word);
        utterance.lang = getSpeechLang(currentQuestion.word.language, topicLang);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
    };

    const handleComplete = () => {
        // Auto mark correct words as learned for SRS injection
        const correctWordIds = questions
            .filter((q) => answersByWordId[q.wordId]?.isCorrect)
            .map((q) => q.wordId);
            
        setIsCompleted(true);
        sessionLockedRef.current = true;
        onSaveLearnedWords?.(correctWordIds);
        onSessionComplete?.();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSelectChoice = (choice) => {
        if (!currentQuestion || currentAnswer) return;

        if (choice.isCorrect) {
            playCorrectSound();
        } else {
            playIncorrectSound();
        }

        setAnswersByWordId((prev) => ({
            ...prev,
            [currentQuestion.wordId]: {
                choiceId: choice.id,
                choiceText: choice.text,
                isCorrect: choice.isCorrect,
            },
        }));
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const handlePlayAgain = () => {
        const nextQuestions = buildQuizQuestions(words, distractorsPool);
        setQuestions(nextQuestions);
        setCurrentIndex(0);
        setAnswersByWordId({});
        setIsCompleted(false);
        sessionLockedRef.current = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!words.length) {
        return (
            <section className="flashcard-shell quiz-shell">
                <div className="flashcard-empty">
                    <h3>Topic này chưa có từ vựng</h3>
                    <p>Hãy thêm từ vựng trước khi bắt đầu Quiz.</p>
                    <button type="button" className="btn btn-secondary" onClick={onBackToTopic}>
                        Quay lại
                    </button>
                </div>
            </section>
        );
    }

    if (!hasEnoughWords || !hasFullChoiceSet) {
        return (
            <section className="flashcard-shell quiz-shell">
                <div className="flashcard-empty">
                    <h3>Quiz cần ít nhất 4 đáp án phân biệt</h3>
                    <p>
                        Topic hiện tại có {words.length} từ, nhưng cần đủ dữ liệu để tạo 4 lựa chọn không bị trùng nghĩa.
                        Hãy bổ sung thêm từ vựng hoặc mở rộng topic rồi thử lại.
                    </p>
                    <button type="button" className="btn btn-secondary" onClick={onBackToTopic}>
                        Quay lại
                    </button>
                </div>
            </section>
        );
    }

    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
        <section className="flashcard-shell quiz-shell">
            <div className="flashcard-header-meta">
                <div className="flashcard-progress">
                    <span>Tiến độ:</span>
                    <strong>{isCompleted ? `${totalQuestions}/${totalQuestions}` : progressLabel}</strong>
                </div>
                <div className="flashcard-header-actions">
                    <button type="button" className="btn btn-secondary flashcard-header-btn" onClick={handlePlayAgain}>
                        Làm lại
                    </button>
                    <button type="button" className="btn btn-secondary flashcard-header-btn" onClick={onBackToTopic}>
                        Thoát
                    </button>
                </div>
            </div>

            {!isCompleted ? (
                <>
                    <div className="quiz-stage">
                        <div className="quiz-card">
                            <div className="quiz-card-main">
                                <div className="quiz-topline-row">
                                    <span className="quiz-topline"><strong>Quiz:</strong> chọn nghĩa tiếng Việt phù hợp nhất</span>
                                    <span className="quiz-substat">
                                        Đã trả lời {answeredCount}/{totalQuestions}
                                    </span>
                                </div>

                                <div className="quiz-word-block">
                                    <strong className="quiz-word">{currentQuestion.word.word}</strong>
                                    <div className="quiz-word-meta">
                                        <span>{currentQuestion.word.wordtype || 'Vocabulary'}</span>
                                        <span>{currentQuestion.word.transcription || '/dang-cap-nhat/'}</span>
                                    </div>
                                </div>

                                <div className="quiz-choice-grid">
                                    {currentQuestion.choices.map((choice, index) => {
                                        const isSelected = currentAnswer?.choiceId === choice.id;
                                        const isCorrect = currentAnswer && choice.isCorrect;
                                        const isWrong = isSelected && currentAnswer && !choice.isCorrect;
                                        return (
                                            <button
                                                key={choice.id}
                                                type="button"
                                                className={`quiz-choice-btn${isSelected ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}`}
                                                onClick={() => handleSelectChoice(choice)}
                                                disabled={!!currentAnswer}
                                            >
                                                <span className="quiz-choice-key">{index + 1}</span>
                                                <span className="quiz-choice-copy">{choice.text}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {currentAnswer ? (
                                    <div className={`quiz-feedback${currentAnswer.isCorrect ? ' is-correct' : ' is-wrong'}`}>
                                        <strong>{currentAnswer.isCorrect ? 'Chính xác' : 'Chưa đúng'}</strong>
                                        <span>
                                            Đáp án đúng là <strong>{currentQuestion.correctText}</strong>
                                            {currentQuestion.word.example ? ` - Ví dụ: ${currentQuestion.word.example}` : ''}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="quiz-actions quiz-actions-nav">
                        <button type="button" className="btn btn-primary flashcard-action-btn flashcard-action-btn-compact" onClick={handlePrevious} disabled={currentIndex === 0}>
                            <span className="flashcard-nav-icon">{ARROW_LEFT_ICON}</span>
                            <span>TRƯỚC</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary flashcard-action-btn flashcard-action-btn-icon flashcard-action-btn-compact"
                            onClick={speakCurrentWord}
                            aria-label="Nghe phát âm"
                        >
                            {SPEAKER_ICON} Nghe
                        </button>
                        {isLastQuestion ? (
                            <button type="button" className="btn btn-primary flashcard-action-btn flashcard-action-btn-compact" onClick={handleComplete} disabled={!currentAnswer}>
                                <span>Kết quả</span>
                                <span className="flashcard-nav-icon">{ARROW_RIGHT_ICON}</span>
                            </button>
                        ) : (
                            <button type="button" className="btn btn-primary flashcard-action-btn flashcard-action-btn-compact" onClick={handleNext} disabled={!currentAnswer}>
                                <span>Tiếp</span>
                                <span className="flashcard-nav-icon">{ARROW_RIGHT_ICON}</span>
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="flashcard-completion-view">
                    <div className="flashcard-completion-content">
                        <div className="flashcard-trophy">🏆</div>
                        <h2>Tuyệt vời!</h2>
                        <p>Bạn đã hoàn thành bài luyện tập Quiz.</p>
                        
                        <div className="flashcard-completion-metrics">
                            <div className="flashcard-xp-reward flashcard-xp-reward-inline">
                                <span>+{(correctCount * 10) + 30} XP</span>
                            </div>
                            <div className="flashcard-progress flashcard-completion-score">
                                <span className="flashcard-completion-score-label">Điểm số</span>
                                <strong className="flashcard-completion-score-value">{correctCount}/{totalQuestions} ({accuracy}%)</strong>
                            </div>
                        </div>

                        <div className="flashcard-completion-stats">
                            <div className="flashcard-completion-stats-head">
                                <span className="flashcard-completion-stats-title">Thống kê:</span>
                            </div>
                            <div className="flashcard-completion-stat-row">
                                <span><span className="flashcard-completion-stat-icon is-correct">✓</span> Trả lời đúng:</span>
                                <strong>{correctCount} câu</strong>
                            </div>
                            <div className="flashcard-completion-stat-row">
                                <span><span className="flashcard-completion-stat-icon is-wrong">✗</span> Trả lời sai:</span>
                                <strong>{totalQuestions - correctCount} câu</strong>
                            </div>
                        </div>

                        <div className="flashcard-completion-actions">
                            <button type="button" className="btn btn-secondary" onClick={handlePlayAgain}>
                                Làm lại toàn bộ
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onBackToTopic}>
                                Xem chi tiết & Học thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

