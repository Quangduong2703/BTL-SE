const Joi = require('joi');
const { fetchDueReviewsByUserId, fetchReviewQueueByUserId, enqueueImmediateReviewBatch, saveReviewBatch } = require('../services/srsService');

const reviewPayloadSchema = Joi.array()
  .items(
    Joi.object({
      flashcard_id: Joi.number().integer().positive().required(),
      quality: Joi.number().integer().min(0).max(5).required(),
    })
  )
  .min(1)
  .required();

const enqueuePayloadSchema = Joi.object({
  flashcard_ids: Joi.array().items(Joi.number().integer().positive().required()).min(1).required(),
});

async function getDueReviews(req, res, next) {
  try {
    const dueReviews = await fetchDueReviewsByUserId(req.userId);
    res.json({ data: dueReviews });
  } catch (error) {
    next(error);
  }
}

async function getReviewQueue(req, res, next) {
  try {
    const reviewQueue = await fetchReviewQueueByUserId(req.userId);
    res.json({ data: reviewQueue });
  } catch (error) {
    next(error);
  }
}

async function reviewFlashcards(req, res, next) {
  try {
    const { error, value } = reviewPayloadSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ error: 'Invalid review payload' });
    }

    const updatedReviews = await saveReviewBatch(req.userId, value);
    res.json({ data: updatedReviews });
  } catch (error) {
    next(error);
  }
}

async function enqueueImmediateReviews(req, res, next) {
  try {
    const { error, value } = enqueuePayloadSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ error: 'Invalid enqueue payload' });
    }

    const queuedFlashcards = await enqueueImmediateReviewBatch(req.userId, value.flashcard_ids);
    res.json({ data: queuedFlashcards });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDueReviews,
  getReviewQueue,
  enqueueImmediateReviews,
  reviewFlashcards,
};
