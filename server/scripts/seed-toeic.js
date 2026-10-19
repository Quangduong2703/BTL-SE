const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const { loadToeicTestSourceData } = require('../lib/publicCatalog');

async function connectDB() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'vocabup',
  });
}

function parsePartNumber(partLabel) {
  const match = String(partLabel || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

async function seedData() {
  let connection;
  try {
    connection = await connectDB();
    const { listeningData, readingData } = loadToeicTestSourceData();

    await connection.execute('DELETE FROM Toeic_Tests');
    console.log('Cleared existing TOEIC tests.');

    for (const listeningTest of listeningData.tests || []) {
      const testNumber = listeningTest.id.match(/\d+/)?.[0] || '';
      const matchingReadingTest = (readingData.tests || []).find((test) => test.id.endsWith(testNumber));
      const title = `TOEIC Test ${testNumber || listeningTest.name}`;
      const desc = 'Đề luyện TOEIC gồm phần Listening và Reading, phù hợp để làm quen cấu trúc bài thi và rèn luyện tốc độ làm bài.';

      const [testResult] = await connection.execute(
        'INSERT INTO Toeic_Tests (title, description) VALUES (?, ?)',
        [title, desc],
      );

      const testId = testResult.insertId;

      const insertSections = async (sections = []) => {
        for (const section of sections) {
          const sectionAudioUrl = section.audioUrl || null;
          let currentGroupId = null;
          let currentGroupKey = null;

          for (const question of section.questions || []) {
            const part = parsePartNumber(question.toeicPart || section.label);
            const groupKey = question.groupIndex != null
              ? `group:${question.groupIndex}`
              : question.sharedPassage
                ? `passage:${question.sharedPassage}`
                : sectionAudioUrl || question.audioUrl
                  ? `audio:${sectionAudioUrl || question.audioUrl}`
                  : null;
            const needsGroup = Boolean(groupKey);

            if (needsGroup && (currentGroupId == null || currentGroupKey !== groupKey)) {
              const [groupResult] = await connection.execute(
                'INSERT INTO Toeic_Question_Groups (test_id, part, audio_url, image_url, passage_text) VALUES (?, ?, ?, ?, ?)',
                [
                  testId,
                  part,
                  sectionAudioUrl,
                  null,
                  question.sharedPassage || null,
                ],
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
                question.prompt || question.instruction || null,
                JSON.stringify(optionsMap),
                question.correctKey || '',
                question.audioUrl || null,
                question.imageUrl || null,
              ],
            );
          }
        }
      };

      await insertSections(listeningTest.sections);
      await insertSections(matchingReadingTest?.sections || []);
    }

    console.log('TOEIC Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding TOEIC data:', err);
  } finally {
    if (connection) await connection.end();
  }
}

seedData();
