const express = require('express');
const { proxyAiChatCompletion } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat/completions', proxyAiChatCompletion);

module.exports = router;
