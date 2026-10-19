const {
  getAdminOverviewSummary,
  getAdminRegistrationSeries,
} = require('../models/adminOverviewModel');
const { parseDaysQuery } = require('../utils/adminQuery');

async function fetchAdminOverviewSummary() {
  const summary = await getAdminOverviewSummary();

  return {
    ...summary,
    totalActivities: summary.totalToeicAttempts + summary.totalSrsReviews,
    activityBreakdown: {
      toeicAttempts: summary.totalToeicAttempts,
      srsReviews: summary.totalSrsReviews,
    },
  };
}

async function fetchAdminRegistrationSeries(query) {
  const days = parseDaysQuery(query, 7);
  const chart = await getAdminRegistrationSeries(days);

  return {
    ...chart,
    maxCount: chart.points.reduce((max, point) => Math.max(max, point.count), 0),
  };
}

module.exports = {
  fetchAdminOverviewSummary,
  fetchAdminRegistrationSeries,
};
