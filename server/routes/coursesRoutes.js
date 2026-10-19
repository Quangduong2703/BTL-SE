const express = require('express');
const {
  getCourses,
  getCourseTopics,
} = require('../controllers/coursesController');
const {
  getTopics,
  getTopicWithWords,
  createTopic,
  updateTopic,
  deleteTopic,
  addWord,
  updateWord,
  deleteWord,
} = require('../controllers/customCoursesController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// ── Custom courses (auth required) — must be BEFORE /:id wildcard ──────────
router.get('/custom/topics', authMiddleware, getTopics);
router.post('/custom/topics', authMiddleware, createTopic);
router.get('/custom/topics/:topicId', authMiddleware, getTopicWithWords);
router.put('/custom/topics/:topicId', authMiddleware, updateTopic);
router.delete('/custom/topics/:topicId', authMiddleware, deleteTopic);

// Words in custom topics
router.post('/custom/topics/:topicId/words', authMiddleware, addWord);
router.put('/custom/topics/:topicId/words/:wordId', authMiddleware, updateWord);
router.delete('/custom/topics/:topicId/words/:wordId', authMiddleware, deleteWord);

// ── Built-in courses (public) ───────────────────────────────────────────────
router.get('/', getCourses);
router.get('/:id/topics', getCourseTopics);

module.exports = router;


