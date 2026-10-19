const { getAdminTopicById } = require('../models/adminTopicModel');
const {
  listAdminFlashcardsByTopic,
  getAdminFlashcardById,
  getAdminFlashcardByTopicAndWord,
  createAdminFlashcard,
  updateAdminFlashcard,
  deleteAdminFlashcard,
} = require('../models/adminFlashcardModel');
const { parseSearchQuery } = require('../utils/adminQuery');

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${fieldName} is required`), { status: 400 });
  }

  return value.trim();
}

function normalizeLanguage(value, fallback = 'en') {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!/^[a-z]{2,10}(?:-[a-z]{2,10})?$/.test(normalized)) {
    throw Object.assign(new Error('Language format is invalid'), { status: 400 });
  }
  return normalized;
}

async function ensureTopicExists(topicId) {
  const topic = await getAdminTopicById(topicId);
  if (!topic) {
    throw Object.assign(new Error('Topic not found'), { status: 404 });
  }
  return topic;
}

async function ensureUniqueWordInTopic(topicId, word, excludeFlashcardId = null) {
  const existing = await getAdminFlashcardByTopicAndWord(topicId, word);
  if (existing && Number(existing.id) !== Number(excludeFlashcardId)) {
    throw Object.assign(new Error('Word already exists in this topic'), { status: 400 });
  }
}

async function fetchAdminFlashcardsByTopic(topicId, query) {
  const parsedTopicId = Number.parseInt(topicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    throw Object.assign(new Error('Invalid topic id'), { status: 400 });
  }

  await ensureTopicExists(parsedTopicId);

  const search = parseSearchQuery(query);
  const items = await listAdminFlashcardsByTopic({
    topicId: parsedTopicId,
    search,
  });

  return {
    items,
    topicId: parsedTopicId,
    filters: {
      search,
    },
  };
}

async function fetchAdminFlashcard(flashcardId) {
  const parsedFlashcardId = Number.parseInt(flashcardId, 10);
  if (!Number.isFinite(parsedFlashcardId) || parsedFlashcardId <= 0) {
    throw Object.assign(new Error('Invalid flashcard id'), { status: 400 });
  }

  const flashcard = await getAdminFlashcardById(parsedFlashcardId);
  if (!flashcard) {
    throw Object.assign(new Error('Flashcard not found'), { status: 404 });
  }

  return flashcard;
}

async function createAdminFlashcardEntry(topicId, payload) {
  const parsedTopicId = Number.parseInt(topicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    throw Object.assign(new Error('Invalid topic id'), { status: 400 });
  }

  await ensureTopicExists(parsedTopicId);

  const word = normalizeRequiredText(payload?.word, 'Word');
  const meaning = normalizeRequiredText(payload?.meaning, 'Meaning');
  const transcription = normalizeOptionalText(payload?.transcription);
  const wordType = normalizeOptionalText(payload?.wordType);
  const example = normalizeOptionalText(payload?.example);
  const exampleVi = normalizeOptionalText(payload?.exampleVi);
  const language = normalizeLanguage(payload?.language, 'en');

  await ensureUniqueWordInTopic(parsedTopicId, word);

  return createAdminFlashcard({
    topicId: parsedTopicId,
    word,
    transcription,
    meaning,
    wordType,
    example,
    exampleVi,
    language,
  });
}

async function updateAdminFlashcardEntry(flashcardId, payload) {
  const parsedFlashcardId = Number.parseInt(flashcardId, 10);
  if (!Number.isFinite(parsedFlashcardId) || parsedFlashcardId <= 0) {
    throw Object.assign(new Error('Invalid flashcard id'), { status: 400 });
  }

  const existing = await getAdminFlashcardById(parsedFlashcardId);
  if (!existing) {
    throw Object.assign(new Error('Flashcard not found'), { status: 404 });
  }

  const word = normalizeRequiredText(payload?.word, 'Word');
  const meaning = normalizeRequiredText(payload?.meaning, 'Meaning');
  const transcription = normalizeOptionalText(payload?.transcription);
  const wordType = normalizeOptionalText(payload?.wordType);
  const example = normalizeOptionalText(payload?.example);
  const exampleVi = normalizeOptionalText(payload?.exampleVi);
  const language = normalizeLanguage(payload?.language, existing.language || 'en');

  await ensureUniqueWordInTopic(existing.topicId, word, parsedFlashcardId);

  await updateAdminFlashcard(parsedFlashcardId, {
    word,
    transcription,
    meaning,
    wordType,
    example,
    exampleVi,
    language,
  });

  return getAdminFlashcardById(parsedFlashcardId);
}

async function deleteAdminFlashcardEntry(flashcardId) {
  const parsedFlashcardId = Number.parseInt(flashcardId, 10);
  if (!Number.isFinite(parsedFlashcardId) || parsedFlashcardId <= 0) {
    throw Object.assign(new Error('Invalid flashcard id'), { status: 400 });
  }

  const existing = await getAdminFlashcardById(parsedFlashcardId);
  if (!existing) {
    throw Object.assign(new Error('Flashcard not found'), { status: 404 });
  }

  await deleteAdminFlashcard(parsedFlashcardId);

  return {
    success: true,
    deleted: existing,
  };
}

module.exports = {
  fetchAdminFlashcardsByTopic,
  fetchAdminFlashcard,
  createAdminFlashcardEntry,
  updateAdminFlashcardEntry,
  deleteAdminFlashcardEntry,
};
