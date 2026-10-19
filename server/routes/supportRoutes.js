const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { createSupport } = require('../controllers/supportController');

const router = express.Router();

router.post('/', authMiddleware, createSupport);

module.exports = router;
