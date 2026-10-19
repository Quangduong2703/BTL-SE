import { TOEIC_BASIC_LESSONS_1_TO_50 } from "./toeicBasicLessons.js";
import { ENGLISH_A1_BASIC_LESSONS_1_TO_50 } from "./englishA1BasicLessons.js";
import { ENGLISH_A2_BASIC_LESSONS_1_TO_50 } from "./englishA2BasicLessons.js";
import { ENGLISH_B1_BASIC_LESSONS_1_TO_50 } from "./englishB1BasicLessons.js";
import { ENGLISH_B2_BASIC_LESSONS_1_TO_50 } from "./englishB2BasicLessons.js";
import { ENGLISH_C1_BASIC_LESSONS_1_TO_50 } from "./englishC1BasicLessons.js";
import { ENGLISH_PHRASES_100_LESSONS } from "./englishPhrases100Lessons.js";

// Synced from server/scripts/seed-additional-courses.js
const VERY_EASY_TOEIC_TOPICS = [
  {
    id: "easy-lesson-1",
    slug: "easy-lesson-1",
    title: "Lesson 1: Office Basics",
    description: "Từ vựng cơ bản về văn phòng và giao tiếp công sở.",
    words: [
      { id: "ve001", word: "contract", language: "en", transcription: "/ˈkɒntrækt/", mean: "hợp đồng", wordtype: "n.", example: "They signed a contract yesterday.", example_vi: "Họ đã ký một hợp đồng vào hôm qua." },
      { id: "ve002", word: "establish", language: "en", transcription: "/ɪˈstæblɪʃ/", mean: "thiết lập, thành lập", wordtype: "v.", example: "The company was established in 2010.", example_vi: "Công ty được thành lập vào năm 2010." },
      { id: "ve003", word: "determine", language: "en", transcription: "/dɪˈtɜːrmɪn/", mean: "quyết định, xác định", wordtype: "v.", example: "We need to determine the cause of the problem.", example_vi: "Chúng ta cần xác định nguyên nhân của vấn đề." },
      { id: "ve004", word: "office", language: "en", transcription: "/ˈɒfɪs/", mean: "văn phòng", wordtype: "n.", example: "She works in a modern office.", example_vi: "Cô ấy làm việc trong một văn phòng hiện đại." },
      { id: "ve005", word: "colleague", language: "en", transcription: "/ˈkɒliːɡ/", mean: "đồng nghiệp", wordtype: "n.", example: "My colleagues are very helpful.", example_vi: "Các đồng nghiệp của tôi rất hữu ích." },
      { id: "ve006", word: "meeting", language: "en", transcription: "/ˈmiːtɪŋ/", mean: "cuộc họp", wordtype: "n.", example: "The meeting starts at 9 AM.", example_vi: "Cuộc họp bắt đầu lúc 9 giờ sáng." },
      { id: "ve007", word: "manager", language: "en", transcription: "/ˈmænɪdʒər/", mean: "quản lý", wordtype: "n.", example: "The manager approved the plan.", example_vi: "Người quản lý đã phê duyệt kế hoạch." },
      { id: "ve008", word: "report", language: "en", transcription: "/rɪˈpɔːrt/", mean: "báo cáo", wordtype: "n.", example: "Please submit your weekly report.", example_vi: "Vui lòng nộp báo cáo hằng tuần của bạn." },
      { id: "ve009", word: "schedule", language: "en", transcription: "/ˈskedʒuːl/", mean: "lịch trình", wordtype: "n.", example: "Check your schedule for tomorrow.", example_vi: "Kiểm tra lịch trình của bạn cho ngày mai." },
      { id: "ve010", word: "file", language: "en", transcription: "/faɪl/", mean: "hồ sơ, tệp", wordtype: "n.", example: "Please file these documents.", example_vi: "Vui lòng lưu trữ những tài liệu này." },
    ],
  },
  {
    id: "easy-lesson-2",
    slug: "easy-lesson-2",
    title: "Lesson 2: Daily Operations",
    description: "Từ vựng về hoạt động và dịch vụ hằng ngày trong doanh nghiệp.",
    words: [
      { id: "ve011", word: "resolve", language: "en", transcription: "/rɪˈzɒlv/", mean: "giải quyết", wordtype: "v.", example: "They resolved the dispute quickly.", example_vi: "Họ đã giải quyết tranh chấp một cách nhanh chóng." },
      { id: "ve012", word: "agree", language: "en", transcription: "/əˈɡriː/", mean: "đồng ý", wordtype: "v.", example: "We agree on the terms.", example_vi: "Chúng tôi đồng ý về các điều khoản." },
      { id: "ve013", word: "provide", language: "en", transcription: "/prəˈvaɪd/", mean: "cung cấp", wordtype: "v.", example: "They provide financial services.", example_vi: "Họ cung cấp dịch vụ tài chính." },
      { id: "ve014", word: "customer", language: "en", transcription: "/ˈkʌstəmər/", mean: "khách hàng", wordtype: "n.", example: "The customer is always right.", example_vi: "Khách hàng luôn luôn đúng." },
      { id: "ve015", word: "service", language: "en", transcription: "/ˈsɜːrvɪs/", mean: "dịch vụ", wordtype: "n.", example: "The service here is excellent.", example_vi: "Dịch vụ ở đây rất xuất sắc." },
      { id: "ve016", word: "phone", language: "en", transcription: "/foʊn/", mean: "điện thoại", wordtype: "n.", example: "Please answer the phone.", example_vi: "Vui lòng nghe điện thoại." },
      { id: "ve017", word: "email", language: "en", transcription: "/ˈiːmeɪl/", mean: "thư điện tử", wordtype: "n.", example: "Send me an email with details.", example_vi: "Gửi cho tôi email với các chi tiết." },
      { id: "ve018", word: "message", language: "en", transcription: "/ˈmesɪdʒ/", mean: "tin nhắn", wordtype: "n.", example: "I left a message for him.", example_vi: "Tôi đã để lại tin nhắn cho anh ấy." },
      { id: "ve019", word: "reply", language: "en", transcription: "/rɪˈplaɪ/", mean: "trả lời", wordtype: "v.", example: "Please reply to the email soon.", example_vi: "Vui lòng trả lời email sớm." },
      { id: "ve020", word: "request", language: "en", transcription: "/rɪˈkwest/", mean: "yêu cầu", wordtype: "n.", example: "We received your request.", example_vi: "Chúng tôi đã nhận được yêu cầu của bạn." },
    ],
  },
  {
    id: "easy-lesson-3",
    slug: "easy-lesson-3",
    title: "Lesson 3: Logistics & Events",
    description: "Từ vựng về logistics, chuẩn bị sự kiện và vận chuyển.",
    words: [
      { id: "ve021", word: "cancel", language: "en", transcription: "/ˈkænsəl/", mean: "hủy bỏ", wordtype: "v.", example: "The flight was canceled.", example_vi: "Chuyến bay đã bị hủy." },
      { id: "ve022", word: "deliver", language: "en", transcription: "/dɪˈlɪvər/", mean: "giao hàng", wordtype: "v.", example: "The package was delivered on time.", example_vi: "Gói hàng được giao đúng giờ." },
      { id: "ve023", word: "attend", language: "en", transcription: "/əˈtend/", mean: "tham dự", wordtype: "v.", example: "She attended the conference.", example_vi: "Cô ấy đã tham dự hội nghị." },
      { id: "ve024", word: "prepare", language: "en", transcription: "/prɪˈper/", mean: "chuẩn bị", wordtype: "v.", example: "He prepared the presentation.", example_vi: "Anh ấy đã chuẩn bị bài thuyết trình." },
      { id: "ve025", word: "event", language: "en", transcription: "/ɪˈvent/", mean: "sự kiện", wordtype: "n.", example: "The event was a great success.", example_vi: "Sự kiện đã rất thành công." },
      { id: "ve026", word: "invite", language: "en", transcription: "/ɪnˈvaɪt/", mean: "mời", wordtype: "v.", example: "They invited all employees.", example_vi: "Họ đã mời tất cả nhân viên." },
      { id: "ve027", word: "guest", language: "en", transcription: "/ɡest/", mean: "khách mời", wordtype: "n.", example: "All guests must register.", example_vi: "Tất cả khách mời phải đăng ký." },
      { id: "ve028", word: "package", language: "en", transcription: "/ˈpækɪdʒ/", mean: "gói hàng", wordtype: "n.", example: "The package arrived this morning.", example_vi: "Gói hàng đã đến sáng nay." },
      { id: "ve029", word: "ship", language: "en", transcription: "/ʃɪp/", mean: "vận chuyển", wordtype: "v.", example: "We ship to all countries.", example_vi: "Chúng tôi vận chuyển đến mọi quốc gia." },
      { id: "ve030", word: "venue", language: "en", transcription: "/ˈvenjuː/", mean: "địa điểm tổ chức", wordtype: "n.", example: "The venue can hold 500 people.", example_vi: "Địa điểm có thể chứa 500 người." },
    ],
  },
];

function normalizeWords(words = []) {
  return words.map((word) => ({
    ...word,
    remembered: false,
  }));
}

function normalizeTopics(topics = []) {
  return topics.map((topic, index) => ({
    ...topic,
    slug: topic.slug || topic.id,
    sortOrder: topic.sortOrder || index + 1,
    wordCount: topic.words?.length || topic.wordCount || 0,
    vocabularyCount: topic.words?.length || topic.vocabularyCount || 0,
    words: normalizeWords(topic.words || []),
  }));
}

const GUEST_TOEIC_COURSE_MAP = {
  "toeic-very-easy": {
    id: "toeic-very-easy",
    slug: "toeic-very-easy",
    title: "Very Easy TOEIC Vocabulary",
    description: "Từ vựng TOEIC cực kỳ cơ bản dành cho người mới bắt đầu, phù hợp cho người mới học hoặc bắt đầu học thử.",
    language: "en",
    lang: "en",
    sortOrder: 1,
    topics: normalizeTopics(VERY_EASY_TOEIC_TOPICS),
  },
  "toeic-basic": {
    id: "toeic-basic",
    slug: "toeic-basic",
    title: "600 Essential Words for the TOEIC",
    description: "Bộ 50 chủ đề từ vựng TOEIC cốt lõi thiết yếu với 600 từ vựng giúp người dùng học tập và hỗ trợ cho việc ôn luyện TOEIC.",
    language: "en",
    lang: "en",
    sortOrder: 2,
    topics: normalizeTopics(TOEIC_BASIC_LESSONS_1_TO_50),
  },
  "english-a1-basic": {
    id: "english-a1-basic",
    slug: "english-a1-basic",
    title: "English A1 Basic Vocabulary",
    description: "Bộ 50 chủ đề từ vựng tiếng Anh A1 cơ bản với 500 từ vựng nền tảng, chia theo các topic quen thuộc để người mới bắt đầu học dễ hơn.",
    language: "en",
    lang: "en",
    sortOrder: 3,
    topics: normalizeTopics(ENGLISH_A1_BASIC_LESSONS_1_TO_50),
  },
  "english-a2-basic": {
    id: "english-a2-basic",
    slug: "english-a2-basic",
    title: "English A2 Basic Vocabulary",
    description: "Bộ 50 chủ đề từ vựng tiếng Anh A2 với 1500 từ vựng nền tảng, được chia theo nhiều topic quen thuộc và phù hợp hơn cho trình độ A2.",
    language: "en",
    lang: "en",
    sortOrder: 4,
    topics: normalizeTopics(ENGLISH_A2_BASIC_LESSONS_1_TO_50),
  },
  "english-b1-basic": {
    id: "english-b1-basic",
    slug: "english-b1-basic",
    title: "English B1 Intermediate Vocabulary",
    description: "Bộ 50 chủ đề từ vựng tiếng Anh B1 với 2000 từ vựng, kết hợp nền tảng A2 và nhóm từ mở rộng để phù hợp hơn cho trình độ sơ trung cấp.",
    language: "en",
    lang: "en",
    sortOrder: 5,
    topics: normalizeTopics(ENGLISH_B1_BASIC_LESSONS_1_TO_50),
  },
  "english-b2-basic": {
    id: "english-b2-basic",
    slug: "english-b2-basic",
    title: "English B2 Upper-Intermediate Vocabulary",
    description: "Bộ 50 chủ đề từ vựng tiếng Anh B2 với 2500 từ vựng, tiếp nối B1 và mở rộng thêm vốn từ học thuật, công việc và đời sống hàng ngày.",
    language: "en",
    lang: "en",
    sortOrder: 6,
    topics: normalizeTopics(ENGLISH_B2_BASIC_LESSONS_1_TO_50),
  },
  "english-c1-basic": {
    id: "english-c1-basic",
    slug: "english-c1-basic",
    title: "English C1 Advanced Vocabulary",
    description: "Bộ 50 chủ đề từ vựng tiếng Anh C1 với 3000 từ vựng, mở rộng từ B2 với nhiều từ học thuật và diễn đạt nâng cao hơn.",
    language: "en",
    lang: "en",
    sortOrder: 7,
    topics: normalizeTopics(ENGLISH_C1_BASIC_LESSONS_1_TO_50),
  },
  "english-phrases-basic": {
    id: "english-phrases-basic",
    slug: "english-phrases-basic",
    title: "100 Cụm từ thông dụng nhất",
    description: "Bộ 10 chủ đề với 100 cụm từ tiếng Anh thông dụng nhất, giúp người học ghi nhớ các mẫu diễn đạt dùng thường xuyên trong giao tiếp.",
    language: "en",
    lang: "en",
    sortOrder: 8,
    topics: normalizeTopics(ENGLISH_PHRASES_100_LESSONS),
  },
};

export function isGuestReadyCourseId(courseId) {
  return Boolean(GUEST_TOEIC_COURSE_MAP[courseId]);
}

export function getGuestReadyCourseById(courseId) {
  const course = GUEST_TOEIC_COURSE_MAP[courseId];
  if (!course) return null;

  return {
    ...course,
    topics: normalizeTopics(course.topics),
  };
}

export function getGuestReadyCourseTopics(courseId) {
  const course = getGuestReadyCourseById(courseId);
  if (!course) return null;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    courseTitle: course.title,
    description: course.description,
    language: course.language,
    lang: course.lang,
    topics: normalizeTopics(course.topics),
  };
}

export function getGuestReadyCourseSummaries() {
  return Object.values(GUEST_TOEIC_COURSE_MAP)
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      language: course.language,
      lang: course.lang,
      sortOrder: course.sortOrder,
      topic_count: course.topics.length,
      vocabulary_count: course.topics.reduce(
        (sum, topic) => sum + (topic.words?.length || 0),
        0,
      ),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getGuestReadyCoursesCatalog() {
  return Object.values(GUEST_TOEIC_COURSE_MAP)
    .map((course) => ({
      ...course,
      sort_order: course.sortOrder,
      topics: normalizeTopics(course.topics),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mergeGuestReadyCourses(courses = []) {
  const mergedMap = new Map();

  courses.forEach((course) => {
    const key = course.slug || course.id;
    mergedMap.set(key, course);
  });

  getGuestReadyCourseSummaries().forEach((course) => {
    const existingCourse = mergedMap.get(course.slug);

    if (existingCourse) {
      mergedMap.set(course.slug, {
        ...course,
        ...existingCourse,
        description: existingCourse.description || course.description,
        topic_count: existingCourse.topic_count ?? existingCourse.topicCount ?? course.topic_count,
        vocabulary_count: existingCourse.vocabulary_count ?? existingCourse.vocabularyCount ?? course.vocabulary_count,
      });
      return;
    }

    mergedMap.set(course.slug, course);
  });

  return Array.from(mergedMap.values()).sort((a, b) => {
    const aOrder = Number(a.sortOrder || a.sort_order || 9999);
    const bOrder = Number(b.sortOrder || b.sort_order || 9999);
    return aOrder - bOrder;
  });
}

export function getGuestReadyCourseManagerFallbacks() {
  return getGuestReadyCourseSummaries().map((course) => ({
    ...course,
    id: course.slug,
    topicCount: course.topic_count,
    vocabularyCount: course.vocabulary_count,
    isCatalogFallback: true,
  }));
}
