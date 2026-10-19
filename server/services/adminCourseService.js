const {
  listAdminCourses,
  getAdminCourseById,
  getAdminCourseExportById,
  getAdminCourseBySlug,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
} = require('../models/adminCourseModel');
const { getAdminTopicBySlug } = require('../models/adminTopicModel');
const {
  createAdminTopic,
} = require('../models/adminTopicModel');
const {
  createAdminFlashcard,
} = require('../models/adminFlashcardModel');
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

function normalizeLanguage(value) {
  const language = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'en';
  if (!/^[a-z]{2,10}(-[a-z]{2,10})?$/i.test(language)) {
    throw Object.assign(new Error('Language format is invalid'), { status: 400 });
  }
  return language;
}

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw Object.assign(new Error('Sort order must be an integer'), { status: 400 });
  }
  return parsed;
}

function normalizeThumbnailUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw Object.assign(new Error('Thumbnail URL must be a string'), { status: 400 });
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\/.+/i.test(trimmed) && !/^[./]/.test(trimmed) && !/^[a-z0-9_-]+[./]/i.test(trimmed)) {
    throw Object.assign(new Error('Thumbnail URL format is invalid'), { status: 400 });
  }

  return trimmed;
}

function normalizeImportRoot(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Object.assign(new Error('Import payload must be an object'), { status: 400 });
  }

  if (payload.format !== 'vocabup-course-export') {
    throw Object.assign(new Error('Unsupported import format'), { status: 400 });
  }

  if (Number(payload.version) !== 1) {
    throw Object.assign(new Error('Unsupported import version'), { status: 400 });
  }

  return payload;
}

function normalizeImportedFlashcard(payload, fallbackLanguage, wordIndex, topicLabel) {
  const word = normalizeRequiredText(payload?.word, `Word #${wordIndex + 1} in ${topicLabel}`);
  const meaning = normalizeRequiredText(payload?.meaning, `Meaning #${wordIndex + 1} in ${topicLabel}`);

  return {
    word,
    transcription: normalizeOptionalText(payload?.transcription),
    meaning,
    wordType: normalizeOptionalText(payload?.wordType),
    example: normalizeOptionalText(payload?.example),
    exampleVi: normalizeOptionalText(payload?.exampleVi),
    language: normalizeLanguage(payload?.language || fallbackLanguage),
  };
}

function normalizeImportedTopic(payload, index, fallbackLanguage) {
  const title = normalizeRequiredText(payload?.title, `Topic title #${index + 1}`);
  const slug = normalizeSlug(payload?.slug, title);
  const description = normalizeOptionalText(payload?.description);
  const sortOrder = normalizeSortOrder(payload?.sortOrder ?? index);
  const flashcardsPayload = payload?.flashcards;

  if (flashcardsPayload !== undefined && !Array.isArray(flashcardsPayload)) {
    throw Object.assign(new Error(`Flashcards in topic "${title}" must be an array`), { status: 400 });
  }

  const flashcards = (flashcardsPayload || []).map((flashcard, wordIndex) =>
    normalizeImportedFlashcard(flashcard, fallbackLanguage, wordIndex, `topic "${title}"`)
  );

  const seenWords = new Set();
  flashcards.forEach((flashcard) => {
    const dedupeKey = flashcard.word.trim().toLowerCase();
    if (seenWords.has(dedupeKey)) {
      throw Object.assign(new Error(`Duplicate word "${flashcard.word}" in topic "${title}"`), { status: 400 });
    }
    seenWords.add(dedupeKey);
  });

  return {
    title,
    slug,
    description,
    sortOrder,
    flashcards,
  };
}

function normalizeImportedCoursePayload(payload) {
  const root = normalizeImportRoot(payload);
  const coursePayload = root.course;
  if (!coursePayload || typeof coursePayload !== 'object' || Array.isArray(coursePayload)) {
    throw Object.assign(new Error('Import file is missing course data'), { status: 400 });
  }

  const title = normalizeRequiredText(coursePayload?.title, 'Course title');
  const slug = normalizeSlug(coursePayload?.slug, title);
  const description = normalizeOptionalText(coursePayload?.description);
  const thumbnailUrl = normalizeThumbnailUrl(coursePayload?.thumbnailUrl);
  const language = normalizeLanguage(coursePayload?.language);
  const sortOrder = normalizeSortOrder(coursePayload?.sortOrder);
  const topicsPayload = root.topics;

  if (!Array.isArray(topicsPayload)) {
    throw Object.assign(new Error('Import file is missing topics array'), { status: 400 });
  }

  const topics = topicsPayload.map((topic, index) => normalizeImportedTopic(topic, index, language));
  const seenTopicSlugs = new Set();
  topics.forEach((topic) => {
    if (seenTopicSlugs.has(topic.slug)) {
      throw Object.assign(new Error(`Duplicate topic slug "${topic.slug}" in import file`), { status: 400 });
    }
    seenTopicSlugs.add(topic.slug);
  });

  return {
    course: {
      title,
      slug,
      description,
      thumbnailUrl,
      language,
      sortOrder,
    },
    topics,
  };
}

async function ensureUniqueCourseSlug(slug, excludeCourseId = null) {
  const existing = await getAdminCourseBySlug(slug);
  if (existing && Number(existing.id) !== Number(excludeCourseId)) {
    throw Object.assign(new Error('Course slug already exists'), { status: 400 });
  }
}

async function resolveUniqueCourseSlug(baseSlug) {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await getAdminCourseBySlug(candidate);
    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-copy${suffix > 2 ? `-${suffix - 1}` : ''}`;
  }
}

async function resolveUniqueTopicSlug(baseSlug, reservedSlugs = new Set()) {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await getAdminTopicBySlug(candidate);
    if (!existing && !reservedSlugs.has(candidate)) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-copy${suffix > 2 ? `-${suffix - 1}` : ''}`;
  }
}

async function fetchAdminCourses(query) {
  const { page, limit, offset } = parsePaginationQuery(query);
  const search = parseSearchQuery(query);
  const result = await listAdminCourses({ limit, offset, search });

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
  };
}

async function resolveAdminCourseByIdentifier(courseId) {
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

async function fetchAdminCourse(courseId) {
  return resolveAdminCourseByIdentifier(courseId);
}

async function exportAdminCourseEntry(courseId) {
  const course = await resolveAdminCourseByIdentifier(courseId);
  const data = await getAdminCourseExportById(course.id);
  if (!data) {
    throw Object.assign(new Error('Course not found'), { status: 404 });
  }

  const flashcardsByTopicId = data.flashcards.reduce((accumulator, flashcard) => {
    const key = Number(flashcard.topicId);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push({
      word: flashcard.word,
      transcription: flashcard.transcription,
      meaning: flashcard.meaning,
      wordType: flashcard.wordType,
      example: flashcard.example,
      exampleVi: flashcard.exampleVi,
      language: flashcard.language || data.language || 'en',
    });

    return accumulator;
  }, {});

  return {
    format: 'vocabup-course-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      app: 'VocabUp',
      entity: 'course',
    },
    course: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl,
      language: data.language,
      sortOrder: data.sortOrder,
    },
    topics: data.topics.map((topic) => ({
      title: topic.title,
      slug: topic.slug,
      description: topic.description,
      sortOrder: topic.sortOrder,
      flashcards: flashcardsByTopicId[Number(topic.id)] || [],
    })),
  };
}

async function importAdminCourseEntry(payload) {
  const normalized = normalizeImportedCoursePayload(payload);
  const resolvedCourseSlug = await resolveUniqueCourseSlug(normalized.course.slug);
  const reservedTopicSlugs = new Set();
  const resolvedTopics = [];

  for (const topic of normalized.topics) {
    const resolvedSlug = await resolveUniqueTopicSlug(topic.slug, reservedTopicSlugs);
    reservedTopicSlugs.add(resolvedSlug);
    resolvedTopics.push({
      ...topic,
      slug: resolvedSlug,
    });
  }

  let importedCourseId = null;

  try {
    const course = await createAdminCourse({
      slug: resolvedCourseSlug,
      title: normalized.course.title,
      description: normalized.course.description,
      thumbnailUrl: normalized.course.thumbnailUrl,
      language: normalized.course.language,
      sortOrder: normalized.course.sortOrder,
    });
    importedCourseId = course.id;

    for (const topic of resolvedTopics) {
      const createdTopic = await createAdminTopic({
        courseId: importedCourseId,
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        sortOrder: topic.sortOrder,
      });

      for (const flashcard of topic.flashcards) {
        await createAdminFlashcard({
          topicId: createdTopic.id,
          word: flashcard.word,
          transcription: flashcard.transcription,
          meaning: flashcard.meaning,
          wordType: flashcard.wordType,
          example: flashcard.example,
          exampleVi: flashcard.exampleVi,
          language: flashcard.language,
        });
      }
    }

    const importedCourse = await getAdminCourseById(importedCourseId);
    return {
      course: importedCourse,
      importedCounts: {
        topics: resolvedTopics.length,
        flashcards: resolvedTopics.reduce((sum, topic) => sum + topic.flashcards.length, 0),
      },
      slugChanges: {
        course: {
          original: normalized.course.slug,
          imported: resolvedCourseSlug,
        },
        topics: resolvedTopics
          .filter((topic, index) => topic.slug !== normalized.topics[index].slug)
          .map((topic, index) => ({
            title: topic.title,
            original: normalized.topics[index].slug,
            imported: topic.slug,
          })),
      },
    };
  } catch (error) {
    if (importedCourseId) {
      await deleteAdminCourse(importedCourseId).catch(() => undefined);
    }
    throw error;
  }
}

async function createAdminCourseEntry(payload) {
  const title = normalizeRequiredText(payload?.title, 'Title');
  const slug = normalizeSlug(payload?.slug, title);
  const description = normalizeOptionalText(payload?.description);
  const thumbnailUrl = normalizeThumbnailUrl(payload?.thumbnailUrl);
  const language = normalizeLanguage(payload?.language);
  const sortOrder = normalizeSortOrder(payload?.sortOrder);

  await ensureUniqueCourseSlug(slug);

  return createAdminCourse({
    slug,
    title,
    description,
    thumbnailUrl,
    language,
    sortOrder,
  });
}

async function updateAdminCourseEntry(courseId, payload) {
  const existingCourse = await resolveAdminCourseByIdentifier(courseId);

  const title = normalizeRequiredText(payload?.title, 'Title');
  const slug = normalizeSlug(payload?.slug, title);
  const description = normalizeOptionalText(payload?.description);
  const thumbnailUrl = normalizeThumbnailUrl(payload?.thumbnailUrl);
  const language = normalizeLanguage(payload?.language);
  const sortOrder = normalizeSortOrder(payload?.sortOrder);

  await ensureUniqueCourseSlug(slug, existingCourse.id);

  await updateAdminCourse(existingCourse.id, {
    slug,
    title,
    description,
    thumbnailUrl,
    language,
    sortOrder,
  });

  return getAdminCourseById(existingCourse.id);
}

async function deleteAdminCourseEntry(courseId) {
  const existingCourse = await resolveAdminCourseByIdentifier(courseId);

  await deleteAdminCourse(existingCourse.id);

  return {
    success: true,
    deleted: existingCourse,
  };
}

module.exports = {
  fetchAdminCourses,
  fetchAdminCourse,
  exportAdminCourseEntry,
  importAdminCourseEntry,
  createAdminCourseEntry,
  updateAdminCourseEntry,
  deleteAdminCourseEntry,
};
