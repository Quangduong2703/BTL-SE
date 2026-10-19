const { getTestsList, getTestDetails, submitTest, getPracticeModes: getPracticeModesService, getTestHistory: getTestHistoryService } = require('../services/toeicService');
const { setPublicCache } = require('../lib/httpCache');

async function getTests(req, res, next) {
  try {
    const tests = await getTestsList();
    setPublicCache(res, 300, 600);
    res.json({ data: tests });
  } catch (error) {
    next(error);
  }
}

async function getPracticeModes(req, res, next) {
  try {
    const modes = await getPracticeModesService();
    setPublicCache(res, 300, 600);
    res.json({ data: modes });
  } catch (error) {
    next(error);
  }
}

async function getTest(req, res, next) {
  try {
    const { test_id } = req.params;
    const test = await getTestDetails(test_id);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    setPublicCache(res, 600, 1200);
    res.json({ data: test });
  } catch (error) {
    next(error);
  }
}

async function submitTestAnswers(req, res, next) {
  try {
    const { test_id, answers, isPartial } = req.body;
    
    if (!test_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const result = await submitTest(req.userId, test_id, answers, isPartial);
    res.json({ data: result });
  } catch (error) {
    if (error.message === 'Test not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

async function getTestHistory(req, res, next) {
  try {
    const history = await getTestHistoryService(req.userId);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTests,
  getTest,
  submitTestAnswers,
  getPracticeModes,
  getTestHistory,
};
