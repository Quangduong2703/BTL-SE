const {
  listAdminTopicsByCourse,
  getAdminTopicById,
  getAdminTopicBySlug,
  countAdminTopicsByCourse,
  createAdminTopic,
  updateAdminTopic,
  deleteAdminTopic,
  reorderAdminTopics,
} = require('../models/adminTopicModel');
const { getAdminCourseById, getAdminCourseBySlug } = require('../models/adminCourseModel');
const {
  parsePaginationQuery,
  parseSearchQuery,
  buildPaginationMeta,
} = require('../utils/adminQuery');

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${fieldName} is required`), { status: 400 });
  }

  return value.trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeSlug(value, titleFallback) {
  const base = typeof value === 'string' && value.trim() ? value.trim() : titleFallback;
  const slug = slugify(base);

  if (!slug) {
    throw Object.assign(new Error('Valid slug is required'), { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw Object.assign(new Error('Slug format is invalid'), { status: 400 });
  }

  return slug;
}

function normalizeSortOrder(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw Object.assign(new Error('Sort order must be an integer'), { status: 400 });
  }
  return parsed;
}

async function resolveCourseByIdentifier(courseId) {
  const parsedCourseId = Number.parseInt(courseId, 10);
  if (Number.isFinite(parsedCourseId) && parsedCourseId > 0) {
    const course = await getAdminCourseById(parsedCourseId);
    if (!course) {
      throw Object.assign(new Error('Course not found'), { status: 404 });
    }
    return course;
  }

  const slug = typeof courseId === 'string' ? courseId.trim() : '';
  if (!slug) {
    throw Object.assign(new Error('Invalid course id'), { status: 400 });
  }

  const course = await getAdminCourseBySlug(slug);
  if (!course) {
    throw Object.assign(new Error('Course not found'), { status: 404 });
  }
  return course;
}

async function ensureUniqueTopicSlug(slug, excludeTopicId = null) {
  const existing = await getAdminTopicBySlug(slug);
  if (existing && Number(existing.id) !== Number(excludeTopicId)) {
    throw Object.assign(new Error('Topic slug already exists'), { status: 400 });
  }
}

async function fetchAdminTopicsByCourse(courseId, query) {
  const course = await resolveCourseByIdentifier(courseId);

  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const result = await listAdminTopicsByCourse({
    courseId: course.id,
    page,
    limit,
    offset,
    search,
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
    },
    courseId: course.id,
  };
}

async function fetchAdminTopic(topicId) {
  const parsedTopicId = Number.parseInt(topicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    throw Object.assign(new Error('Invalid topic id'), { status: 400 });
  }

  const topic = await getAdminTopicById(parsedTopicId);
  if (!topic) {
    throw Object.assign(new Error('Topic not found'), { status: 404 });
  }

  return topic;
}

async function createAdminTopicEntry(courseId, payload) {
  const course = await resolveCourseByIdentifier(courseId);

  const title = normalizeRequiredText(payload?.title, 'Title');
  const slug = normalizeSlug(payload?.slug, title);
  const description = normalizeOptionalText(payload?.description);
  const topicCount = await countAdminTopicsByCourse(course.id);
  const sortOrder = normalizeSortOrder(payload?.sortOrder, topicCount);

  await ensureUniqueTopicSlug(slug);

  return createAdminTopic({
    courseId: course.id,
    slug,
    title,
    description,
    sortOrder,
  });
}

async function updateAdminTopicEntry(topicId, payload) {
  const parsedTopicId = Number.parseInt(topicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    throw Object.assign(new Error('Invalid topic id'), { status: 400 });
  }

  const existingTopic = await getAdminTopicById(parsedTopicId);
  if (!existingTopic) {
    throw Object.assign(new Error('Topic not found'), { status: 404 });
  }

  const title = normalizeRequiredText(payload?.title, 'Title');
  const slug = normalizeSlug(payload?.slug, title);
  const description = normalizeOptionalText(payload?.description);
  const sortOrder = normalizeSortOrder(payload?.sortOrder, existingTopic.sortOrder);

  await ensureUniqueTopicSlug(slug, parsedTopicId);

  await updateAdminTopic(parsedTopicId, {
    slug,
    title,
    description,
    sortOrder,
  });

  return getAdminTopicById(parsedTopicId);
}

async function deleteAdminTopicEntry(topicId) {
  const parsedTopicId = Number.parseInt(topicId, 10);
  if (!Number.isFinite(parsedTopicId) || parsedTopicId <= 0) {
    throw Object.assign(new Error('Invalid topic id'), { status: 400 });
  }

  const existingTopic = await getAdminTopicById(parsedTopicId);
  if (!existingTopic) {
    throw Object.assign(new Error('Topic not found'), { status: 404 });
  }

  await deleteAdminTopic(parsedTopicId);

  return {
    success: true,
    deleted: existingTopic,
  };
}

async function reorderAdminTopicEntries(courseId, payload) {
  const course = await resolveCourseByIdentifier(courseId);

  const items = payload?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('items must be a non-empty array'), { status: 400 });
  }

  const normalizedItems = items.map((item, index) => {
    const id = Number.parseInt(item?.id, 10);
    const sortOrder = normalizeSortOrder(item?.sortOrder, index);

    if (!Number.isFinite(id) || id <= 0) {
      throw Object.assign(new Error('Each item must include a valid topic id'), { status: 400 });
    }

    return { id, sortOrder };
  });

  const uniqueIds = new Set(normalizedItems.map((item) => item.id));
  if (uniqueIds.size !== normalizedItems.length) {
    throw Object.assign(new Error('Duplicate topic ids are not allowed in reorder payload'), { status: 400 });
  }

  const topics = await reorderAdminTopics(course.id, normalizedItems);

  return {
    items: topics,
  };
}

module.exports = {
  fetchAdminTopicsByCourse,
  fetchAdminTopic,
  createAdminTopicEntry,
  updateAdminTopicEntry,
  deleteAdminTopicEntry,
  reorderAdminTopicEntries,
};
