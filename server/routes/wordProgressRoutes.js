const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/wordProgressController');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

router.get('/', ctrl.getProgress);
router.post('/batch', ctrl.batchUpdate);
router.post('/toggle', ctrl.toggleWord);

module.exports = router;
