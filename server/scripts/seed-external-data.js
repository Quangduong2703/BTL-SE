const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { loadPublicCoursesCatalog } = require('../lib/publicCatalog');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../src/data');
const DATA_DIR = process.env.VOCABUP_DATA_DIR
  ? path.resolve(process.env.VOCABUP_DATA_DIR)
  : DEFAULT_DATA_DIR;

const LISTENING_JSON_PATH = path.join(DATA_DIR, 'toeicListeningTests.generated.json');
const READING_JSON_PATH = path.join(DATA_DIR, 'toeicReadingTests.generated.json');

async function connectDB() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'vocabup',
  });
}

function parsePartNumber(partLabel) {
  const match = String(partLabel || '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertSourceFilesExist() {
  [LISTENING_JSON_PATH, READING_JSON_PATH].forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing source file: ${filePath}`);
    }
  });
}

async function upsertToeicCourse(connection, course) {
  const courseDescription = 'Bộ tài liệu từ vựng TOEIC theo chủ đề, phù hợp cho lộ trình tự học và luyện thi hằng ngày.';
  const sortOrder = Number(course.sort_order ?? course.sortOrder ?? 1);
  const [existing] = await connection.execute(
    'SELECT id FROM Courses WHERE slug = ? LIMIT 1',
    [course.id]
  );

  if (existing.length > 0) {
    const courseId = existing[0].id;
    await connection.execute(
      'UPDATE Courses SET title = ?, description = ?, language = ?, sort_order = ? WHERE id = ?',
      [course.title, courseDescription, course.lang || 'en', sortOrder, courseId]
    );
    return courseId;
  }

  const [insertResult] = await connection.execute(
    'INSERT INTO Courses (slug, title, description, language, sort_order) VALUES (?, ?, ?, ?, ?)',
    [course.id, course.title, courseDescription, course.lang || 'en', sortOrder]
  );

  return insertResult.insertId;
}

async function reseedVocabulary(connection, course) {
  const courseId = await upsertToeicCourse(connection, course);

  await connection.execute('DELETE FROM Topics WHERE course_id = ?', [courseId]);

  for (const [topicIndex, topic] of (course.topics || []).entries()) {
    const [topicResult] = await connection.execute(
      'INSERT INTO Topics (course_id, slug, title, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [
        courseId,
        topic.id,
        topic.title,
        topic.description || '',
        topicIndex + 1,
      ]
    );

    const topicId = topicResult.insertId;

    for (const word of topic.words || []) {
      await connection.execute(
        'INSERT INTO Flashcards (topic_id, external_id, word, transcription, meaning, word_type, example, example_vi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          topicId,
          word.id || null,
          word.word || '',
          word.transcription || '',
          word.mean || '',
          word.wordtype || '',
          word.example || '',
          word.example_vi || '',
        ]
      );
    }
  }
}

async function insertToeicSections(connection, testId, sections) {
  for (const section of sections || []) {
    const sectionAudioUrl = section.audioUrl || null;
    let currentGroupId = null;
    let currentGroupKey = null;

    for (const question of section.questions || []) {
      const part = parsePartNumber(question.toeicPart || section.label);
      const groupKey = question.groupIndex != null
        ? `group:${question.groupIndex}`
        : (question.sharedPassage ? `passage:${question.sharedPassage}` : null);
      const needsGroup = Boolean(groupKey || sectionAudioUrl);

      if (needsGroup && (currentGroupId == null || groupKey !== currentGroupKey)) {
        const [groupResult] = await connection.execute(
          'INSERT INTO Toeic_Question_Groups (test_id, part, audio_url, image_url, passage_text) VALUES (?, ?, ?, ?, ?)',
          [
            testId,
            part,
            sectionAudioUrl,
            null,
            question.sharedPassage || null,
          ]
        );
        currentGroupId = groupResult.insertId;
        currentGroupKey = groupKey;
      } else if (!needsGroup) {
        currentGroupId = null;
        currentGroupKey = null;
      }

      const optionsMap = {};
      for (const option of question.options || []) {
        optionsMap[option.key] = option.text;
      }

      await connection.execute(
        'INSERT INTO Toeic_Questions (test_id, group_id, question_number, part, question_text, options, correct_answer, audio_url, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          testId,
          currentGroupId,
          question.displayNumber,
          part,
          question.prompt || question.instruction || '',
          JSON.stringify(optionsMap),
          question.correctKey || '',
          question.audioUrl || null,
          question.imageUrl || null,
        ]
      );
    }
  }
}

async function reseedToeicTests(connection, listeningData, readingData) {
  await connection.execute('DELETE FROM Toeic_Tests');

  for (const listeningTest of listeningData.tests || []) {
    const testNumber = listeningTest.id.match(/\d+/)?.[0] || '';
    const matchingReadingTest = (readingData.tests || []).find((test) => test.id.endsWith(testNumber));
    const title = `TOEIC Test ${testNumber || listeningTest.name}`;
    const description = 'Đề luyện TOEIC gồm phần Listening và Reading, phù hợp để làm quen cấu trúc bài thi và rèn luyện tốc độ làm bài.';

    const [testResult] = await connection.execute(
      'INSERT INTO Toeic_Tests (title, description) VALUES (?, ?)',
      [title, description]
    );

    const testId = testResult.insertId;

    await insertToeicSections(connection, testId, listeningTest.sections);
    await insertToeicSections(connection, testId, matchingReadingTest?.sections || []);
  }
}

async function main() {
  let connection;

  try {
    assertSourceFilesExist();

    const publicCourses = await loadPublicCoursesCatalog();
    const listeningData = loadJson(LISTENING_JSON_PATH);
    const readingData = loadJson(READING_JSON_PATH);

    connection = await connectDB();
    await connection.beginTransaction();

    for (const course of publicCourses) {
      await reseedVocabulary(connection, course);
    }
    await reseedToeicTests(connection, listeningData, readingData);

    await connection.commit();

    console.log(`Seed completed from ${DATA_DIR}`);
    console.log(`Vocabulary courses: ${publicCourses.length}`);
    console.log(`Listening tests: ${(listeningData.tests || []).length}`);
    console.log(`Reading tests: ${(readingData.tests || []).length}`);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
