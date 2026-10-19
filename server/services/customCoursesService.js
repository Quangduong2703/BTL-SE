const {
  getCustomTopicsByUser,
  getCustomTopicWithWords,
  createCustomTopic,
  updateCustomTopic,
  deleteCustomTopic,
  addWordToCustomTopic,
  updateWordInCustomTopic,
  deleteWordFromCustomTopic,
} = require('../models/customCoursesModel');

function normalizeLanguage(value, fallback = 'en') {
  const language = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return language || fallback;
}

async function fetchCustomTopics(userId) {
  return getCustomTopicsByUser(userId);
}

async function fetchCustomTopicWithWords(userId, topicId) {
  const topic = await getCustomTopicWithWords(userId, topicId);
  if (!topic) throw Object.assign(new Error('Topic not found'), { status: 404 });
  return topic;
}

async function createTopic(userId, data) {
  if (!data.title || !data.title.trim()) {
    throw Object.assign(new Error('Title is required'), { status: 400 });
  }
  const sharedTopicId = data.sharedTopicId || data.shared_topic_id || data.sharedTopic || null;
  return createCustomTopic(userId, {
    ...data,
    title: data.title.trim(),
    language: normalizeLanguage(data.lang || data.language, 'en'),
    sharedTopicId,
  });
}

async function updateTopic(userId, topicId, data) {
  if (!data.title || !data.title.trim()) {
    throw Object.assign(new Error('Title is required'), { status: 400 });
  }
  const payload = { ...data, title: data.title.trim() };
  if (data.lang || data.language) {
    payload.language = normalizeLanguage(data.lang || data.language, 'en');
  }
  const ok = await updateCustomTopic(userId, topicId, payload);
  if (!ok) throw Object.assign(new Error('Topic not found'), { status: 404 });
}

async function deleteTopic(userId, topicId) {
  const ok = await deleteCustomTopic(userId, topicId);
  if (!ok) throw Object.assign(new Error('Topic not found'), { status: 404 });
}

async function addWord(userId, topicId, wordData) {
  if (!wordData.word || !wordData.word.trim()) {
    throw Object.assign(new Error('word is required'), { status: 400 });
  }
  const result = await addWordToCustomTopic(userId, topicId, wordData);
  if (!result) throw Object.assign(new Error('Topic not found'), { status: 404 });
  return result;
}

async function updateWord(userId, topicId, wordId, wordData) {
  const ok = await updateWordInCustomTopic(userId, topicId, wordId, wordData);
  if (!ok) throw Object.assign(new Error('Word not found'), { status: 404 });
}

async function deleteWord(userId, topicId, wordId) {
  const ok = await deleteWordFromCustomTopic(userId, topicId, wordId);
  if (!ok) throw Object.assign(new Error('Word not found'), { status: 404 });
}

module.exports = {
  fetchCustomTopics,
  fetchCustomTopicWithWords,
  createTopic,
  updateTopic,
  deleteTopic,
  addWord,
  updateWord,
  deleteWord,
};
