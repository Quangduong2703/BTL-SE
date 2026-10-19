const {
  fetchUserProgress,
  addXpService,
  fetchLeaderboard,
  recordVocabActivityService,
} = require('../services/progressService');

async function getProgress(req, res, next) {
  try {
    const progress = await fetchUserProgress(req.userId);
    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
}

async function addXP(req, res, next) {
  try {
    const xpToAdd = req.body.xp || 0;
    if (xpToAdd <= 0) {
      return res.status(400).json({ error: 'XP to add must be greater than 0' });
    }
    
    const result = await addXpService(req.userId, xpToAdd);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const leaderboard = await fetchLeaderboard(limit);
    res.json({ data: leaderboard });
  } catch (error) {
    next(error);
  }
}

async function recordVocabActivity(req, res, next) {
  try {
    const mode = req.body?.mode;
    const result = await recordVocabActivityService(req.userId, mode);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProgress,
  addXP,
  getLeaderboard,
  recordVocabActivity,
};
