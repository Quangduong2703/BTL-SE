const { ensureSupabaseEnabled, unwrapList, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');

const CUSTOM_TOPICS_COURSE_SLUG = '__custom_user_topics__';
const SAMPLE_PERSONAL_TOPIC_SLUG = '__sample_personal_topic__';
const SAMPLE_PERSONAL_TOPIC_TITLE = 'Bộ tài liệu cá nhân mẫu';
const SAMPLE_PERSONAL_TOPIC_DESCRIPTION = '';
const SAMPLE_PERSONAL_TOPIC_WORDS = [
  {
    word: 'study',
    mean: 'học tập',
    transcription: '/ˈstʌdi/',
    wordtype: 'verb',
    example: 'I study English every day.',
    example_vi: 'Tôi học tiếng Anh mỗi ngày.',
    language: 'en',
  },
  {
    word: 'review',
    mean: 'ôn tập',
    transcription: '/rɪˈvjuː/',
    wordtype: 'verb',
    example: 'Please review the lesson before class.',
    example_vi: 'Hãy ôn lại bài trước giờ học.',
    language: 'en',
  },
  {
    word: 'memory',
    mean: 'trí nhớ',
    transcription: '/ˈmeməri/',
    wordtype: 'noun',
    example: 'Spaced repetition improves memory.',
    example_vi: 'Ôn lặp lại ngắt quãng giúp cải thiện trí nhớ.',
    language: 'en',
  },
  {
    word: 'focus',
    mean: 'tập trung',
    transcription: '/ˈfoʊkəs/',
    wordtype: 'verb',
    example: 'I focus best in the morning.',
    example_vi: 'Tôi tập trung tốt nhất vào buổi sáng.',
    language: 'en',
  },
  {
    word: 'progress',
    mean: 'tiến bộ',
    transcription: '/ˈprɑːɡres/',
    wordtype: 'noun',
    example: 'Small steps create real progress.',
    example_vi: 'Những bước nhỏ tạo ra tiến bộ thật sự.',
    language: 'en',
  },
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildCustomTopicSlug(title, profileId) {
  const titleSlug = slugify(title) || 'topic';
  const profileSlug = slugify(profileId).slice(0, 8) || 'user';
  const suffix = Date.now().toString(36);
  return `custom-${titleSlug}-${profileSlug}-${suffix}`.slice(0, 120);
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(columnName.toLowerCase())
    && (message.includes('column') || message.includes('does not exist') || message.includes('not found'));
}

async function withOwnershipColumnFallback(queries) {
  let lastError = null;
  for (const query of queries) {
    try {
      return await query();
    } catch (error) {
      lastError = error;
      if (
        !isMissingColumnError(error, 'owner_user_id')
        && !isMissingColumnError(error, 'user_id')
        && !isMissingColumnError(error, 'shared_from_topic_id')
      ) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function getOwnedTopicById(admin, profileId, topicId) {
  return withOwnershipColumnFallback([
    async () => unwrapSingle(await admin
      .from('topics')
      .select('id, language')
      .eq('id', topicId)
      .eq('owner_user_id', profileId)
      .limit(1)
      .maybeSingle()),
    async () => unwrapSingle(await admin
      .from('topics')
      .select('id, language')
      .eq('id', topicId)
      .eq('user_id', profileId)
      .limit(1)
      .maybeSingle()),
  ]);
}

async function ensureCustomTopicsCourseId() {
  const admin = ensureSupabaseEnabled();
  const existing = unwrapSingle(await admin
    .from('courses')
    .select('id')
    .eq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .limit(1)
    .maybeSingle());

  if (existing?.id) {
    return existing.id;
  }

  const rows = unwrapList(await admin
    .from('courses')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1));

  const nextSortOrder = Number(rows[0]?.sort_order || 0) + 1000;
  const inserted = unwrapSingle(await admin
    .from('courses')
    .insert({
      slug: CUSTOM_TOPICS_COURSE_SLUG,
      title: 'Custom Topics Anchor',
      description: 'System course used internally for user-owned custom topics.',
      language: 'en',
      sort_order: nextSortOrder,
    })
    .select('id')
    .single());

  return inserted.id;
}

async function selectCustomTopicList(admin, profileId) {
  const buildQuery = (selectColumns, ownershipColumn) => admin
    .from('topics')
    .select(selectColumns)
    .eq(ownershipColumn, profileId)
    .order('created_at', { ascending: false });

  const queries = [
    async () => unwrapList(await buildQuery('id, slug, title, description, language, shared_from_topic_id, created_at', 'owner_user_id')),
    async () => unwrapList(await buildQuery('id, slug, title, description, language, shared_from_topic_id, created_at', 'user_id')),
    async () => unwrapList(await buildQuery('id, slug, title, description, language, created_at', 'owner_user_id')),
    async () => unwrapList(await buildQuery('id, slug, title, description, language, created_at', 'user_id')),
  ];

  return withOwnershipColumnFallback(queries);
}

async function selectCustomTopicDetail(admin, profileId, topicId) {
  const buildQuery = (selectColumns, ownershipColumn) => admin
    .from('topics')
    .select(selectColumns)
    .eq('id', topicId)
    .eq(ownershipColumn, profileId)
    .limit(1)
    .maybeSingle();

  const queries = [
    async () => unwrapSingle(await buildQuery('id, course_id, slug, title, description, language, shared_from_topic_id, sort_order, created_at, updated_at', 'owner_user_id')),
    async () => unwrapSingle(await buildQuery('id, course_id, slug, title, description, language, shared_from_topic_id, sort_order, created_at, updated_at', 'user_id')),
    async () => unwrapSingle(await buildQuery('id, course_id, slug, title, description, language, sort_order, created_at, updated_at', 'owner_user_id')),
    async () => unwrapSingle(await buildQuery('id, course_id, slug, title, description, language, sort_order, created_at, updated_at', 'user_id')),
  ];

  return withOwnershipColumnFallback(queries);
}

async function getCustomTopicsByUser(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);

  const topics = await selectCustomTopicList(admin, profileId);

  if (!topics.length) return [];

  const words = unwrapList(await admin
    .from('flashcards')
    .select('id, topic_id, word, transcription, meaning, word_type, example, example_vi, language')
    .in('topic_id', topics.map((topic) => topic.id))
    .order('id', { ascending: true }));

  const wordsByTopicId = new Map();
  words.forEach((word) => {
    const topicWords = wordsByTopicId.get(word.topic_id) || [];
    topicWords.push({
      id: word.id,
      topic_id: word.topic_id,
      word: word.word,
      transcription: word.transcription,
      mean: word.meaning,
      wordtype: word.word_type,
      example: word.example,
      example_vi: word.example_vi,
      language: word.language,
    });
    wordsByTopicId.set(word.topic_id, topicWords);
  });

  return topics.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    language: topic.language || 'en',
    sharedFromTopicId: topic.shared_from_topic_id || null,
    created_at: topic.created_at,
    word_count: (wordsByTopicId.get(topic.id) || []).length,
    words: wordsByTopicId.get(topic.id) || [],
  }));
}

async function getCustomTopicWithWords(userId, topicId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await selectCustomTopicDetail(admin, profileId, topicId);

  if (!topic) return null;

  const words = unwrapList(await admin
    .from('flashcards')
    .select('id, word, transcription, meaning, word_type, example, example_vi, language')
    .eq('topic_id', topicId)
    .order('id', { ascending: true }));

  return {
    ...topic,
    language: topic.language || 'en',
    sharedFromTopicId: topic.shared_from_topic_id || null,
    words: words.map((word) => ({
      id: word.id,
      word: word.word,
      transcription: word.transcription,
      mean: word.meaning,
      wordtype: word.word_type,
      example: word.example,
      example_vi: word.example_vi,
      language: word.language,
    })),
  };
}

function parseSharedTopicId(sharedTopicId) {
  const rawValue = typeof sharedTopicId === 'string' ? sharedTopicId.trim() : sharedTopicId;
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const rawText = String(rawValue);
  if (!/^\d+$/.test(rawText)) {
    const error = new Error('Shared topic is invalid.');
    error.status = 400;
    throw error;
  }

  const parsed = Number.parseInt(rawText, 10);

  return parsed;
}

async function createCustomTopic(userId, { title, description, language, sharedTopicId }) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const customCourseId = await ensureCustomTopicsCourseId();
  const resolvedSharedTopicId = parseSharedTopicId(sharedTopicId);
  let sourceTopic = null;
  let createdTopicId = null;

  try {
    if (resolvedSharedTopicId) {
      sourceTopic = unwrapSingle(await admin
        .from('topics')
        .select('id, title, description, language, owner_user_id')
        .eq('id', resolvedSharedTopicId)
        .limit(1)
        .maybeSingle());

      if (!sourceTopic?.id) {
        throw Object.assign(new Error('Shared topic not found.'), { status: 404 });
      }

      if (!sourceTopic.owner_user_id) {
        throw Object.assign(new Error('Chỉ có thể chia sẻ từ bộ từ vựng cá nhân.'), { status: 400 });
      }
    }

    const topicPayload = {
      course_id: customCourseId,
      slug: buildCustomTopicSlug(title, profileId),
      title,
      description: description || null,
      language: sourceTopic?.language || language || 'en',
      owner_user_id: profileId,
      sort_order: 0,
    };
    if (sourceTopic?.id) {
      topicPayload.shared_from_topic_id = sourceTopic.id;
    }

    const inserted = unwrapSingle(await admin
      .from('topics')
      .insert(topicPayload)
      .select('id, title, description, language, shared_from_topic_id, created_at, updated_at')
      .single());

    createdTopicId = inserted.id;

    const copiedWords = [];
    if (sourceTopic?.id) {
      const sourceWords = unwrapList(await admin
        .from('flashcards')
        .select('word, transcription, meaning, word_type, example, example_vi, language')
        .eq('topic_id', sourceTopic.id)
        .order('id', { ascending: true }));

      if (sourceWords.length > 0) {
        const copiedRows = sourceWords.map((word) => ({
          topic_id: inserted.id,
          word: word.word,
          transcription: word.transcription || null,
          meaning: word.meaning,
          word_type: word.word_type || null,
          example: word.example || null,
          example_vi: word.example_vi || null,
          language: word.language || inserted.language || language || 'en',
        }));

        const insertedWords = unwrapList(await admin
          .from('flashcards')
          .insert(copiedRows)
          .select('id, word, transcription, meaning, word_type, example, example_vi, language'));

        insertedWords.forEach((word) => {
          copiedWords.push({
            id: word.id,
            word: word.word,
            transcription: word.transcription,
            mean: word.meaning,
            wordtype: word.word_type,
            example: word.example,
            example_vi: word.example_vi,
            language: word.language || inserted.language || language || 'en',
          });
        });
      }
    }

    return {
      id: inserted.id,
      title: inserted.title,
      description: inserted.description,
      language: inserted.language || 'en',
      sharedFromTopicId: inserted.shared_from_topic_id || null,
      words: copiedWords,
    };
  } catch (error) {
    if (createdTopicId) {
      await admin.from('topics').delete().eq('id', createdTopicId).eq('owner_user_id', profileId);
    }
    throw error;
  }
}

async function ensureSamplePersonalTopicForUser(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);

  const existingTopics = unwrapList(await admin
    .from('topics')
    .select('id, slug, title')
    .eq('owner_user_id', profileId)
    .order('created_at', { ascending: true }));

  const normalizedSampleTitle = SAMPLE_PERSONAL_TOPIC_TITLE.trim().toLowerCase();
  const sampleAlreadyExists = existingTopics.some((topic) => {
    const normalizedTitle = String(topic.title || '').trim().toLowerCase();
    return topic.slug === SAMPLE_PERSONAL_TOPIC_SLUG || normalizedTitle === normalizedSampleTitle;
  });

  if (sampleAlreadyExists) {
    return false;
  }

  const customCourseId = await ensureCustomTopicsCourseId();
  try {
    const inserted = unwrapSingle(await admin
      .from('topics')
      .insert({
        course_id: customCourseId,
        slug: SAMPLE_PERSONAL_TOPIC_SLUG,
        title: SAMPLE_PERSONAL_TOPIC_TITLE,
        description: SAMPLE_PERSONAL_TOPIC_DESCRIPTION,
        language: 'en',
        owner_user_id: profileId,
        sort_order: 0,
      })
      .select('id')
      .single());

    unwrapList(await admin
      .from('flashcards')
      .insert(SAMPLE_PERSONAL_TOPIC_WORDS.map((word) => ({
        topic_id: inserted.id,
        word: word.word,
        transcription: word.transcription || null,
        meaning: word.mean,
        word_type: word.wordtype || null,
        example: word.example || null,
        example_vi: word.example_vi || null,
        language: word.language || 'en',
      }))));

    return true;
  } catch (error) {
    if (error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate')) {
      return false;
    }
    throw error;
  }
}

async function updateCustomTopic(userId, topicId, { title, description, language }) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await getOwnedTopicById(admin, profileId, topicId);
  if (!topic) return false;
  const payload = {
    title,
    description: description || null,
  };
  if (language) {
    payload.language = language;
  }
  const result = await admin
    .from('topics')
    .update(payload)
    .eq('id', topicId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteCustomTopic(userId, topicId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await getOwnedTopicById(admin, profileId, topicId);
  if (!topic) return false;

  const flashcards = unwrapList(await admin
    .from('flashcards')
    .select('id')
    .eq('topic_id', topicId));

  if (flashcards.length) {
    const flashcardIds = flashcards.map((flashcard) => flashcard.id);

    await admin
      .from('user_word_progress')
      .delete()
      .in('flashcard_id', flashcardIds);

    await admin
      .from('srs_reviews')
      .delete()
      .in('flashcard_id', flashcardIds);

    const flashcardDeleteResult = await admin
      .from('flashcards')
      .delete()
      .eq('topic_id', topicId)
      .select('id');

    if (flashcardDeleteResult.error) {
      throw flashcardDeleteResult.error;
    }
  }

  const result = await admin
    .from('topics')
    .delete()
    .eq('id', topicId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function addWordToCustomTopic(userId, topicId, wordData) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await getOwnedTopicById(admin, profileId, topicId);
  if (!topic) return null;

  const { word, mean, transcription, wordtype, example, example_vi, language } = wordData;
  const normalizedMean = typeof mean === 'string' ? mean.trim() : '';
  const inserted = unwrapSingle(await admin
    .from('flashcards')
    .insert({
      topic_id: topicId,
      word,
      transcription: transcription || null,
      meaning: normalizedMean || null,
      word_type: wordtype || null,
      example: example || null,
      example_vi: example_vi || null,
      language: language || 'en',
    })
    .select('id')
    .single());

  return { id: inserted.id, word, mean: normalizedMean, transcription, wordtype, example, example_vi, language: language || 'en' };
}

async function updateWordInCustomTopic(userId, topicId, wordId, wordData) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await getOwnedTopicById(admin, profileId, topicId);
  if (!topic) return false;

  const { word, mean, transcription, wordtype, example, example_vi } = wordData;
  const normalizedMean = typeof mean === 'string' ? mean.trim() : '';
  const result = await admin
    .from('flashcards')
    .update({
      word,
      transcription: transcription || null,
      meaning: normalizedMean || null,
      word_type: wordtype || null,
      example: example || null,
      example_vi: example_vi || null,
    })
    .eq('id', wordId)
    .eq('topic_id', topicId)
    .select('id');

  return unwrapList(result).length > 0;
}

async function deleteWordFromCustomTopic(userId, topicId, wordId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const topic = await getOwnedTopicById(admin, profileId, topicId);
  if (!topic) return false;

  const result = await admin
    .from('flashcards')
    .delete()
    .eq('id', wordId)
    .eq('topic_id', topicId)
    .select('id');

  return unwrapList(result).length > 0;
}

module.exports = {
  CUSTOM_TOPICS_COURSE_SLUG,
  getCustomTopicsByUser,
  getCustomTopicWithWords,
  createCustomTopic,
  ensureSamplePersonalTopicForUser,
  updateCustomTopic,
  deleteCustomTopic,
  addWordToCustomTopic,
  updateWordInCustomTopic,
  deleteWordFromCustomTopic,
};
