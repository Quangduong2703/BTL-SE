const {
  createSupportTicket,
  listSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
} = require('../models/supportModel');
const {
  parsePaginationQuery,
  parseSearchQuery,
  buildPaginationMeta,
} = require('../utils/adminQuery');

const ALLOWED_SUPPORT_TYPES = new Set(['gop-y', 'bao-loi']);
const ALLOWED_SUPPORT_STATUSES = new Set(['pending', 'agreed', 'rejected']);

function parseSupportType(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ALLOWED_SUPPORT_TYPES.has(normalized) ? normalized : '';
}

function parseSupportStatus(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ALLOWED_SUPPORT_STATUSES.has(normalized) ? normalized : '';
}

async function submitSupportTicket(userId, payload = {}) {
  const type = parseSupportType(payload.type) || 'gop-y';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const sourcePage = typeof payload.sourcePage === 'string' ? payload.sourcePage.trim() : '';

  if (!title) {
    throw Object.assign(new Error('Title is required'), { status: 400 });
  }

  if (!content) {
    throw Object.assign(new Error('Content is required'), { status: 400 });
  }

  const ticketId = await createSupportTicket({
    userId,
    type,
    title: title.slice(0, 255),
    content,
    sourcePage: sourcePage.slice(0, 255),
  });

  return {
    id: ticketId,
    type,
    title: title.slice(0, 255),
    content,
    sourcePage: sourcePage.slice(0, 255) || null,
    status: 'pending',
  };
}

async function fetchAdminSupportTickets(query = {}) {
  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const status = parseSupportStatus(query.status);
  const type = parseSupportType(query.type);
  const result = await listSupportTickets({
    search,
    status,
    type,
    limit,
    offset,
  });

  return {
    items: result.items,
    meta: buildPaginationMeta({
      page,
      limit,
      total: result.total,
    }),
    filters: {
      search,
      status: status || null,
      type: type || null,
    },
  };
}

async function reviewAdminSupportTicket(actorUserId, ticketId, nextStatus) {
  const parsedTicketId = Number.parseInt(ticketId, 10);
  if (!Number.isFinite(parsedTicketId) || parsedTicketId <= 0) {
    throw Object.assign(new Error('Invalid support ticket id'), { status: 400 });
  }

  const status = parseSupportStatus(nextStatus);
  if (!status) {
    throw Object.assign(new Error('Invalid support status'), { status: 400 });
  }

  const updated = await updateSupportTicketStatus({
    ticketId: parsedTicketId,
    status,
    reviewerId: status === 'pending' ? null : actorUserId,
  });

  if (!updated) {
    throw Object.assign(new Error('Support ticket not found'), { status: 404 });
  }

  return getSupportTicketById(parsedTicketId);
}

module.exports = {
  submitSupportTicket,
  fetchAdminSupportTickets,
  reviewAdminSupportTicket,
};
