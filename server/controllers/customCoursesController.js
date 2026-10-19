const svc = require('../services/customCoursesService');

// ── Topics ─────────────────────────────────────────────────────────────────

async function getTopics(req, res, next) {
  try {
    const topics = await svc.fetchCustomTopics(req.userId);
    res.json({ data: topics });
  } catch (e) { next(e); }
}

async function getTopicWithWords(req, res, next) {
  try {
    const topic = await svc.fetchCustomTopicWithWords(req.userId, req.params.topicId);
    res.json({ data: topic });
  } catch (e) { next(e); }
}

async function createTopic(req, res, next) {
  try {
    const topic = await svc.createTopic(req.userId, req.body);
    res.status(201).json({ data: topic });
  } catch (e) { next(e); }
}

async function updateTopic(req, res, next) {
  try {
    await svc.updateTopic(req.userId, req.params.topicId, req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function deleteTopic(req, res, next) {
  try {
    await svc.deleteTopic(req.userId, req.params.topicId);
    res.json({ success: true });
  } catch (e) { next(e); }
}

// ── Words ──────────────────────────────────────────────────────────────────

async function addWord(req, res, next) {
  try {
    const word = await svc.addWord(req.userId, req.params.topicId, req.body);
    res.status(201).json({ data: word });
  } catch (e) { next(e); }
}

async function updateWord(req, res, next) {
  try {
    await svc.updateWord(req.userId, req.params.topicId, req.params.wordId, req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function deleteWord(req, res, next) {
  try {
    await svc.deleteWord(req.userId, req.params.topicId, req.params.wordId);
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = {
  getTopics,
  getTopicWithWords,
  createTopic,
  updateTopic,
  deleteTopic,
  addWord,
  updateWord,
  deleteWord,
};
