const {
  fetchAdminToeicTests,
  fetchAdminToeicTest,
  exportAdminToeicTestEntry,
  importAdminToeicTestEntry,
  createAdminToeicTestEntry,
  updateAdminToeicTestEntry,
  deleteAdminToeicTestEntry,
  fetchAdminToeicGroups,
  createAdminToeicGroupEntry,
  updateAdminToeicGroupEntry,
  deleteAdminToeicGroupEntry,
  fetchAdminToeicQuestions,
  fetchAdminToeicQuestion,
  createAdminToeicQuestionEntry,
  updateAdminToeicQuestionEntry,
  deleteAdminToeicQuestionEntry,
} = require('../services/adminToeicService');
const { invalidateToeicCache } = require('../services/toeicService');

async function getToeicTests(req, res, next) {
  try {
    const data = await fetchAdminToeicTests(req.query);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getToeicTest(req, res, next) {
  try {
    const data = await fetchAdminToeicTest(req.params.testId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function createToeicTest(req, res, next) {
  try {
    const data = await createAdminToeicTestEntry(req.body);
    invalidateToeicCache();
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function exportToeicTest(req, res, next) {
  try {
    const data = await exportAdminToeicTestEntry(req.params.testId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function importToeicTest(req, res, next) {
  try {
    const data = await importAdminToeicTestEntry(req.body);
    invalidateToeicCache();
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function updateToeicTest(req, res, next) {
  try {
    const data = await updateAdminToeicTestEntry(req.params.testId, req.body);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function deleteToeicTest(req, res, next) {
  try {
    const data = await deleteAdminToeicTestEntry(req.params.testId);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getToeicGroups(req, res, next) {
  try {
    const data = await fetchAdminToeicGroups(req.params.testId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function createToeicGroup(req, res, next) {
  try {
    const data = await createAdminToeicGroupEntry(req.params.testId, req.body);
    invalidateToeicCache();
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function updateToeicGroup(req, res, next) {
  try {
    const data = await updateAdminToeicGroupEntry(req.params.groupId, req.body);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function deleteToeicGroup(req, res, next) {
  try {
    const data = await deleteAdminToeicGroupEntry(req.params.groupId);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getToeicQuestions(req, res, next) {
  try {
    const data = await fetchAdminToeicQuestions(req.params.testId, req.query);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getToeicQuestion(req, res, next) {
  try {
    const data = await fetchAdminToeicQuestion(req.params.questionId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function createToeicQuestion(req, res, next) {
  try {
    const data = await createAdminToeicQuestionEntry(req.params.testId, req.body);
    invalidateToeicCache();
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function updateToeicQuestion(req, res, next) {
  try {
    const data = await updateAdminToeicQuestionEntry(req.params.questionId, req.body);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function deleteToeicQuestion(req, res, next) {
  try {
    const data = await deleteAdminToeicQuestionEntry(req.params.questionId);
    invalidateToeicCache();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getToeicTests,
  getToeicTest,
  exportToeicTest,
  importToeicTest,
  createToeicTest,
  updateToeicTest,
  deleteToeicTest,
  getToeicGroups,
  createToeicGroup,
  updateToeicGroup,
  deleteToeicGroup,
  getToeicQuestions,
  getToeicQuestion,
  createToeicQuestion,
  updateToeicQuestion,
  deleteToeicQuestion,
};
