import { calculateSM2, SM2_DEFAULT_EF } from './sm2';
import { getUserScopedJson, setUserScopedJson } from './userStorage';

const SRS_KEY = 'vocabup_srs_queue_v1';

function getQueue() {
  return getUserScopedJson(SRS_KEY, []) || [];
}

function saveQueue(queue) {
  setUserScopedJson(SRS_KEY, queue);
}

function addDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function qualityToSm2Score(quality) {
  switch (quality) {
    case 'forgot':
      return 0;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
    default:
      throw new Error(`Unsupported SRS quality: ${quality}`);
  }
}

function formatIntervalLabel(days) {
  return `${days} ngày`;
}

function getItemEf(item) {
  return typeof item.ef === 'number' ? item.ef : (typeof item.easeFactor === 'number' ? item.easeFactor : SM2_DEFAULT_EF);
}

function getItemRepetitions(item) {
  const rep = item.repetition ?? item.repetitions;
  return Number.isInteger(rep) && rep >= 0 ? rep : 0;
}

function getPreviewSchedule(item, quality) {
  const sm2Quality = qualityToSm2Score(quality);
  return calculateSM2(
    sm2Quality,
    item.interval || 0,
    getItemEf(item),
    getItemRepetitions(item)
  );
}

export function addToSrs(word, topicId, courseId) {
  const queue = getQueue();
  const existingItem = queue.find((item) => item.wordId === word.id);

  if (existingItem) {
    existingItem.interval = 1;
    existingItem.repetition = 0;
    existingItem.ef = getItemEf(existingItem);
    existingItem.nextReview = addDays(1);
    existingItem.failCount = (existingItem.failCount || 0) + 1;
    saveQueue(queue);
    return;
  }

  queue.push({
    wordId: word.id,
    word: word.word,
    mean: word.mean,
    transcription: word.transcription || '',
    example: word.example || '',
    example_vi: word.example_vi || '',
    wordtype: word.wordtype || '',
    topicId,
    courseId,
    interval: 1,
    repetition: 0,
    ef: SM2_DEFAULT_EF,
    nextReview: addDays(1),
    addedAt: new Date().toISOString(),
    failCount: 0,
  });

  saveQueue(queue);
}

export function enqueueToSrsNow(word, topicId, courseId) {
  const queue = getQueue();
  const existingItem = queue.find((item) => item.wordId === word.id);
  const now = new Date().toISOString();

  if (existingItem) {
    existingItem.interval = 0;
    existingItem.repetition = 0;
    existingItem.ef = SM2_DEFAULT_EF;
    existingItem.nextReview = now;
    existingItem.failCount = (existingItem.failCount || 0) + 1;
    saveQueue(queue);
    return;
  }

  queue.push({
    wordId: word.id,
    word: word.word,
    mean: word.mean,
    transcription: word.transcription || '',
    example: word.example || '',
    example_vi: word.example_vi || '',
    wordtype: word.wordtype || '',
    topicId,
    courseId,
    interval: 0,
    repetition: 0,
    ef: SM2_DEFAULT_EF,
    nextReview: now,
    addedAt: now,
    failCount: 0,
  });

  saveQueue(queue);
}

export function addManyToSrs(words, topicId, courseId) {
  words.forEach((word) => addToSrs(word, topicId, courseId));
}

export function getDueItems() {
  const now = new Date().toISOString();
  return getQueue().filter((item) => item.nextReview <= now);
}

export function getDueCount() {
  return getDueItems().length;
}

export function getTotalSrsCount() {
  return getQueue().length;
}

export function getNextIntervalLabel(item, quality) {
  try {
    return formatIntervalLabel(getPreviewSchedule(item, quality).interval);
  } catch {
    return '?';
  }
}

export function reviewItem(wordId, quality) {
  const queue = getQueue();
  const itemIndex = queue.findIndex((item) => item.wordId === wordId);

  if (itemIndex === -1) return null;

  const item = { ...queue[itemIndex] };
  const schedule = getPreviewSchedule(item, quality);

  item.interval = schedule.interval;
  item.repetition = schedule.repetition;
  item.ef = schedule.ef;
  item.nextReview = schedule.nextReviewDate;
  item.lastReviewedAt = new Date().toISOString();

  if (quality === 'forgot') {
    item.failCount = (item.failCount || 0) + 1;
  }

  queue[itemIndex] = item;
  saveQueue(queue);
  return item;
}

export function removeFromSrs(wordId) {
  saveQueue(getQueue().filter((item) => item.wordId !== wordId));
}

export function getFullQueue() {
  return getQueue();
}

export function getSrsForecast() {
  const queue = getQueue();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const forecast = Array(7).fill(0);

  queue.forEach((item) => {
    const nextDate = new Date(item.nextReview);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      forecast[0] += 1;
    } else if (diffDays < 7) {
      forecast[diffDays] += 1;
    }
  });

  return forecast;
}

export function checkSrsDecayWarning() {
  const queue = getQueue();
  const now = new Date();

  let heavilyOverdueCount = 0;

  queue.forEach((item) => {
    const nextDate = new Date(item.nextReview);
    const diffTime = now - nextDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays > 3) {
      heavilyOverdueCount += 1;
    }
  });

  return heavilyOverdueCount;
}

export { calculateSM2 };
