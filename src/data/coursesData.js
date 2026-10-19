import { TOEIC_BASIC_LESSONS_1_TO_50 } from './toeicBasicLessons';
import { ENGLISH_A1_BASIC_LESSONS_1_TO_50 } from './englishA1BasicLessons';
import { ENGLISH_A2_BASIC_LESSONS_1_TO_50 } from './englishA2BasicLessons';
import { ENGLISH_B1_BASIC_LESSONS_1_TO_50 } from './englishB1BasicLessons';
import { ENGLISH_B2_BASIC_LESSONS_1_TO_50 } from './englishB2BasicLessons';
import { ENGLISH_C1_BASIC_LESSONS_1_TO_50 } from './englishC1BasicLessons';
import { ENGLISH_PHRASES_100_LESSONS } from './englishPhrases100Lessons';

export const coursesData = {
    'toeic-basic': {
        id: 'toeic-basic',
        title: '600 Essential Words for the TOEIC',
        lang: 'en',
        topics: TOEIC_BASIC_LESSONS_1_TO_50,
    },
    'english-a1-basic': {
        id: 'english-a1-basic',
        title: 'English A1 Basic Vocabulary',
        lang: 'en',
        topics: ENGLISH_A1_BASIC_LESSONS_1_TO_50,
    },
    'english-a2-basic': {
        id: 'english-a2-basic',
        title: 'English A2 Basic Vocabulary',
        lang: 'en',
        topics: ENGLISH_A2_BASIC_LESSONS_1_TO_50,
    },
    'english-b1-basic': {
        id: 'english-b1-basic',
        title: 'English B1 Intermediate Vocabulary',
        lang: 'en',
        topics: ENGLISH_B1_BASIC_LESSONS_1_TO_50,
    },
    'english-b2-basic': {
        id: 'english-b2-basic',
        title: 'English B2 Upper-Intermediate Vocabulary',
        lang: 'en',
        topics: ENGLISH_B2_BASIC_LESSONS_1_TO_50,
    },
    'english-c1-basic': {
        id: 'english-c1-basic',
        title: 'English C1 Advanced Vocabulary',
        lang: 'en',
        topics: ENGLISH_C1_BASIC_LESSONS_1_TO_50,
    },
    'english-phrases-basic': {
        id: 'english-phrases-basic',
        title: '100 Cụm từ thông dụng nhất',
        lang: 'en',
        topics: ENGLISH_PHRASES_100_LESSONS,
    },
};
