const {
  getWordProgressByUser,
  batchUpdateWordProgress,
  toggleWordProgress,
} = require('../models/wordProgressModel');

async function fetchWordProgress(userId) {
  return getWordProgressByUser(userId);
}

async function batchUpdate(userId, updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw Object.assign(new Error('updates must be a non-empty array'), { status: 400 });
  }
  await batchUpdateWordProgress(userId, updates);
}

async function toggleWord(userId, flashcardId, isRemembered) {
  await toggleWordProgress(userId, flashcardId, isRemembered);
}

module.exports = {
  fetchWordProgress,
  batchUpdate,
  toggleWord,
};
