import { useEffect, useMemo, useRef, useState } from 'react';
import StudyCompletionPanel from './studyModes/StudyCompletionPanel';
import { buildMatchBoard, getInitialRememberedSelection } from '../utils/studyModes';
import { playCorrectSound, playIncorrectSound } from '../utils/feedbackAudio';

const EXIT_CLICK_SELECTOR = '.topbar, .sidebar, .mobile-nav, .sidebar-overlay';
const MAX_PAIRS = 20;

function getSelectionState(selection) {
    return selection || { side: null, wordId: null };
}

function createDraftRememberedSelection(pairs, matchedWordIds, initialLearnedWordIds) {
    const initialIds = new Set(initialLearnedWordIds);
    const validIds = new Set(pairs.map((pair) => pair.wordId));

    matchedWordIds.forEach((wordId) => {
        if (validIds.has(wordId)) initialIds.add(wordId);
    });

    return Array.from(initialIds);
}

export default function Match({
    words,
    initialLearnedWordIds = [],
    onSaveLearnedWords,
    onSessionComplete,
    onExit,
    onBackToTopic,
}) {
    const [board, setBoard] = useState(() => buildMatchBoard(words, MAX_PAIRS));
    const [selection, setSelection] = useState({ side: null, wordId: null });
    const [matchedWordIds, setMatchedWordIds] = useState([]);
    const [wrongPair, setWrongPair] = useState(null);
    const [selectedWordIds, setSelectedWordIds] = useState(() => getInitialRememberedSelection(words, initialLearnedWordIds));
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const wrongPairTimeoutRef = useRef(null);
    const sessionLockedRef = useRef(false);

    useEffect(() => {
        setBoard(buildMatchBoard(words, MAX_PAIRS));
        setSelection({ side: null, wordId: null });
        setMatchedWordIds([]);
        setWrongPair(null);
        setSelectedWordIds(getInitialRememberedSelection(words, initialLearnedWordIds));
        setIsCompleted(false);
        setIsSaved(false);
        sessionLockedRef.current = false;
    }, [words, initialLearnedWordIds]);

    useEffect(() => () => {
        if (wrongPairTimeoutRef.current) {
            clearTimeout(wrongPairTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!board.pairs.length) return undefined;

        const handleExitClick = (event) => {
            if (sessionLockedRef.current) return;
            if (!event.target.closest(EXIT_CLICK_SELECTOR)) return;
            event.preventDefault();
            event.stopPropagation();
            onExit?.();
        };

        document.addEventListener('click', handleExitClick, true);
        return () => document.removeEventListener('click', handleExitClick, true);
    }, [board.pairs.length, onExit]);

    useEffect(() => {
        if (!isCompleted && board.pairs.length > 0 && matchedWordIds.length === board.pairs.length) {
            const nextSelection = createDraftRememberedSelection(board.pairs, matchedWordIds, initialLearnedWordIds);
            setSelectedWordIds(getInitialRememberedSelection(words, nextSelection));
            setIsCompleted(true);
            onSessionComplete?.();
            setSelection({ side: null, wordId: null });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [board.pairs, initialLearnedWordIds, isCompleted, matchedWordIds, onSessionComplete, words]);

    const activeLeftItems = useMemo(
        () => board.leftItems.filter((item) => !matchedWordIds.includes(item.wordId)),
        [board.leftItems, matchedWordIds],
    );

    const activeRightItems = useMemo(
        () => board.rightItems.filter((item) => !matchedWordIds.includes(item.wordId)),
        [board.rightItems, matchedWordIds],
    );

    const totalPairs = board.pairs.length;
    const matchedCount = matchedWordIds.length;

    const clearWrongPairLater = () => {
        if (wrongPairTimeoutRef.current) {
            clearTimeout(wrongPairTimeoutRef.current);
        }

        wrongPairTimeoutRef.current = setTimeout(() => {
            setWrongPair(null);
            wrongPairTimeoutRef.current = null;
        }, 650);
    };

    const toggleSelectedWord = (wordId) => {
        setSelectedWordIds((prev) => (
            prev.includes(wordId)
                ? prev.filter((id) => id !== wordId)
                : [...prev, wordId]
        ));
    };

    const handleItemClick = (side, wordId) => {
        if (isCompleted || matchedWordIds.includes(wordId)) return;

        const currentSelection = getSelectionState(selection);

        if (!currentSelection.side) {
            setSelection({ side, wordId });
            setWrongPair(null);
            return;
        }

        if (currentSelection.side === side) {
            if (currentSelection.wordId === wordId) {
                setSelection({ side: null, wordId: null });
                setWrongPair(null);
                return;
            }

            setSelection({ side, wordId });
            setWrongPair(null);
            return;
        }

        if (currentSelection.wordId === wordId) {
            playCorrectSound();
            setMatchedWordIds((prev) => [...prev, wordId]);
            setSelection({ side: null, wordId: null });
            setWrongPair(null);
            return;
        }

        playIncorrectSound();
        setWrongPair({
            leftWordId: side === 'left' ? wordId : currentSelection.wordId,
            rightWordId: side === 'right' ? wordId : currentSelection.wordId,
        });
        setSelection({ side: null, wordId: null });
        clearWrongPairLater();
    };

    const handlePlayAgain = () => {
        setBoard(buildMatchBoard(words, MAX_PAIRS));
        setSelection({ side: null, wordId: null });
        setMatchedWordIds([]);
        setWrongPair(null);
        setSelectedWordIds(getInitialRememberedSelection(words, initialLearnedWordIds));
        setIsCompleted(false);
        setIsSaved(false);
        sessionLockedRef.current = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = async () => {
        await onSaveLearnedWords?.(selectedWordIds);
        setIsSaved(true);
        sessionLockedRef.current = true;
        onBackToTopic?.();
    };

    if (!board.pairs.length) {
        return (
            <section className="flashcard-shell match-shell">
                <div className="flashcard-empty">
                    <h3>Topic này chưa đủ cặp từ để chơi Match</h3>
                    <p>Cần ít nhất 2 cặp word và mean hợp lệ để bắt đầu.</p>
                    <button type="button" className="btn btn-secondary" onClick={onBackToTopic}>
                        Quay lại
                    </button>
                </div>
            </section>
        );
    }

    if (board.pairs.length < 2) {
        return (
            <section className="flashcard-shell match-shell">
                <div className="flashcard-empty">
                    <h3>Match cần ít nhất 2 cặp từ</h3>
                    <p>Topic hiện tại chưa đủ dữ liệu để tạo board nối cặp.</p>
                    <button type="button" className="btn btn-secondary" onClick={onBackToTopic}>
                        Quay lại
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="flashcard-shell match-shell">
            <div className="flashcard-header-meta">
                <div className="flashcard-progress">
                    <span>Tiến độ:</span>
                    <strong>{isCompleted ? `${totalPairs}/${totalPairs}` : `${matchedCount}/${totalPairs}`}</strong>
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
                    <div className="match-stage">
                        <div className="match-shell-card">
                            <div className="match-board-header">
                                <div>
                                    <span className="match-topline">Match</span>
                                    <h3>Nối từ vựng với nghĩa đúng</h3>
                                </div>
                                <div className="match-status-group">
                                    <span className="match-status-pill">Đã nối đúng {matchedCount}/{totalPairs}</span>
                                    {board.pairs.length === MAX_PAIRS && words.length > MAX_PAIRS ? (
                                        <span className="match-status-pill is-muted">Session này dùng 20 cặp từ vựng đầu tiên</span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="match-board">
                                <div className="match-column">
                                    <div className="match-column-head">Từ vựng</div>
                                    <div className="match-column-list">
                                        {activeLeftItems.map((item) => {
                                            const isSelected = selection.side === 'left' && selection.wordId === item.wordId;
                                            const isWrong = wrongPair?.leftWordId === item.wordId;
                                            return (
                                                <button
                                                    key={`left-${item.wordId}`}
                                                    type="button"
                                                    className={`match-item-btn${isSelected ? ' is-selected' : ''}${isWrong ? ' is-wrong' : ''}`}
                                                    onClick={() => handleItemClick('left', item.wordId)}
                                                >
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="match-column">
                                    <div className="match-column-head">Nghĩa</div>
                                    <div className="match-column-list">
                                        {activeRightItems.map((item) => {
                                            const isSelected = selection.side === 'right' && selection.wordId === item.wordId;
                                            const isWrong = wrongPair?.rightWordId === item.wordId;
                                            return (
                                                <button
                                                    key={`right-${item.wordId}`}
                                                    type="button"
                                                    className={`match-item-btn${isSelected ? ' is-selected' : ''}${isWrong ? ' is-wrong' : ''}`}
                                                    onClick={() => handleItemClick('right', item.wordId)}
                                                >
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <StudyCompletionPanel
                    summary={<><strong>Tổng kết:</strong> Bạn đã nối đúng {matchedCount}/{totalPairs} cặp và đã đánh dấu thuộc {selectedWordIds.length} từ.</>}
                    metrics={[
                        { label: 'Số cặp đúng', value: `${matchedCount}/${totalPairs}` },
                        { label: 'Tỉ lệ', value: `${Math.round((matchedCount / totalPairs) * 100)}%` },
                    ]}
                    title="Xác nhận lại danh sách từ đã thuộc sau khi học Match"
                    words={board.pairs.map((pair) => pair.word)}
                    selectedWordIds={selectedWordIds}
                    onToggleWord={toggleSelectedWord}
                    onPlayAgain={handlePlayAgain}
                    onSave={handleSave}
                    isSaved={isSaved}
                />
            )}
        </section>
    );
}
