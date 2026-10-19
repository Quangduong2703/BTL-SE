import { ENGLISH_B1_BASIC_LESSONS_1_TO_50 } from './englishB1BasicLessons.js';
import { TOEIC_BASIC_LESSONS_1_TO_50 } from './toeicBasicLessons.js';

function buildB2Lesson(sourceLesson, index) {
    const baseWords = Array.isArray(sourceLesson.words) ? sourceLesson.words : [];
    const extraWords = Array.isArray(TOEIC_BASIC_LESSONS_1_TO_50[index]?.words)
        ? TOEIC_BASIC_LESSONS_1_TO_50[index].words.slice(0, 10)
        : [];
    const topicWords = [...baseWords, ...extraWords];

    return {
        ...sourceLesson,
        id: `english-b2-lesson-${index + 1}`,
        slug: `english-b2-lesson-${index + 1}`,
        title: sourceLesson.title,
        description: `Từ vựng tiếng Anh B2 theo chủ đề ${String(sourceLesson.title || '').toLowerCase()}.`,
        sortOrder: index + 1,
        wordCount: topicWords.length,
        vocabularyCount: topicWords.length,
        words: topicWords,
    };
}

export const ENGLISH_B2_BASIC_LESSONS_1_TO_50 = ENGLISH_B1_BASIC_LESSONS_1_TO_50.map((lesson, index) => buildB2Lesson(lesson, index));
