const {
  getAllCourses,
  getCourseBySlug,
  getTopicsByCourseId,
} = require('../models/courseModel');
const { getOrSet, deleteByPrefix } = require('../lib/ttlCache');

const COURSES_CACHE_PREFIX = 'courses:';
const COURSES_LIST_TTL_MS = 5 * 60 * 1000;
const COURSE_TOPICS_TTL_MS = 5 * 60 * 1000;

async function fetchCourses() {
  return getOrSet(`${COURSES_CACHE_PREFIX}list`, COURSES_LIST_TTL_MS, () => getAllCourses());
}

async function fetchTopicsByCourseSlug(courseSlug) {
  return getOrSet(`${COURSES_CACHE_PREFIX}${courseSlug}:topics`, COURSE_TOPICS_TTL_MS, async () => {
    const course = await getCourseBySlug(courseSlug);
    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      throw error;
    }

    const topics = await getTopicsByCourseId(course.id);

    return {
      courseTitle: course.title,
      topics,
    };
  });
}

function invalidateCourseCache() {
  deleteByPrefix(COURSES_CACHE_PREFIX);
}

module.exports = {
  fetchCourses,
  fetchTopicsByCourseSlug,
  invalidateCourseCache,
};
