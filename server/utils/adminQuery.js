function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parsePaginationQuery(query = {}) {
  const page = toPositiveInt(query.page, 1);
  const requestedLimit = toPositiveInt(query.limit, 10);
  const limit = clamp(requestedLimit, 1, 100);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

function parseSearchQuery(query = {}) {
  return typeof query.search === 'string' ? query.search.trim() : '';
}

function parseDaysQuery(query = {}, fallback = 7) {
  const days = toPositiveInt(query.days, fallback);
  return clamp(days, 1, 30);
}

function buildPaginationMeta({ page, limit, total = 0 }) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

module.exports = {
  parsePaginationQuery,
  parseSearchQuery,
  parseDaysQuery,
  buildPaginationMeta,
};
