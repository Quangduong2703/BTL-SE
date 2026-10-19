import { buildApiUrl } from './apiClient';

const QUALITY_SCORE_MAP = {
  forgot: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  const directToken = localStorage.getItem('token');
  if (directToken) return directToken;

  const user = getStoredUser();
  return user?.token || user?.stsTokenManager?.accessToken || null;
}

export function getAuthToken() {
  return getStoredToken();
}

export function hasServerSrsAccess() {
  return Boolean(getAuthToken());
}

function buildAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Missing auth token');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }
  return payload;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFlashcardIds(flashcardIds) {
  return [...new Set((flashcardIds || []).map(normalizePositiveInteger).filter(Boolean))];
}

function normalizeReviewItems(reviewItems) {
  return (reviewItems || [])
    .map((item) => {
      if (!item) return null;

      const flashcardId = normalizePositiveInteger(item.flashcard_id ?? item.flashcardId ?? item.id);
      const quality = Number(item.quality);

      if (!flashcardId || !Number.isInteger(quality) || quality < 0 || quality > 5) {
        return null;
      }

      return {
        flashcard_id: flashcardId,
        quality,
      };
    })
    .filter(Boolean);
}

export async function fetchDueReviews() {
  const response = await fetch(buildApiUrl('srs/due'), {
    headers: buildAuthHeaders(),
  });
  const payload = await parseJsonResponse(response, 'Khong the tai danh sach on tap.');
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function fetchReviewQueue() {
  const response = await fetch(buildApiUrl('srs/queue'), {
    headers: buildAuthHeaders(),
  });
  const payload = await parseJsonResponse(response, 'Khong the tai hang doi on tap.');
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function enqueueImmediateReviews(flashcardIds) {
  const normalizedFlashcardIds = normalizeFlashcardIds(flashcardIds);
  if (normalizedFlashcardIds.length === 0) {
    return [];
  }

  const response = await fetch(buildApiUrl('srs/enqueue'), {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ flashcard_ids: normalizedFlashcardIds }),
  });
  const payload = await parseJsonResponse(response, 'Khong the dua tu vao hang doi SRS.');
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function submitSrsReviewBatch(reviewItems) {
  const normalizedReviewItems = normalizeReviewItems(reviewItems);
  if (normalizedReviewItems.length === 0) {
    throw new Error('Invalid review payload');
  }

  const response = await fetch(buildApiUrl('srs/review'), {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(normalizedReviewItems),
  });
  const payload = await parseJsonResponse(response, 'Khong the luu ket qua on tap.');
  return Array.isArray(payload.data) ? payload.data : [];
}

export function mapReviewRatingToQualityScore(rating) {
  const score = QUALITY_SCORE_MAP[rating];
  if (typeof score !== 'number') {
    throw new Error(`Unsupported review rating: ${rating}`);
  }
  return score;
}

export function hasServerFlashcardId(word) {
  return normalizePositiveInteger(word?.flashcardId) !== null;
}
