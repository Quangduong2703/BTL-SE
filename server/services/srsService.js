const {
  enqueueImmediateReviewsRpc,
  getDueReviewsByUserId,
  getReviewQueueByUserId,
  submitSrsReviewBatchRpc,
} = require('../models/srsModel');

async function fetchDueReviewsByUserId(userId) {
  return getDueReviewsByUserId(userId);
}

async function fetchReviewQueueByUserId(userId) {
  return getReviewQueueByUserId(userId);
}

async function enqueueImmediateReviewBatch(userId, flashcardIds) {
  const uniqueFlashcardIds = [...new Set((flashcardIds || []).filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueFlashcardIds.length === 0) return [];
  return enqueueImmediateReviewsRpc(userId, uniqueFlashcardIds);
}

async function saveReviewBatch(userId, reviewItems) {
  return submitSrsReviewBatchRpc(userId, reviewItems);
}

module.exports = {
  fetchDueReviewsByUserId,
  fetchReviewQueueByUserId,
  enqueueImmediateReviewBatch,
  saveReviewBatch,
};
