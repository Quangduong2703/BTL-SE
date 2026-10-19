import { useEffect, useMemo, useRef, useState } from 'react';
import { playSoftCorrectSound, playSoftIncorrectSound } from '../../utils/feedbackAudio';
import '../../assets/css/rain-game.css';
/* eslint-disable react-hooks/exhaustive-deps */

const MIN_PLAYABLE_WORDS = 2;
const START_LIVES = 3;
const TARGET_TIME_LIMIT_MS = 30000;
const SPAWN_INTERVAL_DESKTOP = 560;
const SPAWN_INTERVAL_TABLET = 620;
const SPAWN_INTERVAL_MOBILE = 680;

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function normalizeWordItem(word) {
  if (!word) return null;
  const id = word.id ?? word.flashcardId ?? word.wordId ?? word.word;
  const text = String(word.word || '').trim();
  const mean = String(word.mean || '').trim();

  if (!id || !text || !mean) return null;

  return {
    ...word,
    id,
    word: text,
    mean,
  };
}

function dedupeWords(words = []) {
  const seen = new Set();
  return words
    .map(normalizeWordItem)
    .filter(Boolean)
    .filter((word) => {
      const key = `${String(word.word).trim().toLowerCase()}__${String(word.mean).trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getDeviceProfile(width) {
  if (width >= 1200) {
    return { laneCount: 6, speedMin: 88, speedMax: 136, fontScale: 1, wordWidth: 150, lanePadding: 0.06, driftMax: 18, overlapFactor: 1.04 };
  }

  if (width >= 768) {
    return { laneCount: 5, speedMin: 80, speedMax: 124, fontScale: 0.95, wordWidth: 140, lanePadding: 0.08, driftMax: 16, overlapFactor: 1.02 };
  }

  return { laneCount: 5, speedMin: 68, speedMax: 110, fontScale: 0.95, wordWidth: 114, lanePadding: 0.08, driftMax: 12, overlapFactor: 0.98 };
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function VocabularyRainExperience({
  words = [],
  topicTitle = '',
  sourceTitle = '',
  onExit,
  onBackToTopic,
  onSessionComplete,
}) {
  const playableWords = useMemo(() => dedupeWords(words), [words]);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [_boardWidth, setBoardWidth] = useState(960);
  const [boardHeight, setBoardHeight] = useState(540);
  const [status, setStatus] = useState('ready');
  const [boardDrops, setBoardDrops] = useState([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);

  const boardRef = useRef(null);
  const animationRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const lastTickRef = useRef(0);
  const boardWidthRef = useRef(960);
  const boardHeightRef = useRef(540);
  const deviceProfileRef = useRef(getDeviceProfile(viewportWidth));
  const dropsRef = useRef([]);
  const deckRef = useRef([]);
  const deckIndexRef = useRef(0);
  const gameStartedAtRef = useRef(0);
  const sessionNotifiedRef = useRef(false);
  const wrongCountRef = useRef(0);
  const currentTargetRef = useRef(null);
  const activeTargetIdRef = useRef(null);
  const targetStartedAtRef = useRef(0);
  const timedOutTargetIdRef = useRef(null);

  const deviceProfile = useMemo(() => getDeviceProfile(viewportWidth), [viewportWidth]);
  const targetRounds = useMemo(() => {
    if (playableWords.length < MIN_PLAYABLE_WORDS) return 0;
    return playableWords.length;
  }, [playableWords.length]);

  useEffect(() => {
    deviceProfileRef.current = deviceProfile;
  }, [deviceProfile]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateBoardSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const nextWidth = rect.width || 960;
      const nextHeight = rect.height || 540;
      boardWidthRef.current = nextWidth;
      boardHeightRef.current = nextHeight;
      setBoardWidth(nextWidth);
      setBoardHeight(nextHeight);
    };

    updateBoardSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBoardSize);
      return () => window.removeEventListener('resize', updateBoardSize);
    }

    const observer = new ResizeObserver(updateBoardSize);
    if (boardRef.current) observer.observe(boardRef.current);

    return () => observer.disconnect();
  }, []);

  const clearFeedback = () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const clearSpawnTimer = () => {
    if (spawnTimerRef.current) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
  };

  const syncDrops = (nextDrops) => {
    dropsRef.current = nextDrops;
    setBoardDrops(nextDrops);
  };

  const getMaxActiveDrops = () => {
    if (viewportWidth <= 560) return 7;
    if (viewportWidth <= 768) return 6;
    return 7;
  };

  const getDropBounds = (wordText = '') => {
    const width = boardWidthRef.current || 960;
    const profile = deviceProfileRef.current;
    const isMobile = viewportWidth <= 560;
    const textLength = String(wordText || '').trim().length;
    const textDrivenWidth = isMobile
      ? 20 + (textLength * 8.8)
      : 24 + (textLength * 8.6);
    const minLayoutWidth = (profile.wordWidth || 120) + (isMobile ? 20 : 34);
    const estimatedWidth = Math.max(
      minLayoutWidth,
      textDrivenWidth,
      Math.min(width * (isMobile ? 0.28 : 0.28), isMobile ? 196 : 240),
    );
    const estimatedHeight = Math.max(isMobile ? 50 : 48, Math.round(estimatedWidth * (isMobile ? 0.36 : 0.3)));
    const scale = deviceProfileRef.current.fontScale || 1;
    return {
      halfWidth: (estimatedWidth * scale) / 2,
      halfHeight: (estimatedHeight * scale) / 2,
    };
  };

  const clampDropPosition = (x, y, bounds) => {
    const { halfWidth, halfHeight } = bounds || getDropBounds();
    const width = boardWidthRef.current || 960;
    const height = boardHeightRef.current || 540;
    const safeX = viewportWidth <= 560 ? 14 : viewportWidth <= 768 ? 12 : 10;
    const safeY = viewportWidth <= 560 ? 26 : viewportWidth <= 768 ? 18 : 10;
    const minX = halfWidth + safeX;
    const maxX = width - halfWidth - safeX;
    const minY = halfHeight + safeY;
    const maxY = height - halfHeight - safeY;
    return {
      x: Math.max(Math.min(minX, maxX), Math.min(Math.max(minX, maxX), x)),
      y: Math.max(Math.min(minY, maxY), Math.min(Math.max(minY, maxY), y)),
    };
  };

  const getSpawnInterval = () => {
    const width = viewportWidth;
    if (width >= 1200) return SPAWN_INTERVAL_DESKTOP;
    if (width >= 768) return SPAWN_INTERVAL_TABLET;
    return 560;
  };

  const refillDeck = () => {
    if (!deckRef.current.length || deckIndexRef.current >= deckRef.current.length) {
      deckRef.current = shuffle(playableWords);
      deckIndexRef.current = 0;
    }
  };

  const getNextTarget = () => {
    refillDeck();
    const nextTarget = deckRef.current[deckIndexRef.current];
    if (!nextTarget) return null;
    deckIndexRef.current += 1;
    return nextTarget;
  };

  const buildDrop = (word, isCorrect, startY) => {
    const profile = deviceProfileRef.current;
    const width = boardWidthRef.current || 960;
    const laneCount = Math.max(1, profile.laneCount);
    const laneIndex = Math.floor(Math.random() * laneCount);
    const lanePadding = Math.min(width * (profile.lanePadding || 0), width * (viewportWidth <= 560 ? 0.1 : 0.16));
    const laneAreaWidth = Math.max(0, width - (lanePadding * 2));
    const laneCenter = lanePadding + (((laneIndex + 0.5) / laneCount) * laneAreaWidth);
    const spread = Math.max(12, Math.min(width * (viewportWidth <= 560 ? 0.1 : 0.08), viewportWidth <= 560 ? 54 : 86));
    const rawX = laneCenter + ((Math.random() - 0.5) * spread);
    const bounds = getDropBounds(word?.word);
    const rawY = typeof startY === 'number' ? startY : bounds.halfHeight + (viewportWidth <= 560 ? 16 : 10);
    const clamped = clampDropPosition(rawX, rawY, bounds);
    const speedBase = profile.speedMin + (Math.random() * (profile.speedMax - profile.speedMin));

    return {
      key: `${word.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      word,
      isCorrect,
      x: clamped.x,
      y: clamped.y,
      halfWidth: bounds.halfWidth,
      halfHeight: bounds.halfHeight,
      speed: isCorrect ? speedBase * 0.98 : speedBase,
      drift: (Math.random() - 0.5) * (profile.driftMax || (width >= 768 ? 18 : 12)),
    };
  };

  const spawnCorrectTarget = (target) => {
    if (!target) return null;
    const nextDrop = buildDrop(target, true);
    const nextDrops = [...(dropsRef.current || []), nextDrop].slice(-getMaxActiveDrops());
    syncDrops(nextDrops);
    return nextDrop;
  };

  const spawnDistractor = (target) => {
    const pool = playableWords.filter((word) => word.id !== target?.id);
    if (!pool.length) return null;
    const word = shuffle(pool)[0];
    const nextDrop = buildDrop(word, false);
    const nextDrops = [...(dropsRef.current || []), nextDrop].slice(-getMaxActiveDrops());
    syncDrops(nextDrops);
    return nextDrop;
  };

  const setActiveTarget = (target) => {
    currentTargetRef.current = target || null;
    activeTargetIdRef.current = target?.id ?? null;
    targetStartedAtRef.current = target ? performance.now() : 0;
    timedOutTargetIdRef.current = null;
    setCurrentTarget(target || null);
  };

  const finishSession = (nextResult) => {
    if (sessionNotifiedRef.current) return;
    sessionNotifiedRef.current = true;
    const elapsed = typeof nextResult.elapsed === 'number'
      ? nextResult.elapsed
      : (gameStartedAtRef.current ? performance.now() - gameStartedAtRef.current : 0);

    clearFeedback();
    clearSpawnTimer();
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    currentTargetRef.current = null;
    activeTargetIdRef.current = null;
    targetStartedAtRef.current = 0;
    timedOutTargetIdRef.current = null;
    syncDrops([]);
    setResult({ ...nextResult, elapsed });
    setStatus(nextResult.status);
    onSessionComplete?.();
  };

  const advanceToNextTarget = (options = {}) => {
    if (status !== 'playing') return null;
    const nextTarget = getNextTarget();
    if (!nextTarget) {
      finishSession({
        status: 'result',
        title: 'Hoàn thành Mưa từ vựng',
        reason: 'completed',
      });
      return null;
    }

    setActiveTarget(nextTarget);
    if (options.spawnNow !== false) {
      spawnCorrectTarget(nextTarget);
    }
    return nextTarget;
  };

  const beginGame = () => {
    if (!playableWords.length) return;
    setStatus('playing');
  };

  const handlePauseGame = () => {
    if (status !== 'playing') return;
    setStatus('paused');
  };

  const handleResumeGame = () => {
    if (status !== 'paused') return;
    setStatus('playing');
  };

  const handleExitGame = () => {
    handleRestart();
    (onBackToTopic || onExit)?.();
  };

  const handleCorrect = (drop) => {
    if (status !== 'playing' || drop.word.id !== activeTargetIdRef.current) return;

    const nextStreak = streak + 1;
    const bonus = 10 + Math.min(10, nextStreak * 2);
    const elapsed = performance.now() - gameStartedAtRef.current;

    playSoftCorrectSound();
    setScore((prev) => prev + bonus);
    setCorrectCount((prev) => prev + 1);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    setStreak(nextStreak);
    setFeedback({
      tone: 'success',
      text: `Đúng rồi! +${bonus} điểm`,
    });
    syncDrops(dropsRef.current.filter((item) => item.key !== drop.key));

    if (correctCount + 1 >= targetRounds) {
      finishSession({
        status: 'result',
        title: 'Hoàn thành Mưa từ vựng',
        reason: 'completed',
        elapsed,
      });
      return;
    }

    advanceToNextTarget({ spawnNow: true });
  };

  const handleDropClick = (drop) => {
    if (status !== 'playing') return;

    if (drop.isCorrect) {
      handleCorrect(drop);
      return;
    }

    playSoftIncorrectSound();
    setFeedback({
      tone: 'warn',
      text: `Sai rồi: ${drop.word.mean}`,
    });

    const nextWrongCount = wrongCountRef.current + 1;
    wrongCountRef.current = nextWrongCount;
    setWrongCount(nextWrongCount);
    setStreak(0);
    syncDrops(dropsRef.current.filter((item) => item.key !== drop.key));

    if (nextWrongCount >= START_LIVES) {
      finishSession({
        status: 'gameover',
        title: 'Game over',
        reason: 'wrong-click',
      });
    }
  };

  const handleRestart = () => {
    clearFeedback();
    clearSpawnTimer();
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setStatus('ready');
    setBoardDrops([]);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    wrongCountRef.current = 0;
    setStreak(0);
    setBestStreak(0);
    setCurrentTarget(null);
    currentTargetRef.current = null;
    activeTargetIdRef.current = null;
    targetStartedAtRef.current = 0;
    timedOutTargetIdRef.current = null;
    setFeedback(null);
    setResult(null);
    gameStartedAtRef.current = 0;
    sessionNotifiedRef.current = false;
    deckRef.current = shuffle(playableWords);
    deckIndexRef.current = 0;
    syncDrops([]);
  };

  useEffect(() => {
    if (status !== 'playing' || !playableWords.length || targetRounds < MIN_PLAYABLE_WORDS) {
      return undefined;
    }

    clearFeedback();
    clearSpawnTimer();
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const isFreshStart = gameStartedAtRef.current === 0;

    if (isFreshStart) {
    deckRef.current = shuffle(playableWords);
    deckIndexRef.current = 0;
    sessionNotifiedRef.current = false;
    gameStartedAtRef.current = performance.now();
    wrongCountRef.current = 0;
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setBestStreak(0);
    setResult(null);
    syncDrops([]);

    const firstTarget = getNextTarget();
    if (!firstTarget) {
      finishSession({
        status: 'result',
        title: 'Hoàn thành Mưa từ vựng',
        reason: 'completed',
      });
      return undefined;
    }

    setActiveTarget(firstTarget);
    spawnCorrectTarget(firstTarget);
    spawnDistractor(firstTarget);
    }

    const scheduleSpawnTick = () => {
      clearSpawnTimer();
      spawnTimerRef.current = window.setTimeout(() => {
        if (status !== 'playing') return;

        const target = currentTargetRef.current;
        if (!target) {
          scheduleSpawnTick();
          return;
        }

        const activeDrops = dropsRef.current;
        const hasTargetDrop = activeDrops.some((drop) => drop.isCorrect && drop.word.id === target.id);
        if (!hasTargetDrop) {
          spawnCorrectTarget(target);
        } else if (activeDrops.length < getMaxActiveDrops()) {
          spawnDistractor(target);
        }

        scheduleSpawnTick();
      }, getSpawnInterval());
    };

    scheduleSpawnTick();

    return () => {
      clearSpawnTimer();
    };
  }, [playableWords, status, targetRounds]);

  useEffect(() => {
    if (status !== 'playing' || !boardHeight) return undefined;

    const tick = (now) => {
      if (!lastTickRef.current) {
        lastTickRef.current = now;
      }

      const dt = Math.min(0.032, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      const target = currentTargetRef.current;
      if (
        target
        && targetStartedAtRef.current
        && timedOutTargetIdRef.current !== target.id
        && (now - targetStartedAtRef.current) >= TARGET_TIME_LIMIT_MS
      ) {
        timedOutTargetIdRef.current = target.id;
        playSoftIncorrectSound();

        const nextWrongCount = wrongCountRef.current + 1;
        wrongCountRef.current = nextWrongCount;
        setWrongCount(nextWrongCount);
        setStreak(0);
        setFeedback({
          tone: nextWrongCount >= START_LIVES ? 'danger' : 'warn',
          text: `Hết 30 giây: ${target.word}`,
        });

        const nextDropsAfterTimeout = dropsRef.current.filter((drop) => drop.word.id !== target.id);
        syncDrops(nextDropsAfterTimeout);

        if (nextWrongCount >= START_LIVES) {
          finishSession({
            status: 'gameover',
            title: 'Game over',
            reason: 'timeout',
          });
          animationRef.current = window.requestAnimationFrame(tick);
          return;
        }

        advanceToNextTarget({ spawnNow: true });
        animationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const prevDrops = dropsRef.current;
      if (!prevDrops.length) {
        animationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const nextDrops = [];

      for (const drop of prevDrops) {
        const nextY = drop.y + (drop.speed * dt);
        const halfWidth = drop.halfWidth || getDropBounds(drop.word?.word).halfWidth;
        const halfHeight = drop.halfHeight || getDropBounds(drop.word?.word).halfHeight;
        const safeX = viewportWidth <= 560 ? 14 : viewportWidth <= 768 ? 12 : 10;
        const safeY = viewportWidth <= 560 ? 16 : 10;
        const minX = halfWidth + safeX;
        const maxX = boardWidthRef.current - halfWidth - safeX;
        const minY = halfHeight + safeY;
        const maxY = boardHeightRef.current - halfHeight - safeY;

        if (nextY > maxY) {
          continue;
        }

        const nextX = Math.max(minX, Math.min(maxX, drop.x + (drop.drift * dt * 0.18)));
        const nextClampedY = Math.max(minY, Math.min(maxY, nextY));

        nextDrops.push({
          ...drop,
          x: nextX,
          y: nextClampedY,
        });
      }

      syncDrops(nextDrops);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
      lastTickRef.current = 0;
    };
  }, [boardHeight, status]);

  useEffect(() => () => {
    clearFeedback();
    clearSpawnTimer();
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
    }
  }, []);

  if (!playableWords.length || targetRounds < MIN_PLAYABLE_WORDS) {
    return (
      <section className="rain-game-shell">
        <div className="rain-empty-state">
          <span className="rain-empty-icon">⛈️</span>
          <h3>Chưa đủ từ để chơi Mưa từ vựng</h3>
          <p>Hãy chọn topic hoặc tài liệu có ít nhất 2 từ để bắt đầu.</p>
          <button type="button" className="btn btn-secondary" onClick={onBackToTopic || onExit}>
            Quay lại
          </button>
        </div>
      </section>
    );
  }

  if (status === 'ready') {
    return (
      <section className="rain-game-shell rain-game-shell--ready">
        <div className="rain-ready-topbar">
          <button type="button" className="rain-back-btn" onClick={onBackToTopic || onExit}>
            <span aria-hidden="true">←</span>
            <span>Quay lại</span>
          </button>
          <div className="rain-ready-brand">Mưa từ vựng</div>
          <div className="rain-ready-spacer" />
        </div>

        <div className="rain-ready-card">
          <div className="rain-ready-avatar" aria-hidden="true">
            <span>🌦️</span>
          </div>
          <div className="rain-ready-badge">Chủ đề đã chọn</div>
          <h2>{topicTitle || 'Mưa từ vựng'}</h2>
          <p className="rain-ready-subtitle">
            {sourceTitle || 'Chọn từ đúng với nghĩa đang hiển thị bên dưới.'}
          </p>

          <div className="rain-ready-illustration">
            <span className="rain-ready-cloud" aria-hidden="true">☁️</span>
            <span className="rain-ready-rocket" aria-hidden="true">🚀</span>
            <span className="rain-ready-cloud is-second" aria-hidden="true">☁️</span>
          </div>

          <div className="rain-ready-instructions">
            <div className="rain-ready-note">Chọn từ đang rơi khớp với nghĩa bên dưới.</div>
            <div className="rain-ready-warning">Sai 3 lần là game over.</div>
          </div>

          <button type="button" className="btn btn-primary rain-ready-start" onClick={beginGame}>
            Bắt đầu
          </button>
        </div>
      </section>
    );
  }

  const resultPayload = result || (status === 'playing' || status === 'paused'
    ? null
    : {
        status,
        title: status === 'gameover' ? 'Game over' : 'Hoàn thành Mưa từ vựng',
        reason: status,
      });

  const progressValue = targetRounds > 0 ? Math.min(100, (correctCount / targetRounds) * 100) : 0;
  const remainingLives = Math.max(0, START_LIVES - wrongCount);

  if (resultPayload && status !== 'playing' && status !== 'paused') {
    const elapsedMs = result?.elapsed || 0;

    return (
      <section className="rain-game-shell rain-game-shell--result">
        <div className="rain-result-card">
          <h2>{resultPayload.status === 'gameover' ? 'Ôi, mưa đã tạnh sớm' : 'Trời đã hửng nắng!'}</h2>
          <p className="rain-result-copy">
            {resultPayload.status === 'gameover'
              ? 'Bạn đã sai quá 3 lần. Thử lại để phản xạ nhanh hơn nhé.'
              : 'Bạn đã vượt qua cơn mưa từ vựng với một lượt chơi rất đẹp.'}
          </p>
          <div className="rain-result-score">
            <span>Tổng điểm</span>
            <strong>{score}</strong>
          </div>
          <div className="rain-result-grid">
            <div className="rain-result-stat">
              <span>Đúng</span>
              <strong>{correctCount}</strong>
            </div>
            <div className="rain-result-stat">
              <span>Sai</span>
              <strong>{wrongCount}</strong>
            </div>
            <div className="rain-result-stat">
              <span>Streak cao nhất</span>
              <strong>{bestStreak}</strong>
            </div>
            <div className="rain-result-stat">
              <span>Thời gian</span>
              <strong>{formatTime(elapsedMs)}</strong>
            </div>
          </div>
          <div className="rain-result-quote">“Mỗi lần đúng là một từ vựng bám lại lâu hơn.”</div>
          <div className="rain-result-actions">
            <button type="button" className="btn btn-primary" onClick={handleRestart}>
              Chơi lại
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBackToTopic || onExit}>
              Chọn topic khác
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rain-game-shell rain-game-shell--playing">
      <header className="rain-game-topbar rain-game-topbar--floating">
        <button
          type="button"
          className="rain-icon-btn"
          onClick={onBackToTopic || onExit}
          aria-label="Quay lại"
          title="Quay lại"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="rain-game-brand">
          <span>Mưa từ vựng</span>
        </div>

        <button
          type="button"
          className="rain-icon-btn"
          aria-label={status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          title={status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          onClick={status === 'paused' ? handleResumeGame : handlePauseGame}
        >
          <span aria-hidden="true">{status === 'paused' ? '▶' : '❚❚'}</span>
        </button>
      </header>

      <div className="rain-hud-anchor">
        <div className="rain-hud-pill">
          <div className="rain-hud-stat">
            <span>SCORE</span>
            <strong>{score.toLocaleString('vi-VN')}</strong>
          </div>
          <div className="rain-hud-divider" />
          <div className="rain-hud-stat rain-hud-stat--streak">
            <span>STREAK</span>
            <strong>{streak}x <span aria-hidden="true">🔥</span></strong>
          </div>
        </div>
      </div>

      <div className="rain-game-board-wrap">
        <div className="rain-game-board" ref={boardRef}>
          <div className="rain-sky-gradient" />
          <div className="rain-rainfall" />
          <div className="rain-cloud rain-cloud-a" />
          <div className="rain-cloud rain-cloud-b" />
          <div className="rain-cloud rain-cloud-c" />
          <div className="rain-streaks" />

          {boardDrops.map((drop) => (
            <button
              key={drop.key}
              type="button"
              className="rain-drop"
              style={{
                left: `${drop.x}px`,
                top: `${drop.y}px`,
                transform: `translate(-50%, -50%) scale(${deviceProfile.fontScale})`,
                minWidth: `${deviceProfile.wordWidth}px`,
              }}
              onClick={() => handleDropClick(drop)}
            >
              <strong>{drop.word.word}</strong>
            </button>
          ))}

          <div className="rain-bottom-glow" />
        </div>

        <section className={`rain-target-panel ${feedback?.tone ? `is-${feedback.tone}` : ''}`}>
          <div className="rain-target-kicker-wrap">
            <span className="rain-target-kicker">Tìm từ có nghĩa là:</span>
            <strong className="rain-target-meaning">{currentTarget?.mean || 'Đang nạp...'}</strong>
          </div>

          <div className="rain-target-hearts" aria-label={`Còn ${remainingLives} lượt sai`}>
            {Array.from({ length: START_LIVES }, (_, index) => (
              <span
                key={`heart-${index}`}
                className={`rain-heart${index < remainingLives ? ' is-active' : ''}`}
                aria-hidden="true"
              >
                ♥
              </span>
            ))}
          </div>

          <div className="rain-progress-bar" aria-hidden="true">
            <div className="rain-progress-fill" style={{ width: `${progressValue}%` }} />
          </div>
        </section>
      </div>

      {status === 'paused' ? (
        <div className="rain-pause-overlay">
          <div className="rain-pause-modal" role="dialog" aria-modal="true" aria-labelledby="rain-pause-title">
            <div className="rain-pause-icon" aria-hidden="true">⏸</div>
            <h3 id="rain-pause-title">Đã tạm dừng</h3>
            <p>Trò chơi đang dừng lại. Bạn có thể tiếp tục hoặc thoát ra ngoài.</p>
            <div className="rain-pause-actions">
              <button type="button" className="btn btn-primary" onClick={handleResumeGame}>
                Tiếp tục
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleExitGame}>
                Thoát
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedback && feedback.tone !== 'info' ? <div className={`rain-floating-feedback is-${feedback.tone}`}>{feedback.text}</div> : null}
    </section>
  );
}
