const { ensureSupabaseEnabled, unwrapList, unwrapSingle, resolveProfileId } = require('../lib/supabaseData');
const { addWordToCustomTopic, updateCustomTopic } = require('./customCoursesModel');

const CUSTOM_TOPICS_COURSE_SLUG = '__custom_user_topics__';
const SAMPLE_PERSONAL_TOPIC_SLUG = '__sample_personal_topic__';
const SAMPLE_PERSONAL_TOPIC_TITLE = 'Bộ từ vựng cá nhân mẫu';
const SAMPLE_PERSONAL_TOPIC_DESCRIPTION = 'Bộ từ mẫu';

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
  {
    word: 'practice',
    mean: 'thực hành',
    transcription: '/ˈpræktɪs/',
    wordtype: 'noun',
    example: 'Regular practice helps you improve faster.',
    example_vi: 'Thực hành thường xuyên giúp bạn tiến bộ nhanh hơn.',
    language: 'en',
  },
  {
    word: 'improve',
    mean: 'cải thiện',
    transcription: '/ɪmˈpruːv/',
    wordtype: 'verb',
    example: 'You can improve your English with daily study.',
    example_vi: 'Bạn có thể cải thiện tiếng Anh bằng việc học hằng ngày.',
    language: 'en',
  },
  {
    word: 'remember',
    mean: 'ghi nhớ',
    transcription: '/rɪˈmembər/',
    wordtype: 'verb',
    example: 'Try to remember new words in context.',
    example_vi: 'Hãy cố ghi nhớ từ mới trong ngữ cảnh.',
    language: 'en',
  },
  {
    word: 'effort',
    mean: 'nỗ lực',
    transcription: '/ˈefərt/',
    wordtype: 'noun',
    example: 'Consistent effort leads to success.',
    example_vi: 'Nỗ lực đều đặn sẽ dẫn đến thành công.',
    language: 'en',
  },
  {
    word: 'goal',
    mean: 'mục tiêu',
    transcription: '/ɡoʊl/',
    wordtype: 'noun',
    example: 'Set a clear goal for each week.',
    example_vi: 'Hãy đặt mục tiêu rõ ràng cho mỗi tuần.',
    language: 'en',
  },
];

async function ensureCustomTopicsCourseId() {
  const admin = ensureSupabaseEnabled();
  const existing = unwrapSingle(await admin
    .from('courses')
    .select('id')
    .eq('slug', CUSTOM_TOPICS_COURSE_SLUG)
    .limit(1)
    .maybeSingle());

  if (existing?.id) return existing.id;

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

async function ensureSamplePersonalTopicForUser(userId) {
  const admin = ensureSupabaseEnabled();
  const profileId = await resolveProfileId(userId);
  const customCourseId = await ensureCustomTopicsCourseId();

  const existingTopics = unwrapList(await admin
    .from('topics')
    .select('id, slug, title, description, language')
    .eq('owner_user_id', profileId)
    .order('created_at', { ascending: true }));

  const normalizedSampleTitle = SAMPLE_PERSONAL_TOPIC_TITLE.trim().toLowerCase();
  const sampleTopic = existingTopics.find((topic) => {
    const normalizedTitle = String(topic.title || '').trim().toLowerCase();
    return topic.slug === SAMPLE_PERSONAL_TOPIC_SLUG || normalizedTitle === normalizedSampleTitle;
  });

  if (sampleTopic?.id) {
    await updateCustomTopic(userId, sampleTopic.id, {
      title: SAMPLE_PERSONAL_TOPIC_TITLE,
      description: SAMPLE_PERSONAL_TOPIC_DESCRIPTION,
      language: 'en',
    });

    const existingWords = unwrapList(await admin
      .from('flashcards')
      .select('word')
      .eq('topic_id', sampleTopic.id));

    const existingWordSet = new Set(
      existingWords.map((item) => String(item.word || '').trim().toLowerCase()),
    );

    for (const word of SAMPLE_PERSONAL_TOPIC_WORDS) {
      if (!existingWordSet.has(String(word.word || '').trim().toLowerCase())) {
        await addWordToCustomTopic(userId, sampleTopic.id, word);
      }
    }

    return true;
  }

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

    for (const word of SAMPLE_PERSONAL_TOPIC_WORDS) {
      await addWordToCustomTopic(userId, inserted.id, word);
    }

    return true;
  } catch (error) {
    if (error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate')) {
      return false;
    }
    throw error;
  }
}

module.exports = {
  SAMPLE_PERSONAL_TOPIC_SLUG,
  SAMPLE_PERSONAL_TOPIC_TITLE,
  SAMPLE_PERSONAL_TOPIC_DESCRIPTION,
  SAMPLE_PERSONAL_TOPIC_WORDS,
  ensureSamplePersonalTopicForUser,
};
