const {
  submitSupportTicket,
  fetchAdminSupportTickets,
  reviewAdminSupportTicket,
} = require('../services/supportService');

async function createSupport(req, res, next) {
  try {
    const data = await submitSupportTicket(req.userId, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

async function getAdminSupport(req, res, next) {
  try {
    const data = await fetchAdminSupportTickets(req.query);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function updateAdminSupportStatus(req, res, next) {
  try {
    const data = await reviewAdminSupportTicket(
      req.userProfileId || req.userId,
      req.params.ticketId,
      req.body?.status
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSupport,
  getAdminSupport,
  updateAdminSupportStatus,
};
