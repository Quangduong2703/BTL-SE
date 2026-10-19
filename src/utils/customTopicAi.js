const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during',
  'each',
  'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just',
  'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'can', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'could', 'ought',
]);

export const MAX_PREVIEW_WORDS = 50;
export const MAX_SELECTABLE_WORDS = 15;

export const TOPIC_LANGUAGE_META = {
  en: {
    label: 'Tiếng Anh',
    sourceLabel: 'an English source',
    scriptHint: 'English',
    candidatePattern: /[A-Za-z][A-Za-z'-]{1,}/g,
    candidateLanguageNote: 'English vocabulary and useful fixed expressions',
  },
  ja: {
    label: 'Tiếng Nhật',
    sourceLabel: 'a Japanese source',
    scriptHint: 'Japanese',
    candidatePattern: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}][\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}'-]{0,}/gu,
    candidateLanguageNote: 'Japanese vocabulary and useful fixed expressions',
  },
  zh: {
    label: 'Tiếng Trung (giản thể)',
    sourceLabel: 'a Simplified Chinese source',
    scriptHint: 'Simplified Chinese',
    candidatePattern: /[\p{Script=Han}][\p{Script=Han}\p{N}'-]{0,}/gu,
    candidateLanguageNote: 'Simplified Chinese vocabulary and useful fixed expressions',
  },
};

function normalizeTopicLang(topicLang = 'en') {
  return String(topicLang || 'en').trim().toLowerCase() || 'en';
}

export function getTopicLanguageMeta(topicLang = 'en') {
  const normalized = normalizeTopicLang(topicLang);
  return TOPIC_LANGUAGE_META[normalized] || TOPIC_LANGUAGE_META.en;
}

export function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeWord(value) {
  return cleanText(value).toLocaleLowerCase();
}

export function limitMeaning(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
}

export function extractJsonPayload(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const startArray = cleaned.indexOf('[');
  const endArray = cleaned.lastIndexOf(']');
  if (startArray !== -1 && endArray !== -1 && endArray > startArray) {
    return cleaned.slice(startArray, endArray + 1);
  }

  const startObject = cleaned.indexOf('{');
  const endObject = cleaned.lastIndexOf('}');
  if (startObject === -1 || endObject === -1 || endObject <= startObject) {
    throw new Error('AI không trả về dữ liệu JSON hợp lệ.');
  }

  return cleaned.slice(startObject, endObject + 1);
}

export function normalizePreviewItem(item, fallback = {}) {
  const pick = (...values) => values.map(cleanText).find(Boolean) || '';
  const normalized = {
    word: pick(item?.word, item?.headword, item?.term) || cleanText(fallback.word),
    mean: pick(item?.mean, item?.meaning, item?.definition, item?.sense) || cleanText(fallback.mean),
    wordtype: pick(item?.wordtype, item?.word_type, item?.part_of_speech, item?.pos, item?.type) || cleanText(fallback.wordtype),
  };

  if (!normalized.word) return null;
  normalized.mean = limitMeaning(normalized.mean);
  return normalized;
}

export function parseJsonList(text) {
  const parsed = JSON.parse(extractJsonPayload(text));
  return Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed?.words)
        ? parsed.words
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [parsed];
}

export function collectVocabularyCandidatesFromText(rawText, topicLang = 'en', maxCandidates = 220) {
  const text = cleanText(rawText);
  if (!text) return [];

  const normalizedTopicLang = normalizeTopicLang(topicLang);
  const languageMeta = getTopicLanguageMeta(normalizedTopicLang);
  const tokens = text.match(languageMeta.candidatePattern) || [];
  const counts = new Map();
  const firstSeen = new Map();

  tokens.forEach((token, index) => {
    const normalized = token.toLowerCase().replace(/^'+|'+$/g, '');
    if (!normalized) return;
    if (normalizedTopicLang === 'en' && (normalized.length < 3 || STOPWORDS.has(normalized))) return;
    if (normalizedTopicLang !== 'en' && normalized.length < 1) return;
    if (normalizedTopicLang === 'en' && !/[a-z]/i.test(normalized)) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
    if (!firstSeen.has(normalized)) firstSeen.set(normalized, index);
  });

  const scored = Array.from(counts.entries()).map(([word, count]) => ({
    word,
    count,
    firstIndex: firstSeen.get(word) ?? 0,
  }));

  scored.sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    if (left.word.length !== right.word.length) return left.word.length - right.word.length;
    return left.firstIndex - right.firstIndex;
  });

  return scored.slice(0, maxCandidates).map((item) => item.word);
}

export function buildSmartVocabularyPrompt({
  topicLang = 'en',
  sourceLabel,
  rawText,
  candidates = [],
  existingWords = [],
  maxPreviewWords = MAX_PREVIEW_WORDS,
}) {
  const languageMeta = getTopicLanguageMeta(normalizeTopicLang(topicLang));
  const existingList = existingWords.slice(0, 40).map((word) => cleanText(word?.word)).filter(Boolean).join(', ');
  const candidateList = candidates.slice(0, 220).join(', ');
  const excerpt = cleanText(rawText).slice(0, 12000);

  return `You are analyzing ${sourceLabel}.

Return ONLY one valid JSON array.
Do not include markdown, explanations, or extra text.
Return at most ${maxPreviewWords} items.

Each item must contain exactly these keys:
word, mean, wordtype

Hidden vocabulary filter rules:
- Prioritize important ${languageMeta.candidateLanguageNote}.
- Prefer words that are central, repeated, domain-relevant, or worth learning.
- Ignore filler, grammar-only words, and obvious duplicates.
- If the source is noisy or unstructured, choose the best vocabulary candidates from the text.
- The "mean" field must be short Vietnamese, no more than 5 words.
- The "wordtype" field should be specific, such as noun, verb, adjective, adverb, phrase.
- If a word already exists in the current topic, prefer another useful word instead.
- Keep the order roughly aligned with the source when possible.

Existing words in this topic:
${existingList || '(none)'}

Candidate vocabulary:
${candidateList || '(none)'}

Source text excerpt:
${excerpt || '(empty)'}`;
}
