const express = require('express');
const { getTopicFlashcards } = require('../controllers/topicsController');

const router = express.Router();

router.get('/:id/flashcards', getTopicFlashcards);

module.exports = router;
