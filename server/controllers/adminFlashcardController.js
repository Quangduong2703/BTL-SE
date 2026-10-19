const {
  fetchAdminFlashcardsByTopic,
  fetchAdminFlashcard,
  createAdminFlashcardEntry,
  updateAdminFlashcardEntry,
  deleteAdminFlashcardEntry,
} = require('../services/adminFlashcardService');
const { invalidateCourseCache } = require('../services/coursesService');
const { invalidateTopicCache } = require('../services/topicsService');

async function getFlashcardsByTopic(req, res, next) {
  try {
    const data = await fetchAdminFlashcardsByTopic(req.params.topicId, req.query);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getFlashcard(req, res, next) {
  try {
    const data = await fetchAdminFlashcard(req.params.flashcardId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function createFlashcard(req, res, next) {
  try {
    const data = await createAdminFlashcardEntry(req.params.topicId, req.body);
    invalidateCourseCache();
    invalidateTopicCache();
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function updateFlashcard(req, res, next) {
  try {
    const data = await updateAdminFlashcardEntry(req.params.flashcardId, req.body);
    invalidateCourseCache();
    invalidateTopicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function deleteFlashcard(req, res, next) {
  try {
    const data = await deleteAdminFlashcardEntry(req.params.flashcardId);
    invalidateCourseCache();
    invalidateTopicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFlashcardsByTopic,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
};
