const svc = require('../services/wordProgressService');

async function getProgress(req, res, next) {
  try {
    const data = await svc.fetchWordProgress(req.userId);
    res.json({ data });
  } catch (e) { next(e); }
}

async function batchUpdate(req, res, next) {
  try {
    const { updates } = req.body;
    await svc.batchUpdate(req.userId, updates);
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function toggleWord(req, res, next) {
  try {
    const { flashcard_id, is_remembered } = req.body;
    await svc.toggleWord(req.userId, flashcard_id, is_remembered);
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = { getProgress, batchUpdate, toggleWord };
