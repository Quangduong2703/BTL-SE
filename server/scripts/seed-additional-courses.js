const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const { loadPublicCoursesCatalog } = require('../lib/publicCatalog');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'vocabup',
  });

  function courseSortOrder(course) {
    return Number(course.sort_order ?? course.sortOrder ?? 0);
  }

  async function upsertCourse(course) {
    const [existing] = await connection.execute(
      'SELECT id FROM Courses WHERE slug = ? LIMIT 1',
      [course.slug],
    );

    const payload = [
      course.title,
      course.description || '',
      course.language || course.lang || 'en',
      courseSortOrder(course),
    ];

    if (existing.length > 0) {
      const courseId = existing[0].id;
      await connection.execute(
        'UPDATE Courses SET title = ?, description = ?, language = ?, sort_order = ? WHERE id = ?',
        [...payload, courseId],
      );
      return courseId;
    }

    const [insertRes] = await connection.execute(
      'INSERT INTO Courses (slug, title, description, language, sort_order) VALUES (?, ?, ?, ?, ?)',
      [course.slug, ...payload],
    );
    return insertRes.insertId;
  }

  async function upsertTopic(courseId, topic, index) {
    const [existing] = await connection.execute(
      'SELECT id FROM Topics WHERE course_id = ? AND slug = ? LIMIT 1',
      [courseId, topic.slug || topic.id],
    );

    const topicSlug = topic.slug || topic.id;
    const sortOrder = Number(topic.sort_order ?? topic.sortOrder ?? index + 1);

    let topicId;
    if (existing.length > 0) {
      topicId = existing[0].id;
      await connection.execute(
        'UPDATE Topics SET title = ?, description = ?, sort_order = ? WHERE id = ?',
        [topic.title, topic.description || '', sortOrder, topicId],
      );
      await connection.execute('DELETE FROM Flashcards WHERE topic_id = ?', [topicId]);
    } else {
      const [insertRes] = await connection.execute(
        'INSERT INTO Topics (course_id, slug, title, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [courseId, topicSlug, topic.title, topic.description || '', sortOrder],
      );
      topicId = insertRes.insertId;
    }

    for (const word of topic.words || []) {
      await connection.execute(
        'INSERT INTO Flashcards (topic_id, word, transcription, meaning, word_type, example, example_vi) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          topicId,
          word.word || '',
          word.transcription || '',
          word.mean || word.meaning || '',
          word.wordtype || word.word_type || '',
          word.example || '',
          word.example_vi || '',
        ],
      );
    }
  }

  try {
    const publicCourses = await loadPublicCoursesCatalog();

    for (const course of publicCourses) {
      const courseId = await upsertCourse(course);
      for (const [index, topic] of (course.topics || []).entries()) {
        await upsertTopic(courseId, topic, index);
      }
    }

    console.log(`Synced ${publicCourses.length} public courses from shared catalog.`);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

seed();
