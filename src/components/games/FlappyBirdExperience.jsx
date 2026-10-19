import { useEffect, useMemo, useRef, useState } from 'react';
import birdBrownImage from '../../assets/images/bird-brown.svg';
import birdPinkImage from '../../assets/images/bird-pink.svg';
import birdYellowImage from '../../assets/images/bird-yellow.svg';
import { useAuth } from '../../contexts/useAuth';
import { getDashboardUserKey } from '../../utils/dashboardProgress';
import { playCorrectSound, playIncorrectSound } from '../../utils/feedbackAudio';
import { getSpeechLang } from '../../utils/studyModes';
import { recordGamePlay } from '../../utils/userStats';

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const BIRD_X = 248;
const BIRD_SIZE = 34;
const GROUND_HEIGHT = 58;
const PIPE_WIDTH = 92;
const PIPE_GAP = 168;
const PIPE_SPEED = 220;
const GRAVITY = 980;
const JUMP_VELOCITY = -340;
const PIPE_INTERVAL = 1.85;
const START_HEARTS = 5;
const QUESTION_TIME = 30;
const RECENT_WORD_LIMIT = 6;
const MIN_PLAYABLE_WORDS = 15;
const CHALLENGE_ARM_DELAY = 1500;
const RESUME_DELAY = 3;
const RESUME_SLOW_FALL_MS = 900;
const RESUME_SLOW_FALL_GRAVITY_MULTIPLIER = 0.58;
const RESUME_SLOW_FALL_MAX_VELOCITY = 110;
const RESUME_PIPE_SHIELD_MS = 3000;
const GAME_ID = 'flappy-bird';
const BIRD_OPTIONS = [
    { id: 'yellow', label: 'Vàng', image: birdYellowImage, gameImage: birdYellowImage },
    { id: 'pink', label: 'Hồng', image: birdPinkImage, gameImage: birdPinkImage },
    { id: 'brown', label: 'Nâu', image: birdBrownImage, gameImage: birdBrownImage },
];

const GAME_CARD = {
    id: GAME_ID,
    title: 'Flappy Bird',
    eyebrow: 'Arcade học từ vựng',
    description: 'Vượt ống nước, nhận câu hỏi bất ngờ ở giữa khe và giữ 5 trái tim sống sót lâu nhất có thể.',
};

const GAME_OVER_COPY = {
    collision: 'Bạn va vào chướng ngại vật trước khi kịp vượt qua.',
    hearts: 'Bạn đã dùng hết tim sau các câu trả lời sai hoặc hết giờ.',
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
    const next = [...items];

    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }

    return next;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeText(value = '') {
    return String(value).trim().toLocaleLowerCase();
}



function buildInitialWorld() {
    return {
        birdY: WORLD_HEIGHT * 0.42,
        birdVelocity: 0,
        pipes: [],
        spawnTimer: 0.75,
        nextPipeId: 1,
        pendingChallengeAfter: randomInt(1, 3),
        score: 0,
        hearts: START_HEARTS,
        correctAnswers: 0,
        wrongAnswers: 0,
        questionCount: 0,
        gameOverReason: '',
    };
}

function snapshotWorld(world) {
    return {
        ...world,
        pipes: world.pipes.map((pipe) => ({ ...pipe })),
    };
}

function buildPipe(world) {
    const gapTop = randomInt(88, WORLD_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 84);
    const hasChallenge = world.pendingChallengeAfter === 0;

    return {
        id: `pipe-${world.nextPipeId}`,
        x: WORLD_WIDTH + 48,
        gapTop,
        hasChallenge,
        challengeTriggered: false,
        safeAfterChallenge: false,
        passed: false,
    };
}

function createChoiceId(prefix, value) {
    return `${prefix}-${value}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildQuizChallenge(baseWord, words) {
    const distractors = shuffle(words.filter((word) => word.id !== baseWord.id)).slice(0, 3);
    const choices = shuffle([baseWord, ...distractors]).map((word) => ({
        id: createChoiceId('quiz', word.id),
        label: word.mean,
        meta: word.word,
        isCorrect: word.id === baseWord.id,
    }));

    return {
        id: createChoiceId('challenge', baseWord.id),
        type: 'quiz',
        wordId: baseWord.id,
        title: 'Quiz bất ngờ',
        prompt: `Chọn nghĩa đúng của "${baseWord.word}"`,
        choices,
        correctChoiceId: choices.find((choice) => choice.isCorrect)?.id || null,
    };
}

function buildReverseQuizChallenge(baseWord, words) {
    const distractors = shuffle(words.filter((word) => word.id !== baseWord.id)).slice(0, 3);
    const choices = shuffle([baseWord, ...distractors]).map((word) => ({
        id: createChoiceId('reverse-quiz', word.id),
        label: word.word,
        isCorrect: word.id === baseWord.id,
    }));

    return {
        id: createChoiceId('challenge', baseWord.id),
        type: 'reverse-quiz',
        wordId: baseWord.id,
        title: 'Quiz bất ngờ',
        prompt: `Chọn từ đúng với nghĩa "${baseWord.mean}"`,
        choices,
        correctChoiceId: choices.find((choice) => choice.isCorrect)?.id || null,
    };
}

function buildListeningChallenge(baseWord, words) {
    const distractors = shuffle(words.filter((word) => word.id !== baseWord.id)).slice(0, 3);
    const choices = shuffle([baseWord, ...distractors]).map((word) => ({
        id: createChoiceId('listen', word.id),
        label: word.mean,
        isCorrect: word.id === baseWord.id,
    }));

    return {
        id: createChoiceId('challenge', baseWord.id),
        type: 'listening',
        wordId: baseWord.id,
        title: 'Listening bất ngờ',
        prompt: 'Nghe và chọn từ bạn vừa nghe',
        listenText: baseWord.word,
        wordLanguage: baseWord.language,
        choices,
        correctChoiceId: choices.find((choice) => choice.isCorrect)?.id || null,
    };
}

function buildListeningWordChallenge(baseWord, words) {
    const distractors = shuffle(words.filter((word) => word.id !== baseWord.id)).slice(0, 3);
    const choices = shuffle([baseWord, ...distractors]).map((word) => ({
        id: createChoiceId('listen-word', word.id),
        label: word.word,
        isCorrect: word.id === baseWord.id,
    }));

    return {
        id: createChoiceId('challenge', baseWord.id),
        type: 'listening-word',
        wordId: baseWord.id,
        title: 'Listening bất ngờ',
        prompt: 'Nghe và chọn từ bạn vừa nghe',
        listenText: baseWord.word,
        wordLanguage: baseWord.language,
        choices,
        correctChoiceId: choices.find((choice) => choice.isCorrect)?.id || null,
    };
}

function buildTypingChallenge(baseWord) {
    return {
        id: createChoiceId('challenge', baseWord.id),
        type: 'typing',
        wordId: baseWord.id,
        title: 'Typing bất ngờ',
        prompt: `Gõ từ phù hợp với nghĩa "${baseWord.mean}"`,
        answer: normalizeText(baseWord.word),
        helper: baseWord.transcription || baseWord.example || '',
        inputPlaceholder: 'Nhập từ bạn nghĩ là đúng',
    };
}

function buildRandomChallenge(words, recentWordIds) {
    const recentSet = new Set(recentWordIds);
    const freshPool = words.filter((word) => !recentSet.has(word.id));
    const sourcePool = freshPool.length ? freshPool : words;
    const baseWord = shuffle(sourcePool)[0];

    if (!baseWord) return null;

    const availableTypes = ['quiz', 'reverse-quiz', 'listening', 'listening-word', 'typing'];
    const selectedType = availableTypes[randomInt(0, availableTypes.length - 1)];

    if (selectedType === 'reverse-quiz') {
        return buildReverseQuizChallenge(baseWord, words);
    }

    if (selectedType === 'listening-word') {
        return buildListeningWordChallenge(baseWord, words);
    }

    if (selectedType === 'listening') {
        return buildListeningChallenge(baseWord, words);
    }

    if (selectedType === 'typing') {
        return buildTypingChallenge(baseWord);
    }

    return buildQuizChallenge(baseWord, words);
}

function speakText(text, wordLanguage, topicLang) {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(wordLanguage, topicLang);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function heartLabel(hearts) {
    return Array.from({ length: START_HEARTS }, (_, index) => index < hearts);
}

function RequirementModal({ isOpen, title, message, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="cv-modal-overlay cv-modal-active">
            <div className="cv-modal-box flappy-requirement-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header">
                    <h3>{title}</h3>
                </div>
                <div className="cv-modal-body">
                    <p className="flappy-result-copy">{message}</p>
                </div>
                <div className="cv-modal-footer">
                    <button type="button" className="btn btn-primary" onClick={onClose}>
                        Đã hiểu
                    </button>
                </div>
            </div>
        </div>
    );
}

function GameChallengeModal({
    challenge,
    timeLeft,
    challengeValue,
    isArmed,
    onTypingChange,
    onChoiceSubmit,
    onTypingSubmit,
    onReplayAudio,
}) {
    if (!challenge) return null;

    return (
        <div className="cv-modal-overlay cv-modal-active flappy-challenge-overlay">
            <div className="cv-modal-box flappy-challenge-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header">
                    <div>
                        <h3>{challenge.title}</h3>
                        <p className="flappy-challenge-type">
                            {challenge.type === 'quiz' || challenge.type === 'reverse-quiz' ? 'Trắc nghiệm' : challenge.type === 'listening' || challenge.type === 'listening-word' ? 'Listening' : 'Typing'}
                        </p>
                    </div>
                    <div className={`flappy-timer${isArmed && timeLeft <= 10 ? ' is-danger' : ''}`}>
                        {isArmed ? `${timeLeft}s` : '...'}
                    </div>
                </div>
                <div className="cv-modal-body flappy-challenge-body">
                    <p className="flappy-challenge-prompt">{challenge.prompt}</p>

                    {challenge.type === 'listening' || challenge.type === 'listening-word' ? (
                        <button type="button" className="btn btn-secondary btn-small flappy-listen-btn" onClick={onReplayAudio} disabled={!isArmed}>
                            Nghe lại
                        </button>
                    ) : null}

                    {challenge.type === 'typing' ? (
                        <div className={`flappy-typing-wrap${isArmed ? '' : ' is-locked'}`}>
                            {challenge.helper ? (
                                <div className="flappy-typing-helper">
                                    {challenge.helper}
                                </div>
                            ) : null}
                            <input
                                className="cv-form-input"
                                value={challengeValue}
                                placeholder={challenge.inputPlaceholder}
                                disabled={!isArmed}
                                onChange={(event) => onTypingChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (isArmed && event.key === 'Enter') onTypingSubmit();
                                }}
                            />
                        </div>
                    ) : (
                        <div className={`flappy-choice-grid${isArmed ? '' : ' is-locked'}`}>
                            {challenge.choices.map((choice) => (
                                <button
                                    key={choice.id}
                                    type="button"
                                    className="flappy-choice-card"
                                    disabled={!isArmed}
                                    onClick={() => onChoiceSubmit(choice.id)}
                                >
                                    <strong>{choice.label}</strong>
                                    {challenge.type !== 'quiz' && challenge.type !== 'reverse-quiz' && choice.meta ? <span>{choice.meta}</span> : null}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {challenge.type === 'typing' ? (
                    <div className="cv-modal-footer cv-modal-footer-split">
                        <button type="button" className="btn btn-secondary" onClick={onReplayAudio} disabled={!isArmed}>
                            {challenge.helper ? 'Gợi ý âm thanh' : 'Nghe từ'}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={onTypingSubmit} disabled={!isArmed}>
                            Trả lời
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function GameOverModal({ isOpen, score, hearts, answered, correct, wrong, reason, onReplay, onBackSetup, onBackGallery }) {
    if (!isOpen) return null;

    return (
        <div className="cv-modal-overlay cv-modal-active">
            <div className="cv-modal-box flappy-result-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header">
                    <div className="flappy-result-head">
                        <span className="flappy-result-kicker">Kết thúc lượt chơi</span>
                        <h3>Game Over</h3>
                    </div>
                </div>
                <div className="cv-modal-body flappy-result-body">
                    <p className="flappy-result-copy">{GAME_OVER_COPY[reason] || 'Bạn đã kết thúc lượt chơi.'}</p>
                    <div className="flappy-result-hero">
                        <span>Điểm của bạn</span>
                        <strong>{score}</strong>
                    </div>
                    <div className="flappy-result-grid">
                        <div className="flappy-result-card">
                            <span>Tim còn lại</span>
                            <strong>{hearts}</strong>
                        </div>
                        <div className="flappy-result-card">
                            <span>Câu đã trả lời</span>
                            <strong>{answered}</strong>
                        </div>
                        <div className="flappy-result-card">
                            <span>Đúng</span>
                            <strong>{correct}</strong>
                        </div>
                        <div className="flappy-result-card">
                            <span>Sai</span>
                            <strong>{wrong}</strong>
                        </div>
                    </div>
                </div>
                <div className="cv-modal-footer cv-modal-footer-split flappy-result-actions">
                    <button type="button" className="btn btn-secondary" onClick={onBackSetup}>
                        Chọn lại
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onReplay}>
                        Chơi lại
                    </button>
                </div>
                <div className="cv-modal-footer flappy-result-footer">
                    <button type="button" className="btn btn-secondary btn-small" onClick={onBackGallery}>
                        Quay lại danh sách game
                    </button>
                </div>
            </div>
        </div>
    );
}



export default function FlappyBirdExperience({ topic, selectedBird = 'yellow', onBackGallery, onBackToPicker, onSessionComplete }) {
    const { user } = useAuth();
    const [phase, setPhase] = useState('playing');
    const [activeTopic, setActiveTopic] = useState(topic || null);
    const [worldSnapshot, setWorldSnapshot] = useState(() => snapshotWorld(buildInitialWorld()));
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [isChallengeArmed, setIsChallengeArmed] = useState(false);
    const [resumeCountdown, setResumeCountdown] = useState(null);
    const [hasRunStarted, setHasRunStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [challengeValue, setChallengeValue] = useState('');
    const completionRecordedRef = useRef(false);
    const worldRef = useRef(buildInitialWorld());
    const animationRef = useRef(null);
    const lastFrameRef = useRef(0);
    const recentWordIdsRef = useRef([]);
    const resumeSlowFallUntilRef = useRef(0);
    const pipeShieldTimeoutRef = useRef(null);
    const pipeShieldUntilRef = useRef(0);
    const [isPipeShieldActive, setIsPipeShieldActive] = useState(false);

    const selectedBirdOption = BIRD_OPTIONS.find((bird) => bird.id === selectedBird) || BIRD_OPTIONS[0];
    const selectedBirdImage = selectedBirdOption.gameImage || selectedBirdOption.image || birdYellowImage;
    const selectedBirdImageClassName = selectedBirdOption.gameClassName || '';

    const resetRun = () => {
        const nextWorld = buildInitialWorld();
        worldRef.current = nextWorld;
        recentWordIdsRef.current = [];
        resumeSlowFallUntilRef.current = 0;
        pipeShieldUntilRef.current = 0;
        if (pipeShieldTimeoutRef.current) {
            window.clearTimeout(pipeShieldTimeoutRef.current);
            pipeShieldTimeoutRef.current = null;
        }
        setIsPipeShieldActive(false);
        setWorldSnapshot(snapshotWorld(nextWorld));
        setActiveChallenge(null);
        setIsChallengeArmed(false);
        setResumeCountdown(null);
        setChallengeValue('');
        setHasRunStarted(false);
        setTimeLeft(QUESTION_TIME);
        completionRecordedRef.current = false;
    };

    useEffect(() => {
        setActiveTopic(topic || null);
        resetRun();
        setPhase('playing');
    }, [topic]);

    const handleBackToSetup = () => {
        window.speechSynthesis?.cancel();
        resetRun();
        setActiveTopic(topic || null);
        setPhase('playing');
        onBackToPicker?.();
    };

    const handleBackToGallery = () => {
        window.speechSynthesis?.cancel();
        resetRun();
        setActiveTopic(topic || null);
        setPhase('playing');
        onBackGallery?.();
    };

    const handleStart = () => {
        if (!topic?.words?.length) return;

        setActiveTopic(topic);
        resetRun();
        setPhase('playing');
    };

    const finishGame = (reason) => {
        const world = worldRef.current;
        world.gameOverReason = reason;
        setWorldSnapshot(snapshotWorld(world));
        setActiveChallenge(null);
        setPhase('gameover');
        if (!completionRecordedRef.current) {
            completionRecordedRef.current = true;
            recordGamePlay(getDashboardUserKey(user));
            onSessionComplete?.();
        }
        window.speechSynthesis?.cancel();
    };

    const resolveChallenge = (isCorrect) => {
        const world = worldRef.current;

        world.questionCount += 1;
        if (isCorrect) {
            playCorrectSound();
            world.correctAnswers += 1;
        } else {
            playIncorrectSound();
            world.wrongAnswers += 1;
            world.hearts -= 1;
        }

        setWorldSnapshot(snapshotWorld(world));
        setActiveChallenge(null);
        setIsChallengeArmed(false);
        setChallengeValue('');
        window.speechSynthesis?.cancel();

        if (!isCorrect && world.hearts <= 0) {
            finishGame('hearts');
            return;
        }

        setResumeCountdown(RESUME_DELAY);
    };

    const openChallenge = (pipe) => {
        if (!activeTopic?.words?.length) return;

        const challenge = buildRandomChallenge(activeTopic.words, recentWordIdsRef.current);
        if (!challenge) return;

        pipe.challengeTriggered = true;
        pipe.safeAfterChallenge = true;
        recentWordIdsRef.current = [...recentWordIdsRef.current, challenge.wordId].slice(-RECENT_WORD_LIMIT);
        setChallengeValue('');
        setTimeLeft(QUESTION_TIME);
        setIsChallengeArmed(false);
        setActiveChallenge(challenge);
    };

    useEffect(() => {
        if (!activeChallenge || (activeChallenge.type !== 'listening' && activeChallenge.type !== 'listening-word')) return undefined;

        const timeoutId = window.setTimeout(() => {
            speakText(activeChallenge.listenText, activeChallenge.wordLanguage, activeTopic?.lang || 'en');
        }, 120);

        return () => window.clearTimeout(timeoutId);
    }, [activeChallenge, activeTopic?.lang]);

    useEffect(() => {
        if (!activeChallenge) return undefined;

        const timeoutId = window.setTimeout(() => {
            setIsChallengeArmed(true);
        }, CHALLENGE_ARM_DELAY);

        return () => window.clearTimeout(timeoutId);
    }, [activeChallenge]);

    useEffect(() => {
        if (!activeChallenge || !isChallengeArmed) return undefined;

        const intervalId = window.setInterval(() => {
            setTimeLeft((current) => {
                if (current <= 1) {
                    window.clearInterval(intervalId);
                    resolveChallenge(false);
                    return 0;
                }

                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [activeChallenge, isChallengeArmed]);

    useEffect(() => {
        if (resumeCountdown === null) return undefined;

        const intervalId = window.setInterval(() => {
            setResumeCountdown((current) => {
                if (current === null) return null;
                if (current <= 1) {
                    window.clearInterval(intervalId);
                    resumeSlowFallUntilRef.current = performance.now() + RESUME_SLOW_FALL_MS;
                    pipeShieldUntilRef.current = performance.now() + RESUME_PIPE_SHIELD_MS;
                    setIsPipeShieldActive(true);
                    if (pipeShieldTimeoutRef.current) {
                        window.clearTimeout(pipeShieldTimeoutRef.current);
                    }
                    pipeShieldTimeoutRef.current = window.setTimeout(() => {
                        pipeShieldUntilRef.current = 0;
                        pipeShieldTimeoutRef.current = null;
                        setIsPipeShieldActive(false);
                    }, RESUME_PIPE_SHIELD_MS);
                    worldRef.current.birdVelocity = Math.min(
                        worldRef.current.birdVelocity,
                        RESUME_SLOW_FALL_MAX_VELOCITY,
                    );
                    return null;
                }

                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [resumeCountdown]);

    useEffect(() => {
        if (phase !== 'playing' || activeChallenge || resumeCountdown !== null || !activeTopic) return undefined;

        const tick = (timestamp) => {
            if (!lastFrameRef.current) {
                lastFrameRef.current = timestamp;
            }

            const world = worldRef.current;
            const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.032);
            lastFrameRef.current = timestamp;

            if (!hasRunStarted) {
                setWorldSnapshot(snapshotWorld(world));
                animationRef.current = window.requestAnimationFrame(tick);
                return;
            }

            const gravity = resumeSlowFallUntilRef.current > timestamp
                ? GRAVITY * RESUME_SLOW_FALL_GRAVITY_MULTIPLIER
                : GRAVITY;

            world.birdVelocity = Math.min(world.birdVelocity + gravity * delta, 580);
            world.birdY += world.birdVelocity * delta;
            world.spawnTimer -= delta;

            if (world.spawnTimer <= 0) {
                const nextPipe = buildPipe(world);
                world.pipes.push(nextPipe);
                world.nextPipeId += 1;
                world.spawnTimer = PIPE_INTERVAL;
                world.pendingChallengeAfter = nextPipe.hasChallenge ? randomInt(1, 3) : Math.max(0, world.pendingChallengeAfter - 1);
            }

            world.pipes.forEach((pipe) => {
                pipe.x -= PIPE_SPEED * delta;
            });

            const birdCenterY = world.birdY + (BIRD_SIZE / 2);
            const birdRight = BIRD_X + BIRD_SIZE;

            const triggerPipe = world.pipes.find((pipe) => (
                pipe.hasChallenge
                && !pipe.challengeTriggered
                && (pipe.x + (PIPE_WIDTH / 2)) <= BIRD_X + (BIRD_SIZE / 2)
                && birdCenterY > pipe.gapTop + 18
                && birdCenterY < pipe.gapTop + PIPE_GAP - 18
            ));

            if (triggerPipe) {
                openChallenge(triggerPipe);
                setWorldSnapshot(snapshotWorld(world));
                animationRef.current = window.requestAnimationFrame(tick);
                return;
            }

            const groundTop = WORLD_HEIGHT - GROUND_HEIGHT;
            const hitBounds = world.birdY <= 0 || (world.birdY + BIRD_SIZE) >= groundTop;

            if (hitBounds) {
                finishGame('collision');
                return;
            }

            const hasCollision = world.pipes.some((pipe) => {
                const overlapsX = birdRight > pipe.x && BIRD_X < (pipe.x + PIPE_WIDTH);
                if (!overlapsX) return false;
                if (pipeShieldUntilRef.current > timestamp) return false;

                return world.birdY < pipe.gapTop || (world.birdY + BIRD_SIZE) > (pipe.gapTop + PIPE_GAP);
            });

            if (hasCollision) {
                finishGame('collision');
                return;
            }

            world.pipes.forEach((pipe) => {
                if (!pipe.passed && (pipe.x + PIPE_WIDTH) < BIRD_X) {
                    pipe.passed = true;
                    world.score += 1;
                }
            });

            world.pipes = world.pipes.filter((pipe) => (pipe.x + PIPE_WIDTH) > -48);
            setWorldSnapshot(snapshotWorld(world));
            animationRef.current = window.requestAnimationFrame(tick);
        };

        animationRef.current = window.requestAnimationFrame(tick);

        return () => {
            if (animationRef.current) {
                window.cancelAnimationFrame(animationRef.current);
            }
            lastFrameRef.current = 0;
        };
    }, [activeChallenge, phase, activeTopic, hasRunStarted, resumeCountdown]);

    useEffect(() => {
        return () => {
            if (pipeShieldTimeoutRef.current) {
                window.clearTimeout(pipeShieldTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (phase !== 'playing') return undefined;

        const handleJumpKey = (event) => {
            if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
            event.preventDefault();
            if (activeChallenge || resumeCountdown !== null) return;
            if (!hasRunStarted) {
                setHasRunStarted(true);
            }
            worldRef.current.birdVelocity = JUMP_VELOCITY;
        };

        window.addEventListener('keydown', handleJumpKey);
        return () => window.removeEventListener('keydown', handleJumpKey);
    }, [activeChallenge, phase, hasRunStarted, resumeCountdown]);

    const handleSceneTap = () => {
        if (phase !== 'playing' || activeChallenge || resumeCountdown !== null) return;
        if (!hasRunStarted) {
            setHasRunStarted(true);
        }
        worldRef.current.birdVelocity = JUMP_VELOCITY;
    };

    const handleChoiceSubmit = (choiceId) => {
        if (!activeChallenge) return;
        resolveChallenge(choiceId === activeChallenge.correctChoiceId);
    };

    const handleTypingSubmit = () => {
        if (!activeChallenge || activeChallenge.type !== 'typing') return;

        const isCorrect = normalizeText(challengeValue) === activeChallenge.answer;
        resolveChallenge(isCorrect);
    };

    const handleReplayAudio = () => {
        if (!activeChallenge) return;

        if (activeChallenge.type === 'typing') {
            const targetWord = activeTopic?.words?.find((word) => word.id === activeChallenge.wordId);
            speakText(targetWord?.word, targetWord?.language, activeTopic?.lang || 'en');
            return;
        }

        if (activeChallenge.type === 'listening' || activeChallenge.type === 'listening-word') {
            speakText(activeChallenge.listenText, activeChallenge.wordLanguage, activeTopic?.lang || 'en');
        }
    };

    if (!activeTopic) {
        return (
            <section className="flappy-setup-shell">
                <div className="flappy-setup-panel flappy-empty-panel">
                    <h2>Không thể bắt đầu lượt chơi</h2>
                    <p>Bộ từ đã thuộc hiện tại không còn khả dụng. Hãy chọn lại bộ từ rồi bắt đầu lại.</p>
                    <button type="button" className="btn btn-secondary" onClick={handleBackToSetup}>
                        Quay lại chọn bộ từ
                    </button>
                </div>
            </section>
        );
    }

    const birdRotation = clamp((worldSnapshot.birdVelocity / 420) * 24, -28, 72);

    return (
        <section className="flappy-play-shell">
            <div className="flappy-game-topbar">
                <div className="flappy-game-context">
                    <div className="flappy-game-context-copy">
                        <span className="flappy-game-kicker">Flappy Bird</span>
                        <strong>{activeTopic.title}</strong>
                    </div>
                </div>
                <div className="flappy-topbar-actions">
                    <button type="button" className="btn btn-secondary btn-small" onClick={handleBackToSetup}>
                        Chọn lại
                    </button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={handleBackToGallery}>
                        Game khác
                    </button>
                </div>
            </div>

            <div className="flappy-game-shell">
                <div className="flappy-board">
                    <div
                        className="flappy-scene"
                        role="button"
                        tabIndex={0}
                        onMouseDown={handleSceneTap}
                        onTouchStart={handleSceneTap}
                        onKeyDown={(event) => {
                            if (event.key === ' ' || event.key === 'ArrowUp') {
                                event.preventDefault();
                                handleSceneTap();
                            }
                        }}
                    >
                        <div className="flappy-hud">
                            <div className="flappy-score-pill">
                                <span className="flappy-hud-label">Score</span>
                                <strong>{worldSnapshot.score}</strong>
                            </div>
                            <div className="flappy-hearts-wrap">
                                <span className="flappy-hud-label">Hearts</span>
                                <div className="flappy-hearts">
                                    {heartLabel(worldSnapshot.hearts).map((isFilled, index) => (
                                        <span key={`heart-${index}`} className={`flappy-heart${isFilled ? ' is-alive' : ' is-empty'}`}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <path d="M10.4107 19.9677C7.58942 17.858 2 13.0348 2 8.69444C2 5.82563 4.10526 3.5 7 3.5C8.5 3.5 10 4 12 6C14 4 15.5 3.5 17 3.5C19.8947 3.5 22 5.82563 22 8.69444C22 13.0348 16.4106 17.858 13.5893 19.9677C12.6399 20.6776 11.3601 20.6776 10.4107 19.9677Z" />
                                            </svg>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flappy-sky-layer"></div>
                        <div className="flappy-cloud cloud-a"></div>
                        <div className="flappy-cloud cloud-b"></div>
                        <div className="flappy-cloud cloud-c"></div>

                        {resumeCountdown !== null ? (
                            <div className="flappy-resume-overlay">
                                <span>Tiếp tục sau</span>
                                <strong>{resumeCountdown}</strong>
                            </div>
                        ) : null}

                        {worldSnapshot.pipes.map((pipe) => (
                            <div key={pipe.id}>
                                <div
                                    className={`flappy-pipe top${pipe.safeAfterChallenge ? ' is-safe' : ''}`}
                                    style={{
                                        left: `${(pipe.x / WORLD_WIDTH) * 100}%`,
                                        width: `${(PIPE_WIDTH / WORLD_WIDTH) * 100}%`,
                                        height: `${(pipe.gapTop / WORLD_HEIGHT) * 100}%`,
                                    }}
                                />
                                <div
                                    className={`flappy-pipe bottom${pipe.safeAfterChallenge ? ' is-safe' : ''}`}
                                    style={{
                                        left: `${(pipe.x / WORLD_WIDTH) * 100}%`,
                                        width: `${(PIPE_WIDTH / WORLD_WIDTH) * 100}%`,
                                        top: `${((pipe.gapTop + PIPE_GAP) / WORLD_HEIGHT) * 100}%`,
                                        height: `${((WORLD_HEIGHT - GROUND_HEIGHT - pipe.gapTop - PIPE_GAP) / WORLD_HEIGHT) * 100}%`,
                                    }}
                                />
                                {pipe.hasChallenge && !pipe.challengeTriggered ? (
                                    <div
                                        className="flappy-challenge-marker"
                                        style={{
                                            left: `${((pipe.x + (PIPE_WIDTH / 2)) / WORLD_WIDTH) * 100}%`,
                                            top: `${((pipe.gapTop + (PIPE_GAP / 2)) / WORLD_HEIGHT) * 100}%`,
                                        }}
                                        aria-hidden="true"
                                    >
                                        <span>?</span>
                                    </div>
                                ) : null}
                            </div>
                        ))}

                        <div
                            className={`flappy-bird${isPipeShieldActive ? ' is-pipe-shielded' : ''}`}
                            style={{
                                left: `${(BIRD_X / WORLD_WIDTH) * 100}%`,
                                top: `${(worldSnapshot.birdY / WORLD_HEIGHT) * 100}%`,
                                transform: `rotate(${birdRotation}deg)`,
                            }}
                        >
                            <img
                                className={`flappy-bird-image${selectedBirdImageClassName ? ` ${selectedBirdImageClassName}` : ''}`}
                                src={selectedBirdImage}
                                alt="Bird"
                            />
                        </div>

                        <div className="flappy-tap-hint">
                            {activeChallenge ? 'Tạm dừng để trả lời câu hỏi' : hasRunStarted ? 'Tap để flap' : 'Tap để bắt đầu'}
                        </div>

                        <div className="flappy-ground"></div>
                    </div>

                </div>
            </div>

            <GameChallengeModal
                challenge={activeChallenge}
                timeLeft={timeLeft}
                challengeValue={challengeValue}
                isArmed={isChallengeArmed}
                onTypingChange={setChallengeValue}
                onChoiceSubmit={handleChoiceSubmit}
                onTypingSubmit={handleTypingSubmit}
                onReplayAudio={handleReplayAudio}
            />

            <GameOverModal
                isOpen={phase === 'gameover'}
                score={worldSnapshot.score}
                hearts={worldSnapshot.hearts}
                answered={worldSnapshot.questionCount}
                correct={worldSnapshot.correctAnswers}
                wrong={worldSnapshot.wrongAnswers}
                reason={worldSnapshot.gameOverReason}
                onReplay={handleStart}
                onBackSetup={handleBackToSetup}
                onBackGallery={handleBackToGallery}
            />

        </section>
    );
}

export { BIRD_OPTIONS, GAME_CARD, GAME_ID };
