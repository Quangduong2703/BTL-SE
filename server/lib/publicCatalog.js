const path = require('path');
const { pathToFileURL } = require('url');

const GUEST_COURSES_PATH = path.join(__dirname, '../../src/data/guestToeicCourses.js');
const LISTENING_JSON_PATH = path.join(__dirname, '../../src/data/toeicListeningTests.generated.json');
const READING_JSON_PATH = path.join(__dirname, '../../src/data/toeicReadingTests.generated.json');

async function importDataModule(modulePath) {
  return import(pathToFileURL(modulePath).href);
}

async function loadPublicCoursesCatalog() {
  const imported = await importDataModule(GUEST_COURSES_PATH);
  if (typeof imported.getGuestReadyCoursesCatalog === 'function') {
    return imported.getGuestReadyCoursesCatalog();
  }
  return [];
}

function loadJsonFile(filePath) {
  return JSON.parse(require('fs').readFileSync(filePath, 'utf8'));
}

function loadToeicTestSourceData() {
  return {
    listeningData: loadJsonFile(LISTENING_JSON_PATH),
    readingData: loadJsonFile(READING_JSON_PATH),
  };
}

module.exports = {
  loadPublicCoursesCatalog,
  loadToeicTestSourceData,
};
