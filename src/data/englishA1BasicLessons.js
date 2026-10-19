import { TOEIC_BASIC_LESSONS_1_TO_50 } from './toeicBasicLessons.js';

function buildA1Lesson(sourceLesson, index) {
    const topicWords = Array.isArray(sourceLesson.words) ? sourceLesson.words.slice(0, 10) : [];

    return {
        ...sourceLesson,
        id: `english-a1-lesson-${index + 1}`,
        slug: `english-a1-lesson-${index + 1}`,
        title: sourceLesson.title,
        description: `Từ vựng tiếng Anh A1 cơ bản theo chủ đề ${sourceLesson.title.toLowerCase()}.`,
        sortOrder: index + 1,
        wordCount: topicWords.length,
        vocabularyCount: topicWords.length,
        words: topicWords,
    };
}

export const ENGLISH_A1_BASIC_LESSONS_1_TO_50 = TOEIC_BASIC_LESSONS_1_TO_50.map((lesson, index) => buildA1Lesson(lesson, index));
