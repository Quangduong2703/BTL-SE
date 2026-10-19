const {
  fetchAdminOverviewSummary,
  fetchAdminRegistrationSeries,
} = require('../services/adminOverviewService');

async function getSummary(req, res, next) {
  try {
    const data = await fetchAdminOverviewSummary();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getRegistrations(req, res, next) {
  try {
    const data = await fetchAdminRegistrationSeries(req.query);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getRegistrations,
};
