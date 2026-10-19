const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { getDueReviews, getReviewQueue, enqueueImmediateReviews, reviewFlashcards } = require('../controllers/srsController');

const router = express.Router();

router.get('/due', authMiddleware, getDueReviews);
router.get('/queue', authMiddleware, getReviewQueue);
router.post('/enqueue', authMiddleware, enqueueImmediateReviews);
router.post('/review', authMiddleware, reviewFlashcards);

module.exports = router;
