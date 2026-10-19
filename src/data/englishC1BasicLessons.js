import { ENGLISH_B2_BASIC_LESSONS_1_TO_50 } from './englishB2BasicLessons.js';

const EXTRA_C1_WORDS = [
    { word: 'analyze', mean: 'phân tích', wordtype: 'verb', example: 'We analyze the results carefully.', example_vi: 'Chúng tôi phân tích kết quả cẩn thận.' },
    { word: 'assess', mean: 'đánh giá', wordtype: 'verb', example: 'Teachers assess student progress regularly.', example_vi: 'Giáo viên đánh giá tiến bộ của học sinh thường xuyên.' },
    { word: 'coordinate', mean: 'phối hợp', wordtype: 'verb', example: 'The team coordinates the project smoothly.', example_vi: 'Nhóm phối hợp dự án rất trơn tru.' },
    { word: 'derive', mean: 'suy ra', wordtype: 'verb', example: 'We derive a conclusion from the data.', example_vi: 'Chúng tôi suy ra kết luận từ dữ liệu.' },
    { word: 'imply', mean: 'hàm ý', wordtype: 'verb', example: 'His answer may imply a deeper issue.', example_vi: 'Câu trả lời của anh ấy có thể hàm ý một vấn đề sâu hơn.' },
    { word: 'maintain', mean: 'duy trì', wordtype: 'verb', example: 'It is important to maintain a steady routine.', example_vi: 'Điều quan trọng là duy trì một thói quen ổn định.' },
    { word: 'obtain', mean: 'đạt được', wordtype: 'verb', example: 'Students obtain better results with practice.', example_vi: 'Học sinh đạt kết quả tốt hơn khi luyện tập.' },
    { word: 'perceive', mean: 'nhận thức', wordtype: 'verb', example: 'People perceive the situation differently.', example_vi: 'Mọi người nhận thức tình huống khác nhau.' },
    { word: 'pursue', mean: 'theo đuổi', wordtype: 'verb', example: 'She wants to pursue a new career.', example_vi: 'Cô ấy muốn theo đuổi một nghề nghiệp mới.' },
    { word: 'reveal', mean: 'tiết lộ', wordtype: 'verb', example: 'The report reveals an important trend.', example_vi: 'Báo cáo tiết lộ một xu hướng quan trọng.' },
];

function buildC1Lesson(sourceLesson, index) {
    const baseWords = Array.isArray(sourceLesson.words) ? sourceLesson.words : [];
    const extraWords = EXTRA_C1_WORDS.map((word, extraIndex) => ({
        id: `english-c1-extra-${index + 1}-${extraIndex + 1}`,
        ...word,
        language: 'en',
        transcription: word.transcription || '',
        example: word.example,
        example_vi: word.example_vi,
    }));
    const topicWords = [...baseWords, ...extraWords];

    return {
        ...sourceLesson,
        id: `english-c1-lesson-${index + 1}`,
        slug: `english-c1-lesson-${index + 1}`,
        title: sourceLesson.title,
        description: `Từ vựng tiếng Anh C1 theo chủ đề ${String(sourceLesson.title || '').toLowerCase()}.`,
        sortOrder: index + 1,
        wordCount: topicWords.length,
        vocabularyCount: topicWords.length,
        words: topicWords,
    };
}

export const ENGLISH_C1_BASIC_LESSONS_1_TO_50 = ENGLISH_B2_BASIC_LESSONS_1_TO_50.map((lesson, index) => buildC1Lesson(lesson, index));
