import * as XLSX from 'xlsx';

export const IMPORT_FILE_ACCEPT =
    '.json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

function slugifyFilePart(value, fallback = 'export') {
    return String(value || fallback)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function downloadJsonFile(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
}

function downloadWorkbook(workbook, fileName) {
    XLSX.writeFile(workbook, fileName, { compression: true });
}

function getFileExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
}

function ensureSupportedImportFile(file, entityLabel) {
    const extension = getFileExtension(file?.name);
    if (extension === 'json' || extension === 'xlsx' || extension === 'xls') {
        return extension;
    }

    throw new Error(`Chỉ chấp nhận file JSON hoặc Excel để import ${entityLabel}.`);
}

function normalizeTextCell(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function normalizeOptionalText(value) {
    const text = normalizeTextCell(value);
    return text ? text : null;
}

function normalizeRequiredText(value, fieldName) {
    const text = normalizeTextCell(value);
    if (!text) {
        throw new Error(`${fieldName} là bắt buộc.`);
    }
    return text;
}

function normalizeOptionalInteger(value, fallback = 0) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number.parseInt(String(value).trim(), 10);
    if (!Number.isFinite(parsed)) {
        throw new Error('Giá trị số nguyên không hợp lệ.');
    }
    return parsed;
}

function normalizeRequiredInteger(value, fieldName) {
    const parsed = Number.parseInt(String(value).trim(), 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${fieldName} phải là số nguyên hợp lệ.`);
    }
    return parsed;
}

function getSheetRows(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        throw new Error(`Thiếu sheet "${sheetName}" trong file Excel.`);
    }

    return XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
    });
}

function buildCourseWorkbook(payload) {
    const workbook = XLSX.utils.book_new();
    const course = payload?.course || {};
    const topics = Array.isArray(payload?.topics) ? payload.topics : [];

    const courseRows = [{
        title: course.title || '',
        slug: course.slug || '',
        thumbnailUrl: course.thumbnailUrl || '',
        description: course.description || '',
        language: course.language || 'en',
        sortOrder: course.sortOrder ?? 0,
    }];

    const topicRows = topics.map((topic, index) => ({
        topicKey: topic.slug || `topic-${index + 1}`,
        title: topic.title || '',
        slug: topic.slug || '',
        description: topic.description || '',
        sortOrder: topic.sortOrder ?? index,
    }));

    const flashcardRows = topics.flatMap((topic, topicIndex) => {
        const topicKey = topic.slug || `topic-${topicIndex + 1}`;
        return (topic.flashcards || []).map((flashcard) => ({
            topicKey,
            word: flashcard.word || '',
            transcription: flashcard.transcription || '',
            meaning: flashcard.meaning || '',
            wordType: flashcard.wordType || '',
            example: flashcard.example || '',
            exampleVi: flashcard.exampleVi || '',
            language: flashcard.language || course.language || 'en',
        }));
    });

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(courseRows, {
            header: ['title', 'slug', 'thumbnailUrl', 'description', 'language', 'sortOrder'],
        }),
        'Course',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(topicRows, {
            header: ['topicKey', 'title', 'slug', 'description', 'sortOrder'],
        }),
        'Topics',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(flashcardRows, {
            header: ['topicKey', 'word', 'transcription', 'meaning', 'wordType', 'example', 'exampleVi', 'language'],
        }),
        'Flashcards',
    );

    return workbook;
}

function parseCourseWorkbook(workbook) {
    const courseRows = getSheetRows(workbook, 'Course');
    const topicRows = getSheetRows(workbook, 'Topics');
    const flashcardRows = getSheetRows(workbook, 'Flashcards');

    if (!courseRows.length) {
        throw new Error('Sheet "Course" phải có ít nhất 1 dòng dữ liệu.');
    }

    const courseRow = courseRows[0];
    const course = {
        title: normalizeRequiredText(courseRow.title, 'Tên khóa học'),
        slug: normalizeRequiredText(courseRow.slug, 'Slug khóa học'),
        thumbnailUrl: normalizeOptionalText(courseRow.thumbnailUrl),
        description: normalizeOptionalText(courseRow.description),
        language: normalizeTextCell(courseRow.language) || 'en',
        sortOrder: normalizeOptionalInteger(courseRow.sortOrder, 0),
    };

    const topics = topicRows.map((row, index) => ({
        topicKey: normalizeRequiredText(row.topicKey, `Topic key ở dòng ${index + 2} sheet Topics`),
        title: normalizeRequiredText(row.title, `Tên topic ở dòng ${index + 2} sheet Topics`),
        slug: normalizeRequiredText(row.slug, `Slug topic ở dòng ${index + 2} sheet Topics`),
        description: normalizeOptionalText(row.description),
        sortOrder: normalizeOptionalInteger(row.sortOrder, index),
        flashcards: [],
    }));

    const topicMap = new Map();
    topics.forEach((topic) => {
        if (topicMap.has(topic.topicKey)) {
            throw new Error(`Topic key "${topic.topicKey}" bị trùng trong sheet Topics.`);
        }
        topicMap.set(topic.topicKey, topic);
    });

    flashcardRows.forEach((row, index) => {
        const topicKey = normalizeRequiredText(row.topicKey, `Topic key ở dòng ${index + 2} sheet Flashcards`);
        const topic = topicMap.get(topicKey);
        if (!topic) {
            throw new Error(`Flashcard ở dòng ${index + 2} tham chiếu topicKey "${topicKey}" không tồn tại.`);
        }

        topic.flashcards.push({
            word: normalizeRequiredText(row.word, `Từ vựng ở dòng ${index + 2} sheet Flashcards`),
            transcription: normalizeOptionalText(row.transcription),
            meaning: normalizeRequiredText(row.meaning, `Nghĩa ở dòng ${index + 2} sheet Flashcards`),
            wordType: normalizeOptionalText(row.wordType),
            example: normalizeOptionalText(row.example),
            exampleVi: normalizeOptionalText(row.exampleVi),
            language: normalizeTextCell(row.language) || course.language || 'en',
        });
    });

    return {
        format: 'vocabup-course-export',
        version: 1,
        course,
        topics: topics.map(({ topicKey, ...topic }) => topic),
    };
}

function createCourseSamplePayload() {
    return {
        format: 'vocabup-course-export',
        version: 1,
        exportedAt: new Date('2026-06-12T00:00:00.000Z').toISOString(),
        source: {
            app: 'VocabUp',
            entity: 'course',
        },
        course: {
            title: 'TOEIC Starter Sample',
            slug: 'toeic-starter-sample',
            description: 'File mẫu để admin tùy chỉnh thông tin khóa học, topic và từ vựng trước khi import.',
            thumbnailUrl: 'https://example.com/images/toeic-starter-sample.jpg',
            language: 'en',
            sortOrder: 0,
        },
        topics: [
            {
                title: 'Office Communication',
                slug: 'office-communication',
                description: 'Từ vựng giao tiếp nơi công sở.',
                sortOrder: 0,
                flashcards: [
                    {
                        word: 'schedule',
                        transcription: '/ˈskedʒ.uːl/',
                        meaning: 'lịch trình',
                        wordType: 'noun',
                        example: 'Please check the meeting schedule before Friday.',
                        exampleVi: 'Vui lòng kiểm tra lịch họp trước thứ Sáu.',
                        language: 'en',
                    },
                    {
                        word: 'confirm',
                        transcription: '/kənˈfɜːrm/',
                        meaning: 'xác nhận',
                        wordType: 'verb',
                        example: 'Please confirm your attendance by email.',
                        exampleVi: 'Vui lòng xác nhận tham dự qua email.',
                        language: 'en',
                    },
                ],
            },
            {
                title: 'Customer Service',
                slug: 'customer-service',
                description: 'Từ vựng chăm sóc khách hàng.',
                sortOrder: 1,
                flashcards: [
                    {
                        word: 'refund',
                        transcription: '/ˈriː.fʌnd/',
                        meaning: 'hoàn tiền',
                        wordType: 'noun',
                        example: 'Customers can request a refund within seven days.',
                        exampleVi: 'Khách hàng có thể yêu cầu hoàn tiền trong vòng bảy ngày.',
                        language: 'en',
                    },
                    {
                        word: 'assist',
                        transcription: '/əˈsɪst/',
                        meaning: 'hỗ trợ',
                        wordType: 'verb',
                        example: 'Our team will assist you with the order issue.',
                        exampleVi: 'Đội ngũ của chúng tôi sẽ hỗ trợ bạn về vấn đề đơn hàng.',
                        language: 'en',
                    },
                ],
            },
        ],
    };
}

function buildToeicWorkbook(payload) {
    const workbook = XLSX.utils.book_new();
    const test = payload?.test || {};
    const groups = Array.isArray(payload?.groups) ? payload.groups : [];
    const questions = Array.isArray(payload?.questions) ? payload.questions : [];

    const testRows = [{
        title: test.title || '',
        description: test.description || '',
    }];

    const groupRows = groups.map((group) => ({
        groupRef: group.groupRef || '',
        part: group.part || '',
        audioUrl: group.audioUrl || '',
        imageUrl: group.imageUrl || '',
        passageText: group.passageText || '',
    }));

    const questionRows = questions.map((question) => ({
        questionNumber: question.questionNumber || '',
        part: question.part || '',
        groupRef: question.groupRef || '',
        questionText: question.questionText || '',
        optionA: question.options?.A || '',
        optionB: question.options?.B || '',
        optionC: question.options?.C || '',
        optionD: question.options?.D || '',
        correctAnswer: question.correctAnswer || '',
        explanation: question.explanation || '',
        audioUrl: question.audioUrl || '',
        imageUrl: question.imageUrl || '',
    }));

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(testRows, {
            header: ['title', 'description'],
        }),
        'Test',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(groupRows, {
            header: ['groupRef', 'part', 'audioUrl', 'imageUrl', 'passageText'],
        }),
        'Groups',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(questionRows, {
            header: ['questionNumber', 'part', 'groupRef', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'audioUrl', 'imageUrl'],
        }),
        'Questions',
    );

    return workbook;
}

function parseToeicWorkbook(workbook) {
    const testRows = getSheetRows(workbook, 'Test');
    const groupRows = getSheetRows(workbook, 'Groups');
    const questionRows = getSheetRows(workbook, 'Questions');

    if (!testRows.length) {
        throw new Error('Sheet "Test" phải có ít nhất 1 dòng dữ liệu.');
    }

    const testRow = testRows[0];
    const test = {
        title: normalizeRequiredText(testRow.title, 'Tên đề TOEIC'),
        description: normalizeOptionalText(testRow.description),
    };

    const groups = groupRows.map((row, index) => ({
        groupRef: normalizeRequiredText(row.groupRef, `Group ref ở dòng ${index + 2} sheet Groups`),
        part: normalizeRequiredInteger(row.part, `Part ở dòng ${index + 2} sheet Groups`),
        audioUrl: normalizeOptionalText(row.audioUrl),
        imageUrl: normalizeOptionalText(row.imageUrl),
        passageText: normalizeOptionalText(row.passageText),
    }));

    const groupRefs = new Set();
    groups.forEach((group) => {
        if (groupRefs.has(group.groupRef)) {
            throw new Error(`Group ref "${group.groupRef}" bị trùng trong sheet Groups.`);
        }
        groupRefs.add(group.groupRef);
    });

    const questions = questionRows.map((row, index) => {
        const part = normalizeRequiredInteger(row.part, `Part ở dòng ${index + 2} sheet Questions`);
        const groupRef = normalizeOptionalText(row.groupRef);
        if (groupRef && !groupRefs.has(groupRef)) {
            throw new Error(`Question ở dòng ${index + 2} tham chiếu groupRef "${groupRef}" không tồn tại.`);
        }

        const options = {
            A: normalizeRequiredText(row.optionA, `Đáp án A ở dòng ${index + 2} sheet Questions`),
            B: normalizeRequiredText(row.optionB, `Đáp án B ở dòng ${index + 2} sheet Questions`),
            C: normalizeRequiredText(row.optionC, `Đáp án C ở dòng ${index + 2} sheet Questions`),
        };

        if (part !== 2) {
            options.D = normalizeRequiredText(row.optionD, `Đáp án D ở dòng ${index + 2} sheet Questions`);
        }

        return {
            questionNumber: normalizeRequiredInteger(row.questionNumber, `Số câu hỏi ở dòng ${index + 2} sheet Questions`),
            part,
            groupRef,
            questionText: normalizeOptionalText(row.questionText),
            options,
            correctAnswer: normalizeRequiredText(row.correctAnswer, `Đáp án đúng ở dòng ${index + 2} sheet Questions`).toUpperCase(),
            explanation: normalizeOptionalText(row.explanation),
            audioUrl: normalizeOptionalText(row.audioUrl),
            imageUrl: normalizeOptionalText(row.imageUrl),
        };
    });

    return {
        format: 'vocabup-toeic-test-export',
        version: 1,
        test,
        groups,
        questions,
    };
}

function createToeicSamplePayload() {
    return {
        format: 'vocabup-toeic-test-export',
        version: 1,
        exportedAt: new Date('2026-06-12T00:00:00.000Z').toISOString(),
        source: {
            app: 'VocabUp',
            entity: 'toeic-test',
        },
        test: {
            title: 'TOEIC Sample Test',
            description: 'File mẫu để admin tùy chỉnh đề TOEIC trước khi import.',
        },
        groups: [
            {
                groupRef: 'group-1',
                part: 3,
                audioUrl: 'https://example.com/audio/toeic-sample-part3.mp3',
                imageUrl: '',
                passageText: 'Questions 1-2 refer to the following conversation between two coworkers.',
            },
            {
                groupRef: 'group-2',
                part: 6,
                audioUrl: '',
                imageUrl: '',
                passageText: 'Questions 3-4 refer to the following text message exchange.',
            },
        ],
        questions: [
            {
                groupRef: 'group-1',
                questionNumber: 1,
                part: 3,
                questionText: 'What are the speakers mainly discussing?',
                options: {
                    A: 'A delayed shipment',
                    B: 'A job interview',
                    C: 'A training session',
                    D: 'A restaurant reservation',
                },
                correctAnswer: 'A',
                explanation: 'The conversation focuses on a shipment that has not arrived on time.',
                audioUrl: '',
                imageUrl: '',
            },
            {
                groupRef: 'group-1',
                questionNumber: 2,
                part: 3,
                questionText: 'What does the woman ask the man to do?',
                options: {
                    A: 'Call the customer',
                    B: 'Send an invoice',
                    C: 'Track the package',
                    D: 'Book a meeting room',
                },
                correctAnswer: 'C',
                explanation: 'She asks him to track the package immediately.',
                audioUrl: '',
                imageUrl: '',
            },
            {
                groupRef: 'group-2',
                questionNumber: 3,
                part: 6,
                questionText: 'Which word best completes the sentence?',
                options: {
                    A: 'careful',
                    B: 'carefully',
                    C: 'care',
                    D: 'caring',
                },
                correctAnswer: 'B',
                explanation: 'An adverb is needed to modify the verb.',
                audioUrl: '',
                imageUrl: '',
            },
            {
                groupRef: 'group-2',
                questionNumber: 4,
                part: 6,
                questionText: 'Which sentence best completes the text?',
                options: {
                    A: 'Please keep your receipt for future reference.',
                    B: 'The office is located near the airport.',
                    C: 'We hired three new interns last week.',
                    D: 'Lunch will be provided in the lobby.',
                },
                correctAnswer: 'A',
                explanation: 'This sentence fits the context of a purchase confirmation notice.',
                audioUrl: '',
                imageUrl: '',
            },
        ],
    };
}

async function parseJsonImportFile(file, expectedFormat, entityLabel) {
    const rawText = await file.text();
    let payload;

    try {
        payload = JSON.parse(rawText);
    } catch {
        throw new Error(`File JSON import ${entityLabel} không hợp lệ.`);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(`Cấu trúc file JSON import ${entityLabel} không hợp lệ.`);
    }

    if (payload.format !== expectedFormat) {
        throw new Error(`File JSON không đúng định dạng import ${entityLabel}.`);
    }

    return payload;
}

async function parseExcelImportFile(file, parser) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    return parser(workbook);
}

export function downloadCourseExportFile(payload, fileFormat) {
    const fileBase = `${slugifyFilePart(payload?.course?.slug || payload?.course?.title, 'course')}.course-export.v1`;

    if (fileFormat === 'excel') {
        downloadWorkbook(buildCourseWorkbook(payload), `${fileBase}.xlsx`);
        return;
    }

    downloadJsonFile(payload, `${fileBase}.json`);
}

export async function parseCourseImportFile(file) {
    const extension = ensureSupportedImportFile(file, 'khóa học');

    if (extension === 'json') {
        return parseJsonImportFile(file, 'vocabup-course-export', 'khóa học');
    }

    return parseExcelImportFile(file, parseCourseWorkbook);
}

export function downloadCourseSampleFile(fileFormat) {
    const payload = createCourseSamplePayload();

    if (fileFormat === 'excel') {
        downloadWorkbook(buildCourseWorkbook(payload), 'course-import-sample.xlsx');
        return;
    }

    downloadJsonFile(payload, 'course-import-sample.json');
}

export function downloadToeicExportFile(payload, fileFormat) {
    const fileBase = `${slugifyFilePart(payload?.test?.title, 'toeic-test')}.toeic-test-export.v1`;

    if (fileFormat === 'excel') {
        downloadWorkbook(buildToeicWorkbook(payload), `${fileBase}.xlsx`);
        return;
    }

    downloadJsonFile(payload, `${fileBase}.json`);
}

export async function parseToeicImportFile(file) {
    const extension = ensureSupportedImportFile(file, 'đề TOEIC');

    if (extension === 'json') {
        return parseJsonImportFile(file, 'vocabup-toeic-test-export', 'đề TOEIC');
    }

    return parseExcelImportFile(file, parseToeicWorkbook);
}

export function downloadToeicSampleFile(fileFormat) {
    const payload = createToeicSamplePayload();

    if (fileFormat === 'excel') {
        downloadWorkbook(buildToeicWorkbook(payload), 'toeic-import-sample.xlsx');
        return;
    }

    downloadJsonFile(payload, 'toeic-import-sample.json');
}
