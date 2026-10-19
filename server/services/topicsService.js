const {
  getTopicBySlug,
  getFlashcardsByTopicId,
} = require('../models/topicModel');
const { deleteByPrefix } = require('../lib/ttlCache');

const TOPIC_CACHE_PREFIX = 'topics:';

async function fetchFlashcardsByTopicSlug(topicSlug) {
  const topic = await getTopicBySlug(topicSlug);
  if (!topic) {
    const error = new Error('Topic not found');
    error.status = 404;
    throw error;
  }

  return getFlashcardsByTopicId(topic.id);
}

function invalidateTopicCache() {
  deleteByPrefix(TOPIC_CACHE_PREFIX);
}

module.exports = {
  fetchFlashcardsByTopicSlug,
  invalidateTopicCache,
};
