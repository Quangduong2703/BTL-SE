const Joi = require('joi');
const { fetchFlashcardsByTopicSlug } = require('../services/topicsService');
const { setNoStore } = require('../lib/httpCache');

const topicSlugSchema = Joi.string()
  .trim()
  .pattern(/^[a-z0-9-]+$/)
  .required();

async function getTopicFlashcards(req, res, next) {
  try {
    const { error, value } = topicSlugSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const flashcards = await fetchFlashcardsByTopicSlug(value);
    setNoStore(res);
    res.json({ data: flashcards });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTopicFlashcards,
};
