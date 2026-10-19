const express = require('express');
const { getProgress, addXP, getLeaderboard, recordVocabActivity } = require('../controllers/progressController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getProgress);
router.post('/add-xp', authMiddleware, addXP);
router.post('/vocab-activity', authMiddleware, recordVocabActivity);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
