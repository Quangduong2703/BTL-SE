const MIN_EF = 1.3;
const DEFAULT_EF = 2.5;

function assertIntegerInRange(value, min, max, fieldName) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}`);
  }
}

function normalizeNonNegativeNumber(value, fallback, fieldName) {
  if (value == null) return fallback;
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return value;
}

function normalizeNonNegativeInteger(value, fallback, fieldName) {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
}

function addDaysFromToday(days) {
  const nextReviewDate = new Date();
  nextReviewDate.setHours(0, 0, 0, 0);
  nextReviewDate.setDate(nextReviewDate.getDate() + days);
  return nextReviewDate.toISOString();
}

export function calculateSM2(quality, interval, ef, repetition) {
  assertIntegerInRange(quality, 0, 5, 'quality');

  const currentInterval = normalizeNonNegativeNumber(interval, 0, 'interval');
  const currentEf = normalizeNonNegativeNumber(ef, DEFAULT_EF, 'ef');
  const currentRepetition = normalizeNonNegativeInteger(repetition, 0, 'repetition');

  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const nextEf = Math.max(MIN_EF, Number((currentEf + efDelta).toFixed(2)));

  let nextInterval = 1;
  let nextRepetition = 0;

  if (quality >= 3) {
    nextRepetition = currentRepetition + 1;

    if (nextRepetition === 1) {
      nextInterval = quality === 3 ? 2 : quality === 4 ? 4 : 7;
    } else if (nextRepetition === 2) {
      nextInterval = quality === 3 ? 4 : quality === 4 ? 7 : 10;
    } else {
      const qualityMultiplier = quality === 3 ? 0.85 : quality === 4 ? 1 : 1.2;
      nextInterval = Math.max(1, Math.round(currentInterval * currentEf * qualityMultiplier));
    }
  }

  return {
    interval: nextInterval,
    ef: nextEf,
    repetition: nextRepetition,
    nextReviewDate: addDaysFromToday(nextInterval),
  };
}

export const SM2_DEFAULT_EF = DEFAULT_EF;
export const SM2_MIN_EF = MIN_EF;
