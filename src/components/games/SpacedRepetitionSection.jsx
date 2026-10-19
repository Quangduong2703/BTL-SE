import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getDueItems as getLocalDueItems,
  getFullQueue as getLocalFullQueue,
  getNextIntervalLabel as getLocalNextIntervalLabel,
  getTotalSrsCount as getLocalTotalSrsCount,
  reviewItem as reviewLocalItem,
} from '../../utils/srsStorage';
import {
  fetchDueReviews,
  fetchReviewQueue,
  hasServerSrsAccess,
  mapReviewRatingToQualityScore,
  submitSrsReviewBatch,
} from '../../utils/srsApi';
import { calculateSM2 } from '../../utils/sm2';
import { addXp } from '../../utils/xpSystem';
import CustomModal from '../customDocs/CustomModal';

const RATINGS = [
  { key: 'forgot', label: 'Quên hoàn toàn', emoji: '😰', className: 'rating-btn rating-forgot', desc: 'Ôn lại sớm theo SM-2' },
  { key: 'hard', label: 'Nhớ mang máng', emoji: '😅', className: 'rating-btn rating-hard', desc: 'Nhớ khó, tăng chậm hơn' },
  { key: 'good', label: 'Nhớ tốt', emoji: '😊', className: 'rating-btn rating-good', desc: 'Tăng theo nhịp SM-2 chuẩn' },
  { key: 'easy', label: 'Quá dễ', emoji: '🚀', className: 'rating-btn rating-easy', desc: 'Tăng nhanh nhất' },
];

const REVIEW_THEME = {
  front: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  back: 'linear-gradient(135deg, #2dd4bf 0%, #3b82f6 100%)',
};

function formatIntervalLabel(days) {
  return `${days} ngày`;
}

function getServerNextIntervalLabel(item, rating) {
  const schedule = calculateSM2(
    mapReviewRatingToQualityScore(rating),
    item.interval || 0,
    item.ef || 2.5,
    item.repetition || 0
  );
  return formatIntervalLabel(schedule.interval);
}

function mapServerDueItem(item) {
  return {
    wordId: item.flashcardId ?? item.reviewId,
    flashcardId: item.flashcardId,
    word: item.word,
    mean: item.mean,
    transcription: item.transcription,
    example: item.example,
    example_vi: item.example_vi,
    wordtype: item.wordtype,
    interval: Number(item.interval ?? 0),
    ef: Number(item.ef ?? 2.5),
    repetition: Number(item.repetition ?? 0),
    nextReview: item.nextReviewDate || item.next_review_date || null,
  };
}

function mapLocalDueItem(item) {
  return {
    wordId: item.wordId,
    flashcardId: item.flashcardId ?? null,
    word: item.word,
    mean: item.mean,
    transcription: item.transcription,
    example: item.example,
    example_vi: item.example_vi,
    wordtype: item.wordtype,
    interval: Number(item.interval ?? 0),
    ef: Number(item.ef ?? 2.5),
    repetition: Number(item.repetition ?? 0),
    nextReview: item.nextReview || null,
  };
}

function mergeReviewItems(primaryItems = [], secondaryItems = []) {
  const merged = [];
  const seen = new Set();

  [...primaryItems, ...secondaryItems].forEach((item) => {
    if (!item) return;
    const key = String(item.wordId ?? item.flashcardId ?? '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function ReviewHero({ dueCount, totalCount, totalCountLabel }) {
  return (
    <section className="review-hero review-hero-collapsed">
      <div>
        <span className="review-eyebrow">Spaced Repetition</span>
        <h1>Ôn tập đúng lúc với SM-2</h1>
        <p className="review-hero-caption">Một khu ôn tập riêng cho các từ đã đến hạn hôm nay.</p>
      </div>

      <div className="review-hero-stats">
        <div className="review-hero-stat">
          <strong>{dueCount}</strong>
          <span>Đến hạn hôm nay</span>
        </div>
        <div className="review-hero-stat">
          <strong>{totalCount}</strong>
          <span>{totalCountLabel}</span>
        </div>
      </div>
    </section>
  );
}

function FlashcardCard({ item, flipped, onFlip }) {
  return (
    <div className="flashcard-stage review-stage">
      <div className={`flashcard-card review-card-shell${flipped ? ' is-flipped' : ''}`}>
        <div
          className="flashcard-card-inner review-card-inner-shell"
          onClick={onFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onFlip();
            }
          }}
        >
          <div className="flashcard-face flashcard-face-front review-card-front-shell" style={{ background: REVIEW_THEME.front }}>
            <div className="flashcard-face-topline">Spaced Repetition</div>
            <div className="flashcard-face-center">
              <span className="review-card-hint">Bạn còn nhớ nghĩa của từ này không?</span>
              <strong className="flashcard-word review-card-word">{item.word}</strong>
              {item.wordtype ? <span className="flashcard-wordtype flashcard-wordtype-front">{item.wordtype}</span> : null}
              {item.transcription ? <span className="flashcard-transcription review-card-trans">{item.transcription}</span> : null}
            </div>
            <div className="flashcard-face-hint flashcard-face-hint-spaced">Nhấn space hoặc click để lật thẻ</div>
          </div>

          <div className="flashcard-face flashcard-face-back review-card-back-shell" style={{ background: REVIEW_THEME.back }}>
            <div className="flashcard-back-layout">
              <div className="flashcard-face-topline">Nghĩa tiếng Việt</div>
              <div className="flashcard-back-center">
                <span className="review-card-meaning-label">Nghĩa</span>
                <strong className="flashcard-meaning flashcard-meaning-hero review-card-meaning">{item.mean}</strong>
                {item.wordtype ? <span className="review-card-type">{item.wordtype}</span> : null}
                {item.example ? <p className="review-card-example">"{item.example}"</p> : null}
              </div>
              <div className="flashcard-face-hint flashcard-face-hint-back">Nhấn space hoặc click để lật lại</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingButtons({ item, onRate, useServerSrs }) {
  return (
    <div className="flashcard-actions review-rating-grid">
      {RATINGS.map((rating) => (
        <button
          key={rating.key}
          className={`btn btn-primary flashcard-action-btn review-rating-btn ${rating.className}`}
          onClick={() => onRate(rating.key)}
          title={rating.desc}
        >
          <span className="rating-label">{rating.label}</span>
          <span className="rating-next">
            {useServerSrs
              ? getServerNextIntervalLabel(item, rating.key)
              : getLocalNextIntervalLabel(item, rating.key)}
          </span>
        </button>
      ))}
    </div>
  );
}

function FeedbackBanner({ quality, nextLabel, onNext, isLast }) {
  const config = {
    forgot: { cls: 'feedback-miss', icon: '😰', msg: 'Không sao. Bạn sẽ gặp lại từ này sớm.' },
    hard: { cls: 'feedback-miss', icon: '😅', msg: 'Cần luyện thêm. Ôn lại sau một chút.' },
    good: { cls: 'feedback-ok', icon: '✓', msg: 'Tốt lắm. Bạn đang đi đúng nhịp ôn tập.' },
    easy: { cls: 'feedback-ok', icon: '🚀', msg: 'Xuất sắc. Từ này sẽ được giãn lịch mạnh hơn.' },
  }[quality];

  return (
    <div className={`review-answer-feedback ${config.cls}`}>
      <p>
        <strong>{config.msg}</strong>{' '}
        Ôn lại sau <strong>{nextLabel}</strong>.
      </p>
      <button className="btn btn-primary flashcard-action-btn flashcard-action-btn-compact review-next-btn" onClick={onNext}>
        {isLast ? 'Xem kết quả' : 'Từ tiếp theo'}
      </button>
    </div>
  );
}

function ReviewSession({ dueItems, onFinish, onReviewed, useServerSrs }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratedQuality, setRatedQuality] = useState(null);
  const [nextLabel, setNextLabel] = useState('');
  const [results, setResults] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const advanceTimeoutRef = useRef(null);

  const item = dueItems[index];
  const correctCount = results.filter((entry) => entry.quality === 'good' || entry.quality === 'easy').length;
  const reviewFlashcardId = Number(item?.flashcardId ?? item?.flashcard_id ?? item?.wordId ?? item?.id);

  const handleRate = useCallback(async (quality) => {
    if (ratedQuality || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      let label;
      let updatedQueueItem = null;

      if (useServerSrs) {
        if (!Number.isInteger(reviewFlashcardId) || reviewFlashcardId <= 0) {
          throw new Error('Missing server flashcard id');
        }

        const updated = await submitSrsReviewBatch([
          { flashcard_id: reviewFlashcardId, quality: mapReviewRatingToQualityScore(quality) },
        ]);
        const scheduledItem = updated[0];
        label = scheduledItem ? formatIntervalLabel(scheduledItem.interval) : getServerNextIntervalLabel(item, quality);
        updatedQueueItem = scheduledItem
          ? mapServerDueItem({
            ...item,
            ...scheduledItem,
            word: scheduledItem.word || item.word,
            mean: scheduledItem.mean || item.mean,
            transcription: scheduledItem.transcription || item.transcription,
            wordtype: scheduledItem.wordtype || item.wordtype,
            example: item.example,
            example_vi: item.example_vi,
          })
          : null;
      } else {
        label = getLocalNextIntervalLabel(item, quality);
        updatedQueueItem = reviewLocalItem(item.wordId, quality);
      }

      if (quality === 'good') addXp(8, 'SRS nhớ tốt');
      else if (quality === 'easy') addXp(15, 'SRS quá dễ');
      else if (quality === 'hard') addXp(3, 'SRS nhớ mang máng');

      const nextResults = [...results, { wordId: item.wordId, quality }];
      setRatedQuality(quality);
      setNextLabel(label);
      setResults(nextResults);
      onReviewed?.();
      advanceTimeoutRef.current = setTimeout(() => {
        if (index < dueItems.length - 1) {
          setIndex((current) => current + 1);
          setFlipped(false);
          setRatedQuality(null);
          setNextLabel('');
          return;
        }

        onFinish(nextResults);
      }, 900);
    } catch (error) {
      console.error('Failed to submit SRS review.', error);
      setSubmitError(error?.message || 'Không thể lưu kết quả ôn tập. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [dueItems.length, index, isSubmitting, item, onFinish, onReviewed, ratedQuality, reviewFlashcardId, results, useServerSrs]);

  useEffect(() => () => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
    }
  }, []);

  return (
    <div className="review-session flashcard-shell review-session-shell">
      <div className="review-progress-bar-wrap">
        <div className="review-progress-bar">
          <div className="review-progress-fill" style={{ width: `${(index / dueItems.length) * 100}%` }} />
        </div>
        <span className="review-progress-label">{index + 1} / {dueItems.length}</span>
      </div>

      <FlashcardCard
        item={item}
        flipped={flipped}
        onFlip={() => {
          if (!ratedQuality) setFlipped((current) => !current);
        }}
      />

      {!ratedQuality ? <RatingButtons item={item} onRate={handleRate} useServerSrs={useServerSrs} /> : null}

      {submitError ? (
        <div className="review-answer-feedback feedback-miss" role="alert">
          <p>
            <strong>Không thể lưu kết quả ôn tập.</strong>{' '}
            {submitError}
          </p>
        </div>
      ) : null}

      {ratedQuality ? (
        <FeedbackBanner
          quality={ratedQuality}
          nextLabel={nextLabel}
        />
      ) : null}

      <div className="review-live-stats">
        <span className="review-stat-ok">✓ {correctCount} nhớ tốt</span>
        <span className="review-stat-miss">✕ {results.length - correctCount} cần ôn lại</span>
        <span className="review-stat-remaining">🃏 {dueItems.length - index - 1} còn lại</span>
      </div>
    </div>
  );
}

function ReviewResult({ results, dueItems, onRestart, onGoHome }) {
  const correct = results.filter((entry) => entry.quality === 'good' || entry.quality === 'easy').length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const message = pct >= 80
    ? 'Tuyệt vời. Trí nhớ của bạn đang rất tốt.'
    : pct >= 50
      ? 'Khá tốt. Hãy tiếp tục giữ nhịp ôn đều.'
      : 'Chưa sao. Ôn lại thêm vài vòng là sẽ ổn hơn.';

  const ratingCount = (quality) => results.filter((entry) => entry.quality === quality).length;

  return (
    <div className="review-result">
      <h2 className="review-result-title">Phiên ôn tập hoàn thành</h2>
      <p className="review-result-msg">{message}</p>

      <div className="review-result-stats">
        <div className="review-result-stat">
          <strong>{total}</strong>
          <span>Từ đã ôn</span>
        </div>
        <div className="review-result-stat review-result-stat-ok">
          <strong>{correct}</strong>
          <span>Nhớ tốt</span>
        </div>
        <div className="review-result-stat review-result-stat-miss">
          <strong>{total - correct}</strong>
          <span>Cần ôn lại</span>
        </div>
        <div className="review-result-stat">
          <strong>{pct}%</strong>
          <span>Tỉ lệ nhớ</span>
        </div>
      </div>

      <div className="review-result-breakdown">
        {RATINGS.map((rating) => (
          <div key={rating.key} className={`breakdown-item breakdown-${rating.key}`}>
            <span className="breakdown-label">{rating.label}</span>
            <span className="breakdown-count">{ratingCount(rating.key)}</span>
          </div>
        ))}
      </div>

      <div className="review-result-words">
        {dueItems.map((item) => {
          const result = results.find((entry) => entry.wordId === item.wordId);
          const quality = result?.quality || 'forgot';
          const isOk = quality === 'good' || quality === 'easy';
          return (
            <div key={item.wordId} className={`review-result-word ${isOk ? 'ok' : 'miss'}`}>
              <span className="review-result-word-main">{item.word}</span>
              <span className="review-result-word-mean">{item.mean}</span>
              <span className="review-result-word-quality">{RATINGS.find((rating) => rating.key === quality)?.label}</span>
            </div>
          );
        })}
      </div>

      <div className="review-result-actions">
        <button className="btn btn-primary" onClick={onRestart}>Ôn lại danh sách này</button>
        <button className="btn btn-secondary" onClick={onGoHome}>Quay về Dashboard</button>
      </div>
    </div>
  );
}

function EmptyState({ useServerSrs }) {
  const title = useServerSrs ? 'Chưa có từ nào đến hạn ôn tập' : 'Hàng đợi ôn tập đang trống';
  const desc = useServerSrs
    ? 'Khi có từ đến hạn từ backend SRS, chúng sẽ xuất hiện tại đây.'
    : 'Hãy học và đánh dấu vài từ trước, sau đó hệ thống sẽ tự lên lịch ôn.';

  return (
    <div className="review-empty">
      <div className="review-empty-icon">📭</div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}

function getLocalDateStamp(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatReviewDate(value) {
  return new Date(value).toLocaleDateString('vi-VN');
}

function buildUpcomingGroups(queue, dueItems = []) {
  const todayStamp = getLocalDateStamp(new Date());
  const groups = new Map();

  const todayItems = [...dueItems]
    .filter((item) => item)
    .sort((a, b) => new Date(a.nextReview || 0) - new Date(b.nextReview || 0));

  if (todayItems.length > 0) {
    groups.set('today', {
      key: 'today',
      label: 'Hôm nay',
      stamp: todayStamp,
      items: todayItems,
    });
  }

  [...queue]
    .filter((item) => item?.nextReview && getLocalDateStamp(item.nextReview) > todayStamp)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
    .forEach((item) => {
      const dateKey = new Date(item.nextReview).toISOString().slice(0, 10);
      if (!groups.has(dateKey)) {
        const itemStamp = getLocalDateStamp(item.nextReview);
        groups.set(dateKey, {
          key: dateKey,
          label: itemStamp === todayStamp ? 'Hôm nay' : formatReviewDate(item.nextReview),
          stamp: itemStamp,
          items: [],
        });
      }

      groups.get(dateKey).items.push(item);
    });

  return [...groups.values()].sort((a, b) => a.stamp - b.stamp);
}

function UpcomingWordsModal({ group, onClose }) {
  return (
    <CustomModal
      isOpen={Boolean(group)}
      onClose={onClose}
      title={group ? `Từ cần ôn ngày ${group.label}` : 'Từ cần ôn'}
      boxClassName="review-upcoming-modal"
    >
      <div className="cv-modal-body review-upcoming-modal-body">
        {group ? (
          <>
            <p className="review-upcoming-modal-copy">
              Có <strong>{group.items.length}</strong> từ cần ôn trong ngày này.
            </p>
            <div className="review-upcoming-modal-list">
              {group.items.map((item) => (
                <div key={`${group.key}-${item.wordId}`} className="review-upcoming-modal-item">
                  <div className="review-upcoming-modal-main">
                    <strong>{item.word}</strong>
                    <span>{item.mean}</span>
                  </div>
                  {item.wordtype ? <em>{item.wordtype}</em> : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="cv-modal-footer">
        <button type="button" className="btn btn-primary" onClick={onClose}>Đóng</button>
      </div>
    </CustomModal>
  );
}

function UpcomingSection({ queue, dueItems }) {
  const upcomingGroups = useMemo(() => buildUpcomingGroups(queue, dueItems), [queue, dueItems]);
  const [activeGroupKey, setActiveGroupKey] = useState(null);

  const activeGroup = useMemo(
    () => upcomingGroups.find((group) => group.key === activeGroupKey) || null,
    [activeGroupKey, upcomingGroups]
  );

  if (upcomingGroups.length === 0) return null;

  return (
    <>
      <section className="review-upcoming">
        <div className="review-upcoming-head">
          <div>
            <h3>Lịch ôn sắp tới</h3>
            <p>Chọn một ngày để xem danh sách từ cần ôn tương ứng.</p>
          </div>
          <span className="review-upcoming-total">{upcomingGroups.length} ngày</span>
        </div>
        <div className="review-upcoming-list review-upcoming-days">
          {upcomingGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              className="review-upcoming-item review-upcoming-day-btn"
              onClick={() => setActiveGroupKey(group.key)}
            >
              <strong>{group.label}</strong>
              <span className="review-upcoming-day-count">{group.items.length} từ cần ôn</span>
            </button>
          ))}
        </div>
      </section>
      <UpcomingWordsModal group={activeGroup} onClose={() => setActiveGroupKey(null)} />
    </>
  );
}

export default function SpacedRepetitionSection({ variant = 'preview', onOpen, onClose, onGoHome }) {
  const useServerSrs = hasServerSrsAccess();
  const [srsSource, setSrsSource] = useState(useServerSrs ? 'server' : 'local');
  const [dueItems, setDueItems] = useState([]);
  const [fullQueue, setFullQueue] = useState([]);
  const [status, setStatus] = useState('loading');
  const [sessionKey, setSessionKey] = useState(0);
  const [results, setResults] = useState(null);

  const totalCount = useMemo(() => (
    srsSource === 'server' ? dueItems.length : getLocalTotalSrsCount()
  ), [dueItems.length, srsSource, sessionKey]);
  const totalCountLabel = useMemo(() => (
    srsSource === 'server' ? 'Thẻ trong phiên này' : 'Tổng số thẻ'
  ), [srsSource]);

  const loadData = useCallback(async () => {
    setStatus('loading');

    if (useServerSrs) {
      try {
        const [dueItemsFromServer, queueItemsFromServer] = await Promise.all([
          fetchDueReviews(),
          fetchReviewQueue(),
        ]);
        const serverDueItems = dueItemsFromServer.map(mapServerDueItem).filter((item) => item.flashcardId);
        const serverQueueItems = queueItemsFromServer.map(mapServerDueItem).filter((item) => item.flashcardId);

        if (serverDueItems.length > 0 || serverQueueItems.length > 0) {
          setSrsSource('server');
          setDueItems(serverDueItems);
          setFullQueue(serverQueueItems);
          setStatus('ready');
          return;
        }
      } catch (error) {
        console.error('Failed to load server SRS queue.', error);
      }
    }

    setSrsSource('local');
    setDueItems(getLocalDueItems().map(mapLocalDueItem));
    setFullQueue(getLocalFullQueue().map(mapLocalDueItem));
    setStatus('ready');
  }, [useServerSrs]);

  useEffect(() => {
    loadData();
  }, [loadData, sessionKey]);

  const handleRestart = () => {
    setResults(null);
    setSessionKey((current) => current + 1);
  };

  const handleReviewedItem = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (variant === 'preview') {
    return (
      <div
        id="page-review-preview"
        className="review-page review-page-preview review-page-trigger"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen?.();
          }
        }}
      >
        <ReviewHero
          dueCount={dueItems.length}
          totalCount={totalCount}
          totalCountLabel={totalCountLabel}
        />
      </div>
    );
  }

  return (
    <div id="page-review" className="review-page review-screen-standalone">
      <section className="review-screen-inline-topbar">
        <div className="review-screen-title-wrap">
          <span className="review-screen-kicker">Spaced Repetition</span>
          <h2>Màn hình ôn tập</h2>
        </div>
        <button type="button" className="btn btn-secondary review-screen-close" onClick={onClose}>
          Đóng
        </button>
      </section>

      {status === 'loading' ? (
        <div className="review-empty">
          <div className="review-empty-icon">⏳</div>
          <p>Đang tải danh sách ôn tập...</p>
        </div>
      ) : results ? (
        <ReviewResult
          results={results}
          dueItems={dueItems}
          onRestart={handleRestart}
          onGoHome={onGoHome}
        />
      ) : dueItems.length > 0 ? (
        <ReviewSession
          key={sessionKey}
          dueItems={dueItems}
          onFinish={setResults}
          onReviewed={handleReviewedItem}
          useServerSrs={srsSource === 'server'}
        />
      ) : (
        <EmptyState useServerSrs={useServerSrs} />
      )}

      <UpcomingSection queue={fullQueue} dueItems={dueItems} />
    </div>
  );
}
