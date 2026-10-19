import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import ToastNotice from '../../components/common/ToastNotice';
import { useAuth } from '../../contexts/useAuth';
import { getGuestReadyCourseTopics, isGuestReadyCourseId } from '../../data/guestToeicCourses';
import axiosClient from '../../utils/axiosClient';
import { useCourseProgress } from '../../hooks/useCourseProgress';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import WordModal from '../../components/detailTopic/WordModal';
import AIGenModal from '../../components/detailTopic/AIGenModal';
import CustomTopicExcelImportModal from '../../components/detailTopic/CustomTopicExcelImportModal';
import CustomTopicImageImportModal from '../../components/detailTopic/CustomTopicImageImportModal';
import CustomTopicFileImportModal from '../../components/detailTopic/CustomTopicFileImportModal';
import CustomTopicTextImportModal from '../../components/detailTopic/CustomTopicTextImportModal';
import WordDetailOverlay from '../../components/detailTopic/WordDetailOverlay';
import TopicPickerModal from '../../components/detailTopic/TopicPickerModal';
import Flashcard from '../../components/Flashcard';
import Quiz from '../../components/Quiz';
import Listening from '../../components/Listening';
import Typing from '../../components/Typing';
import Match from '../../components/Match';
import flappyLogo from '../../assets/images/logo-flappybird-course.png';
import rainLogo from '../../assets/images/logo-rain-vocab.png';
import FlappyBirdExperience, { BIRD_OPTIONS, GAME_CARD } from '../../components/games/FlappyBirdExperience';
import VocabularyRainExperience from '../../components/games/VocabularyRainExperience';
import { getDashboardUserKey, recordFlashcardSessionProgress, recordStudyModeCompletion } from '../../utils/dashboardProgress';
import { recordGamePlay } from '../../utils/userStats';
import { getSpeechLang } from '../../utils/studyModes';
import { addToSrs, enqueueToSrsNow, removeFromSrs, reviewItem } from '../../utils/srsStorage';
import {
  enqueueImmediateReviews,
  hasServerFlashcardId,
  hasServerSrsAccess,
  mapReviewRatingToQualityScore,
  submitSrsReviewBatch,
} from '../../utils/srsApi';
import { xpStudyModeComplete } from '../../utils/xpSystem';
import { recordVocabularyActivity } from '../../utils/vocabActivityApi';
import { AI_API_URL, AI_MODEL } from '../../utils/aiConfig';

const SVG_ICONS = {
  VOICE: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.8871 3.73857C11.7129 3.52485 11.3991 3.49335 11.1854 3.66756L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 13.9004 17.2558 15.6248 16.0497 16.9003L14.6319 15.4826C15.4819 14.5699 16 13.3459 16 12C16 10.6541 15.4819 9.43013 14.6319 8.51742L16.0497 7.09966C17.2558 8.37516 18 10.0996 18 12Z" />
    </svg>
  ),
  CHEVRON: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z" />
    </svg>
  ),
  EDIT: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M15.7279 9.57629L14.3137 8.16207L5 17.4758V18.89H6.41421L15.7279 9.57629ZM17.1421 8.16207L18.5563 6.74786L17.1421 5.33365L15.7279 6.74786L17.1421 8.16207ZM7.24264 20.89H3V16.6474L16.435 3.21233C16.8256 2.8218 17.4587 2.8218 17.8492 3.21233L20.6777 6.04075C21.0682 6.43128 21.0682 7.06444 20.6777 7.45497L7.24264 20.89Z" />
    </svg>
  ),
  DELETE: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z" />
    </svg>
  ),
  BACK: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z" />
    </svg>
  ),
  AI: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M11 2L13.09 8.26L19 10.35L13.09 12.44L11 18.7L8.91 12.44L3 10.35L8.91 8.26L11 2ZM18 14L19.25 17.75L23 19L19.25 20.25L18 24L16.75 20.25L13 19L16.75 17.75L18 14Z" />
    </svg>
  ),
};

const AI_LANGUAGE_META = {
  en: {
    name: 'English',
    systemPrompt: 'You audit and correct a single English vocabulary record for Vietnamese learners. Return only one valid JSON object with exactly these keys: word, mean, transcription, wordtype, example, example_vi. Use the provided word as the headword. Use mean as the primary semantic anchor when it is present; otherwise use wordtype. Verify every field for correctness, naturalness, and consistency. Fix inaccurate or awkward fields. Keep example_vi as a faithful Vietnamese translation of example. Do not add explanations.',
  },
  ko: {
    name: 'Korean',
    systemPrompt: 'You audit and correct a single Korean vocabulary record for Vietnamese learners. Return only one valid JSON object with exactly these keys: word, mean, transcription, wordtype, example, example_vi. Use the provided word as the headword. Use mean as the primary semantic anchor when it is present; otherwise use wordtype. Verify every field for correctness, naturalness, and consistency. Fix inaccurate or awkward fields. Keep example_vi as a faithful Vietnamese translation of example. Do not add explanations.',
  },
  ja: {
    name: 'Japanese',
    systemPrompt: 'You audit and correct a single Japanese vocabulary record for Vietnamese learners. Return only one valid JSON object with exactly these keys: word, mean, transcription, wordtype, example, example_vi. Use the provided word as the headword. Use mean as the primary semantic anchor when it is present; otherwise use wordtype. Verify every field for correctness, naturalness, and consistency. Fix inaccurate or awkward fields. Keep example_vi as a faithful Vietnamese translation of example. The transcription field must be written in Romaji using standard Hepburn romanization. Do not add explanations.',
  },
  zh: {
    name: 'Simplified Chinese',
    systemPrompt: 'You audit and correct a single Simplified Chinese vocabulary record for Vietnamese learners. Return only one valid JSON object with exactly these keys: word, mean, transcription, wordtype, example, example_vi. Use the provided word as the headword. Use mean as the primary semantic anchor when it is present; otherwise use wordtype. Verify every field for correctness, naturalness, and consistency. Fix inaccurate or awkward fields. Keep example_vi as a faithful Vietnamese translation of example. For transcription, use valid pinyin with tone marks. Do not add explanations.',
  },
  fr: {
    name: 'French',
    systemPrompt: 'You audit and correct a single French vocabulary record for Vietnamese learners. Return only one valid JSON object with exactly these keys: word, mean, transcription, wordtype, example, example_vi. Use the provided word as the headword. Use mean as the primary semantic anchor when it is present; otherwise use wordtype. Verify every field for correctness, naturalness, and consistency. Fix inaccurate or awkward fields. Keep example_vi as a faithful Vietnamese translation of example. Do not add explanations.',
  },
};

function cleanAiText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'`]+|[\s"'`]+$/g, '')
    .trim();
}

function isLikelyEnglishMeaning(value) {
  const text = cleanAiText(value);
  if (!text) return false;
  if (/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụýỳỷỹỵ]/i.test(text)) {
    return false;
  }
  return /^[a-z0-9\s,'"()\-/:;.!?&]+$/i.test(text);
}

function limitMeaningToFiveWords(value) {
  const text = cleanAiText(value);
  if (!text) return '';
  const parts = text.split(/\s+/).filter(Boolean);
  return parts.slice(0, 5).join(' ');
}

function extractJsonObject(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI không trả về JSON object hợp lệ');
  }
  return cleaned.slice(start, end + 1);
}

function extractJsonArray(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const startArray = cleaned.indexOf('[');
  const endArray = cleaned.lastIndexOf(']');
  if (startArray !== -1 && endArray !== -1 && endArray > startArray) {
    return cleaned.slice(startArray, endArray + 1);
  }

  const startObject = cleaned.indexOf('{');
  const endObject = cleaned.lastIndexOf('}');
  if (startObject === -1 || endObject === -1 || endObject <= startObject) {
    throw new Error('AI không trả về JSON array hợp lệ');
  }

  return cleaned.slice(startObject, endObject + 1);
}

function getWordAuditAnchor(word) {
  return {
    anchorName: 'word',
    anchorValue: cleanAiText(word?.word),
  };
}

function buildAuditWordPrompt(word, langName) {
  const currentValues = [
    `word: ${cleanAiText(word?.word) || '(empty)'}`,
    `mean: ${cleanAiText(word?.mean) || '(empty)'}`,
    `transcription: ${cleanAiText(word?.transcription) || '(empty)'}`,
    `wordtype: ${cleanAiText(word?.wordtype) || '(empty)'}`,
    `example: ${cleanAiText(word?.example) || '(empty)'}`,
    `example_vi: ${cleanAiText(word?.example_vi) || '(empty)'}`,
  ].join('\n');
  const { anchorName, anchorValue } = getWordAuditAnchor(word);

  return `Audit and correct this ${langName} vocabulary record.

Return ONLY one valid JSON object with EXACTLY these keys:
word, mean, transcription, wordtype, example, example_vi

Rules:
- Use the provided word as the headword and semantic anchor.
- You may correct a bad word spelling only if the correction is obvious and unambiguous from the context.
- The "mean" field must always be in Vietnamese, even if the input meaning is in English.
- If the current meaning is English, translate it to concise Vietnamese.
- The "mean" field must be short and must not exceed 5 Vietnamese words.
- Check every field for accuracy, naturalness, and internal consistency.
- Correct wrong or awkward fields even if they are already filled.
- Use the current values only as hints; if a filled field looks inaccurate or awkward, replace it with a better one.
- Use the word itself to infer the exact meaning, part of speech, pronunciation, and example.
- If you are uncertain about a field, keep it coherent and usable rather than omitting it.
- "wordtype" should be specific, such as noun, verb, adjective, adverb, phrase.
- "transcription" must match the pronunciation/pronunciation system of the word.
- If the language is Japanese, "transcription" must be written in Romaji using standard Hepburn romanization.
- If the language is Chinese, "transcription" must be standard pinyin with tone marks.
- "example" must be short, natural, and fit the word sense.
- "example_vi" must be a faithful Vietnamese translation of "example".
- Do not add explanations, markdown, or extra text.

Primary anchor: ${anchorName}
Anchor value: ${anchorValue || '(empty)'}
Language: ${langName}

Current values:
${currentValues}`;
}

function normalizeAiAuditResult(parsed, fallbackWord, fallbackWordData = {}) {
  const fallbackWordText = cleanAiText(fallbackWord);
  const pick = (...values) => values.map(cleanAiText).find(Boolean) || '';
  const result = {
    word: pick(parsed?.word, parsed?.headword, parsed?.term) || fallbackWordText,
    mean: pick(parsed?.mean, parsed?.meaning, parsed?.definition, parsed?.sense) || cleanAiText(fallbackWordData.mean),
    transcription: pick(parsed?.transcription, parsed?.phonetic, parsed?.pronunciation, parsed?.ipa) || cleanAiText(fallbackWordData.transcription),
    wordtype: pick(parsed?.wordtype, parsed?.word_type, parsed?.part_of_speech, parsed?.pos, parsed?.type) || cleanAiText(fallbackWordData.wordtype),
    example: pick(parsed?.example, parsed?.sentence, parsed?.example_sentence) || cleanAiText(fallbackWordData.example),
    example_vi: pick(parsed?.example_vi, parsed?.exampleVi, parsed?.example_vn, parsed?.translation) || cleanAiText(fallbackWordData.example_vi),
  };

  if (!result.word) return null;

  return result;
}

async function translateMeaningToVietnamese({ word, meaning, wordtype, langName }) {
  const prompt = `Translate the meaning of this ${langName} vocabulary item into concise Vietnamese.

Return ONLY a valid JSON object with exactly this key:
mean

Rules:
- "mean" must be Vietnamese, short, natural, and accurate.
- Do not include English in the returned meaning unless it is a proper noun or fixed term that must stay unchanged.
- Keep the translation aligned with the word and word type.
- No explanation, no markdown, no extra text.

Word: ${cleanAiText(word)}
Current meaning: ${cleanAiText(meaning)}
Word type: ${cleanAiText(wordtype) || '(empty)'}`;

  const resp = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You translate vocabulary meanings into natural Vietnamese. Return only JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(await buildAiError(resp));
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(extractJsonObject(text));
  const translated = limitMeaningToFiveWords(parsed?.mean);
  return translated || limitMeaningToFiveWords(meaning);
}

function buildAuditWordsPrompt(words, langName) {
  const currentValues = words
    .slice(0, 15)
    .map((word, index) => [
      `Item ${index + 1}`,
      `word: ${cleanAiText(word?.word) || '(empty)'}`,
      `mean: ${cleanAiText(word?.mean) || '(empty)'}`,
      `wordtype: ${cleanAiText(word?.wordtype) || '(empty)'}`,
      `transcription: ${cleanAiText(word?.transcription) || '(empty)'}`,
      `example: ${cleanAiText(word?.example) || '(empty)'}`,
      `example_vi: ${cleanAiText(word?.example_vi) || '(empty)'}`,
    ].join('\n'))
    .join('\n\n');

  return `Audit and correct these ${langName} vocabulary items extracted from an image.

Return ONLY one valid JSON array with at most 15 items.
Do not add markdown, code fences, explanations, or extra text.
Each item must contain exactly these keys:
word, mean, transcription, wordtype, example, example_vi

Rules:
- Use the provided word as the headword and semantic anchor.
- Keep the items in the same order as the input list.
- Correct obvious OCR mistakes when the intended word is clear.
- If a field is missing or weak, fill it with the best accurate value.
- The "mean" field must always be in Vietnamese.
- The "mean" field must be short and must not exceed 5 Vietnamese words.
- "wordtype" should be specific, such as noun, verb, adjective, adverb, phrase.
- "example" must be short, natural, and fit the word sense.
- "example_vi" must be a faithful Vietnamese translation of "example".
- If the language is Japanese, write "transcription" in Romaji using standard Hepburn romanization.
- If the language is Chinese, write "transcription" in standard pinyin with tone marks.
- If you are uncertain about a field, keep it coherent and usable rather than omitting it.

Current values:
${currentValues}`;
}

async function auditWordsWithAI(words, langName) {
  const resp = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You audit and correct vocabulary records for Vietnamese learners in ${langName}. Return only a valid JSON array.`,
        },
        { role: 'user', content: buildAuditWordsPrompt(words, langName) },
      ],
      max_tokens: 3200,
      temperature: 0,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(await buildAiError(resp));
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsedText = extractJsonArray(text);
  const parsed = JSON.parse(parsedText);
  const parsedList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed?.words)
        ? parsed.words
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [parsed];

  const normalizedWords = await Promise.all(words.map(async (sourceWord, index) => {
    const matched = parsedList[index] || parsedList.find((item) => normalizeTopicWord(item?.word) === normalizeTopicWord(sourceWord?.word));
    const normalized = normalizeAiAuditResult(matched || sourceWord, sourceWord?.word, sourceWord);

    if (!normalized) return null;

    if (isLikelyEnglishMeaning(normalized.mean)) {
      normalized.mean = await translateMeaningToVietnamese({
        word: normalized.word || sourceWord?.word,
        meaning: normalized.mean,
        wordtype: normalized.wordtype,
        langName,
      });
    }

    normalized.mean = limitMeaningToFiveWords(normalized.mean);
    return normalized;
  }));

  return normalizedWords.filter(Boolean);
}

async function buildAiError(resp) {
  let detail = '';
  try {
    const data = await resp.json();
    detail = data?.error?.message || data?.error?.details || data?.message || data?.detail || '';
  } catch {
    detail = '';
  }

  if (resp.status === 429) {
    return 'AI đang bận hoặc tạm chạm giới hạn. Vui lòng thử lại sau ít phút.';
  }
  if (resp.status === 401 || resp.status === 403) {
    return 'Cấu hình AI hiện tại không hợp lệ hoặc đã hết quyền truy cập.';
  }
  if (resp.status >= 500) {
    return 'Máy chủ AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }
  return detail || `HTTP ${resp.status}`;
}

const VOCAB_GAMES = [
  { id: 'flashcard', name: 'Flashcard', icon: '🃏', desc: 'Lật thẻ, ôn lại từ nhanh chóng', color: '#8b5cf6' },
  { id: 'quiz', name: 'Trắc nghiệm', icon: '🎯', desc: '4 đáp án, chọn nghĩa đúng', color: '#6366f1' },
  { id: 'typing', name: 'Gõ từ', icon: '⌨️', desc: 'Nhìn nghĩa, gõ lại từ vựng', color: '#f59e0b' },
  { id: 'listen', name: 'Luyện nghe', icon: '🎧', desc: 'Nghe phát âm, điền lại từ', color: '#10b981' },
  { id: 'match', name: 'Nối từ', icon: '🔗', desc: 'Ghép từ vựng với nghĩa đúng', color: '#ec4899' },
];

const VOCAB_GAMES_DISPLAY = [
  VOCAB_GAMES.find((game) => game.id === 'flashcard'),
  { ...VOCAB_GAMES.find((game) => game.id === 'quiz'), name: 'Quiz' },
  { ...VOCAB_GAMES.find((game) => game.id === 'listen'), name: 'Listening' },
  { ...VOCAB_GAMES.find((game) => game.id === 'typing'), name: 'Typing' },
  { ...VOCAB_GAMES.find((game) => game.id === 'match'), name: 'Match' },
  { id: 'flappy-bird', name: GAME_CARD.title, icon: '🐦', desc: GAME_CARD.description, color: '#0ea5e9' },
].filter(Boolean);

const IMMERSIVE_MODES = new Set(['flashcard', 'quiz', 'listen', 'typing', 'match', 'flappy-bird', 'rain-vocab']);

const FUN_GAME_CHOICES = [
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    desc: 'Chơi Flappy Bird với bộ topic hiện tại.',
    badge: 'Arcade học từ vựng',
    image: flappyLogo,
    alt: 'Flappy Bird',
    color: '#0f83c4',
  },
  {
    id: 'rain-vocab',
    title: 'Mưa từ vựng',
    desc: 'Chọn đúng từ đang rơi theo nghĩa hiển thị bên dưới.',
    badge: 'Rain game',
    image: rainLogo,
    alt: 'Mưa từ vựng',
    color: '#0ea5e9',
  },
];

function getWordKey(word) {
  return word.id ?? word.flashcardId;
}

function normalizeTopicWord(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function getCurrentStudyUserKey() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return getDashboardUserKey(storedUser);
  } catch {
    return 'guest';
  }
}

function trackStudySessionComplete(modeName) {
  if (!IMMERSIVE_MODES.has(modeName)) return;
  recordGamePlay(getCurrentStudyUserKey());
  xpStudyModeComplete(modeName);
  recordVocabularyActivity(modeName);
  const normalizedMode = modeName === 'listen' ? 'listen' : modeName;
  recordStudyModeCompletion(normalizedMode);
}

function FlappyBirdPicker({ selectedBird, onPickBird, onStart, onBack }) {
  return (
    <section className="flappy-setup-shell">
      <div className="flappy-setup-panel">
        <div className="flappy-setup-header">
          <div>
            <div className="flappy-setup-eyebrow">Bắt đầu lượt chơi</div>
            <div className="flappy-setup-title-row">
              <h2>{GAME_CARD.title}</h2>
            </div>
            <p>{GAME_CARD.description}</p>
          </div>
            <button type="button" className="btn btn-secondary btn-small" onClick={onBack}>
            Quay lại
          </button>
        </div>

        <div className="flappy-selected-topic-panel">
          <div className="flappy-selected-topic-copy">
            <span className="flappy-selected-topic-label">Chọn Bird</span>
            <strong>Chọn nhân vật bạn muốn dùng cho lượt chơi này.</strong>
            <p>Sau khi chọn chim và nhấn bắt đầu, bạn sẽ vào chơi ngay trong chủ đề hiện tại.</p>
          </div>
          <div className="flappy-bird-picker-grid">
            {BIRD_OPTIONS.map((bird) => (
              <button
                key={bird.id}
                type="button"
                className={`flappy-bird-option${selectedBird === bird.id ? ' is-active' : ''}`}
                onClick={() => onPickBird(bird.id)}
              >
                <img className="flappy-bird-option-image" src={bird.image} alt={`Bird ${bird.label}`} />
                <span>{bird.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flappy-setup-footer" style={{ paddingBottom: '36px' }}>
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Bắt đầu chơi
          </button>
        </div>
      </div>
    </section>
  );
}

export default function TopicWords() {
  const pageRef = useRef(null);
  const { courseId: rawCourseId, topicId } = useParams();
  const { user } = useAuth();
  const { remembered, toggleWord, replaceRememberedInTopic } = useCourseProgress();
  const { customCourses, loading: customCoursesLoading, ready: customCoursesReady, isTopicPreloading, addWordToTopic, updateWordInTopic, deleteWordFromTopic, addManyWordsToTopic, createTopic } = useCustomCourses();

  const [isWordModalOpen, setWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [pickerWord, setPickerWord] = useState(null);
  const [pendingDeleteWord, setPendingDeleteWord] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [isFunGameChooserOpen, setIsFunGameChooserOpen] = useState(false);
  const [selectedFunGameId, setSelectedFunGameId] = useState('flappy-bird');
  const [selectedFlappyBird, setSelectedFlappyBird] = useState(BIRD_OPTIONS[0]?.id || 'yellow');
  const [studyWordIds, setStudyWordIds] = useState(null);
  const [builtInWords, setBuiltInWords] = useState([]);
  const [builtInStatus, setBuiltInStatus] = useState('idle');
  const [_builtInError, setBuiltInError] = useState('');
  const [aiFillingWordId, setAiFillingWordId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isExcelImportModalOpen, setExcelImportModalOpen] = useState(false);
  const [isImageImportModalOpen, setImageImportModalOpen] = useState(false);
  const [isFileImportModalOpen, setFileImportModalOpen] = useState(false);
  const [isTextImportModalOpen, setTextImportModalOpen] = useState(false);

  const courseId = rawCourseId || 'custom';
  const isCustom = courseId === 'custom';
  const isAdmin = user?.role === 'admin';
  const canManageTopicWords = isCustom || (!isCustom && isAdmin);
  const useServerSrs = hasServerSrsAccess();
  const isFlappySetup = activeMode === 'flappy-bird-setup';
  const isFlappyPlaying = activeMode === 'flappy-bird' || activeMode === 'rain-vocab';
  const isFlappyLayoutActive = isFlappySetup || isFlappyPlaying;

  useEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return undefined;

    const topbarEl = document.querySelector('.topbar');
    const mobileNavEl = document.querySelector('.mobile-nav');

    const update = () => {
      const topbarHeight = topbarEl?.getBoundingClientRect().height || 0;
      const navVisible = mobileNavEl ? window.getComputedStyle(mobileNavEl).display !== 'none' : false;
      const mobileNavHeight = navVisible ? mobileNavEl?.getBoundingClientRect().height || 0 : 0;

      pageEl.style.setProperty('--games-dashboard-topbar-h', `${Math.round(topbarHeight)}px`);
      pageEl.style.setProperty('--games-mobile-nav-h', `${Math.round(mobileNavHeight)}px`);
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    if (topbarEl) resizeObserver.observe(topbarEl);
    if (mobileNavEl) resizeObserver.observe(mobileNavEl);
    window.addEventListener('resize', update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Fetch course info from API instead of static data
  const [courseInfo, setCourseInfo] = useState(null);
  const [courseLoading, setCourseLoading] = useState(!isCustom);
  useEffect(() => {
    if (isCustom) return;

    setCourseLoading(true);
    axiosClient.get(`/courses/${courseId}/topics`)
      .then((res) => {
        let data = res.data || res;
        if (data && data.data && !data.topics) data = data.data;
        setCourseInfo(data);
      })
      .catch((err) => {
        console.error("Fetch course info error:", err);
        if (isGuestReadyCourseId(courseId)) {
          setCourseInfo(getGuestReadyCourseTopics(courseId));
        } else {
          setCourseInfo(null);
        }
      })
      .finally(() => {
        setCourseLoading(false);
      });
  }, [isCustom, courseId, user]);

  const course = isCustom ? null : courseInfo;
  const topic = isCustom
    ? customCourses.find((item) => item.id === topicId)
    : (course?.topics || []).find((item) => item.slug === topicId || String(item.id) === String(topicId));

  const courseTitle = isCustom ? 'Tài liệu của bạn' : course?.courseTitle || course?.title || '';
  const topicTitle = topic?.title || '';
  const topicLang = isCustom
    ? topic?.language || topic?.lang || 'en'
    : course?.lang || 'en';
  const builtInTopicWords = !isCustom && topic ? (Array.isArray(topic.words) ? topic.words : []) : [];
  const words = isCustom
    ? topic?.words || []
    : (builtInStatus === 'success' && builtInWords.length > 0 ? builtInWords : builtInTopicWords);
  const customTopicLoading = isCustom && (
    !customCoursesReady
    || customCoursesLoading
    || (isTopicPreloading(topicId) && (!topic || !topic.words?.length))
  ) && !topic?.words?.length;

  const topicError = isCustom
    ? (customTopicLoading ? '' : (!topic ? 'Chủ đề không tồn tại.' : ''))
    : (courseLoading ? '' : (!course ? 'Topic không tồn tại.' : (!topic ? 'Chủ đề không tồn tại.' : '')));

  useEffect(() => {
    if (isCustom) {
      setBuiltInWords([]);
      setBuiltInStatus('idle');
      setBuiltInError('');
      return undefined;
    }

    if (!topic) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadFlashcards() {
      setBuiltInStatus('loading');
      setBuiltInError('');

      try {
        const fetchId = topic?.slug || topicId;
        const res = await axiosClient.get(`/topics/${encodeURIComponent(fetchId)}/flashcards`);
        const data = res?.data || res;

        setBuiltInWords(Array.isArray(data) ? data : []);
        setBuiltInStatus('success');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setBuiltInWords([]);
        setBuiltInStatus('error');
        setBuiltInError(error.message || 'Không thể tải dữ liệu.');
      }
    }

    loadFlashcards();
    return () => controller.abort();
  }, [isCustom, topicId, topic, user, courseId]);

  const backUrl = isCustom ? '/dashboard/courses?tab=custom' : `/dashboard/courses/${courseId}`;

  if (courseLoading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--gray-light, #64748b)' }}>
        Đang tải thông tin...
      </div>
    );
  }

  if (customTopicLoading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--gray-light, #64748b)' }}>
        Đang tải chủ đề cá nhân...
      </div>
    );
  }

  if (topicError) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
        {topicError}
      </div>
    );
  }

  const speakWord = (text, language) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(language, topicLang);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

const activeWords = !studyWordIds
      ? words
      : words.filter((word) => studyWordIds.includes(getWordKey(word)));

  const syncServerReviews = async (items) => {
    if (!useServerSrs || items.length === 0) return;
    try {
      await submitSrsReviewBatch(items);
    } catch (error) {
      console.error('Failed to sync review batch to server.', error);
    }
  };

  const getEditableFlashcardId = (word) => word?.flashcardId || word?.flashcard_id || word?.dbId || word?.id;

  const mapAdminFlashcardToTopicWord = (flashcard, fallbackWord = {}) => ({
    ...fallbackWord,
    flashcardId: flashcard.id,
    id: fallbackWord.id || String(flashcard.id),
    word: flashcard.word || '',
    transcription: flashcard.transcription || '',
    mean: flashcard.meaning || '',
    wordtype: flashcard.wordType || '',
    example: flashcard.example || '',
    example_vi: flashcard.exampleVi || '',
    language: flashcard.language || fallbackWord.language || topicLang,
  });

  const buildAdminFlashcardPayload = (wordData) => ({
    word: cleanAiText(wordData?.word),
    transcription: cleanAiText(wordData?.transcription),
    meaning: cleanAiText(wordData?.mean ?? wordData?.meaning),
    wordType: cleanAiText(wordData?.wordtype ?? wordData?.wordType),
    example: cleanAiText(wordData?.example),
    exampleVi: cleanAiText(wordData?.example_vi ?? wordData?.exampleVi),
    language: cleanAiText(wordData?.language) || topicLang,
  });

  const updateBuiltInWordState = (sourceWord, nextWord) => {
    const sourceKey = getWordKey(sourceWord);
    setBuiltInWords((currentWords) => currentWords.map((item) => (
      getWordKey(item) === sourceKey ? nextWord : item
    )));

    setSelectedWord((currentWord) => (
      currentWord && getWordKey(currentWord) === sourceKey ? nextWord : currentWord
    ));
  };

  const handleSaveWord = async (wordData) => {
    const normalizedWordData = { ...wordData, language: topicLang };
    if (isCustom) {
      const result = editingWord
        ? await updateWordInTopic(topicId, editingWord.id, normalizedWordData)
        : await addWordToTopic(topicId, normalizedWordData);

      if (result?.error) {
        throw new Error(result.error);
      }
      return;
    }

    if (!isAdmin || !editingWord) {
      setToastMessage('Chi admin moi co quyen cap nhat tu vung cua khoa hoc he thong.');
      return;
    }

    const flashcardId = getEditableFlashcardId(editingWord);
    if (!flashcardId) {
      setToastMessage('Tu vung nay chua co ID trong database de cap nhat.');
      return;
    }

    try {
      const savedFlashcard = await axiosClient.put(`/admin/flashcards/${flashcardId}`, buildAdminFlashcardPayload(normalizedWordData));
      const nextWord = mapAdminFlashcardToTopicWord(savedFlashcard, editingWord);
      updateBuiltInWordState(editingWord, nextWord);
      setEditingWord(nextWord);
      setToastMessage('Da cap nhat tu vung trong database.');
    } catch (error) {
      setToastMessage(error?.response?.data?.message || error?.message || 'Khong the cap nhat tu vung trong database.');
      throw error;
    }
  };

  const handleSaveAIWords = (selectedWords) => {
    const existingWordSet = new Set(words.map((word) => normalizeTopicWord(word?.word)).filter(Boolean));
    const dedupedWords = selectedWords.filter((word) => {
      const normalizedWord = normalizeTopicWord(word?.word);
      if (!normalizedWord || existingWordSet.has(normalizedWord)) return false;
      existingWordSet.add(normalizedWord);
      return true;
    });

    if (dedupedWords.length === 0) {
      setToastMessage('Không có từ mới hợp lệ để thêm vào chủ đề này.');
      return;
    }

    addManyWordsToTopic(topicId, dedupedWords);
  };

  const handleImportImageWords = async (selectedWords) => {
    const existingWordSet = new Set(words.map((word) => normalizeTopicWord(word?.word)).filter(Boolean));
    const seenImportSet = new Set();
    const importQueue = [];
    let skippedCount = 0;

    selectedWords.forEach((item) => {
      const normalizedWord = normalizeTopicWord(item?.word);
      if (!normalizedWord) {
        skippedCount += 1;
        return;
      }

      if (existingWordSet.has(normalizedWord) || seenImportSet.has(normalizedWord)) {
        skippedCount += 1;
        return;
      }

      seenImportSet.add(normalizedWord);
      importQueue.push({
        word: String(item.word).trim(),
        mean: String(item.mean ?? '').trim(),
        transcription: String(item.transcription ?? '').trim(),
        wordtype: String(item.wordtype ?? '').trim(),
        example: String(item.example ?? '').trim(),
        example_vi: String(item.example_vi ?? '').trim(),
        language: topicLang,
      });
    });

    if (importQueue.length === 0) {
      return {
        error: 'Không có từ hợp lệ để thêm từ hình ảnh.',
      };
    }

    setToastMessage('AI đang bổ sung dữ liệu cho các từ đã chọn...');

    try {
      const aiMeta = AI_LANGUAGE_META[topicLang] || AI_LANGUAGE_META.en;
      const auditedWords = await auditWordsWithAI(importQueue, aiMeta.name);
      const finalQueue = importQueue.map((baseItem, index) => {
        const auditedItem = auditedWords[index] || auditedWords.find((item) => normalizeTopicWord(item?.word) === normalizeTopicWord(baseItem.word));
        return {
          ...baseItem,
          ...(auditedItem || {}),
          mean: limitMeaningToFiveWords((auditedItem && auditedItem.mean) || baseItem.mean),
          language: topicLang,
        };
      });

      const result = await addManyWordsToTopic(topicId, finalQueue);
      const addedCount = Number.isFinite(result?.added) ? result.added : finalQueue.length;
      const totalSkipped = skippedCount + (Number.isFinite(result?.skipped) ? result.skipped : 0);

      setToastMessage(
        `Đã thêm ${addedCount} từ từ hình ảnh${totalSkipped > 0 ? `, bỏ qua ${totalSkipped} từ trùng hoặc không hợp lệ` : ''}.`
      );

      return { added: addedCount, skipped: totalSkipped };
    } catch (error) {
      const message = error?.message || 'Không thể xử lý ảnh lúc này.';
      setToastMessage(message);
      return { error: message };
    }
  };

  const handleImportTextWords = async (selectedWords) => {
    const existingWordSet = new Set(words.map((word) => normalizeTopicWord(word?.word)).filter(Boolean));
    const seenImportSet = new Set();
    const importQueue = [];
    let skippedCount = 0;

    selectedWords.forEach((item) => {
      const normalizedWord = normalizeTopicWord(item?.word);
      if (!normalizedWord) {
        skippedCount += 1;
        return;
      }

      if (existingWordSet.has(normalizedWord) || seenImportSet.has(normalizedWord)) {
        skippedCount += 1;
        return;
      }

      seenImportSet.add(normalizedWord);
      importQueue.push({
        word: String(item.word).trim(),
        mean: String(item.mean ?? '').trim(),
        transcription: String(item.transcription ?? '').trim(),
        wordtype: String(item.wordtype ?? '').trim(),
        example: String(item.example ?? '').trim(),
        example_vi: String(item.example_vi ?? '').trim(),
        language: topicLang,
      });
    });

    if (importQueue.length === 0) {
      return {
        error: 'Không có từ hợp lệ để thêm từ đoạn text.',
      };
    }

    setToastMessage('AI đang bổ sung dữ liệu cho các từ đã chọn...');

    try {
      const aiMeta = AI_LANGUAGE_META[topicLang] || AI_LANGUAGE_META.en;
      const auditedWords = await auditWordsWithAI(importQueue, aiMeta.name);
      const finalQueue = importQueue.map((baseItem, index) => {
        const auditedItem = auditedWords[index] || auditedWords.find((item) => normalizeTopicWord(item?.word) === normalizeTopicWord(baseItem.word));
        return {
          ...baseItem,
          ...(auditedItem || {}),
          mean: limitMeaningToFiveWords((auditedItem && auditedItem.mean) || baseItem.mean),
          language: topicLang,
        };
      });

      const result = await addManyWordsToTopic(topicId, finalQueue);
      const addedCount = Number.isFinite(result?.added) ? result.added : finalQueue.length;
      const totalSkipped = skippedCount + (Number.isFinite(result?.skipped) ? result.skipped : 0);

      setToastMessage(
        `Đã thêm ${addedCount} từ từ đoạn text${totalSkipped > 0 ? `, bỏ qua ${totalSkipped} từ trùng hoặc không hợp lệ` : ''}.`
      );

      return { added: addedCount, skipped: totalSkipped };
    } catch (error) {
      const message = error?.message || 'Không thể xử lý đoạn text lúc này.';
      setToastMessage(message);
      return { error: message };
    }
  };

  const handleImportFileWords = async (selectedWords) => {
    const existingWordSet = new Set(words.map((word) => normalizeTopicWord(word?.word)).filter(Boolean));
    const seenImportSet = new Set();
    const importQueue = [];
    let skippedCount = 0;

    selectedWords.forEach((item) => {
      const normalizedWord = normalizeTopicWord(item?.word);
      if (!normalizedWord) {
        skippedCount += 1;
        return;
      }

      if (existingWordSet.has(normalizedWord) || seenImportSet.has(normalizedWord)) {
        skippedCount += 1;
        return;
      }

      seenImportSet.add(normalizedWord);
      importQueue.push({
        word: String(item.word).trim(),
        mean: String(item.mean ?? '').trim(),
        transcription: String(item.transcription ?? '').trim(),
        wordtype: String(item.wordtype ?? '').trim(),
        example: String(item.example ?? '').trim(),
        example_vi: String(item.example_vi ?? '').trim(),
        language: topicLang,
      });
    });

    if (importQueue.length === 0) {
      return {
        error: 'Không có từ hợp lệ để thêm từ file PDF/Word.',
      };
    }

    setToastMessage('AI đang bổ sung dữ liệu cho các từ đã chọn...');

    try {
      const aiMeta = AI_LANGUAGE_META[topicLang] || AI_LANGUAGE_META.en;
      const auditedWords = await auditWordsWithAI(importQueue, aiMeta.name);
      const finalQueue = importQueue.map((baseItem, index) => {
        const auditedItem = auditedWords[index] || auditedWords.find((item) => normalizeTopicWord(item?.word) === normalizeTopicWord(baseItem.word));
        return {
          ...baseItem,
          ...(auditedItem || {}),
          mean: limitMeaningToFiveWords((auditedItem && auditedItem.mean) || baseItem.mean),
          language: topicLang,
        };
      });

      const result = await addManyWordsToTopic(topicId, finalQueue);
      const addedCount = Number.isFinite(result?.added) ? result.added : finalQueue.length;
      const totalSkipped = skippedCount + (Number.isFinite(result?.skipped) ? result.skipped : 0);

      setToastMessage(
        `Đã thêm ${addedCount} từ từ file PDF/Word${totalSkipped > 0 ? `, bỏ qua ${totalSkipped} từ trùng hoặc không hợp lệ` : ''}.`
      );

      return { added: addedCount, skipped: totalSkipped };
    } catch (error) {
      const message = error?.message || 'Không thể xử lý file lúc này.';
      setToastMessage(message);
      return { error: message };
    }
  };

  const handleImportExcelWords = async (rows) => {
    const existingWordSet = new Set(
      words
        .map((word) => normalizeTopicWord(word?.word))
        .filter(Boolean)
    );

    const seenImportSet = new Set();
    const importQueue = [];
    let skippedCount = 0;

    rows.forEach((row) => {
      const normalizedWord = normalizeTopicWord(row?.word);
      const normalizedMean = String(row?.mean ?? '').trim();

      if (!normalizedWord || !normalizedMean) {
        skippedCount += 1;
        return;
      }

      if (existingWordSet.has(normalizedWord) || seenImportSet.has(normalizedWord)) {
        skippedCount += 1;
        return;
      }

      seenImportSet.add(normalizedWord);
      importQueue.push({
        word: String(row.word).trim(),
        mean: normalizedMean,
        transcription: String(row.transcription ?? '').trim(),
        wordtype: String(row.wordtype ?? '').trim(),
        example: String(row.example ?? '').trim(),
        example_vi: String(row.example_vi ?? '').trim(),
        language: topicLang,
      });
    });

    if (importQueue.length === 0) {
      return {
        error: 'Không có từ nào hợp lệ để import từ file Excel.',
      };
    }

    const result = await addManyWordsToTopic(topicId, importQueue);
    const addedCount = Number.isFinite(result?.added) ? result.added : importQueue.length;
    const totalSkipped = skippedCount + (Number.isFinite(result?.skipped) ? result.skipped : 0);

    setToastMessage(
      `Đã import ${addedCount} từ từ file Excel${totalSkipped > 0 ? `, bỏ qua ${totalSkipped} dòng trùng hoặc không hợp lệ` : ''}.`
    );

    return { added: addedCount, skipped: totalSkipped };
  };

  const handleDeleteWord = async (wordOrId) => {
    if (isCustom) {
      deleteWordFromTopic(topicId, typeof wordOrId === 'object' ? wordOrId?.id : wordOrId);
      setPendingDeleteWord(null);
      return;
    }

    if (!isAdmin || !wordOrId) {
      setPendingDeleteWord(null);
      return;
    }

    const targetWord = typeof wordOrId === 'object' ? wordOrId : pendingDeleteWord;
    const flashcardId = getEditableFlashcardId(targetWord);
    if (!flashcardId) {
      setToastMessage('Tu vung nay chua co ID trong database de xoa.');
      setPendingDeleteWord(null);
      return;
    }

    try {
      await axiosClient.delete(`/admin/flashcards/${flashcardId}`);
      const targetKey = getWordKey(targetWord);
      setBuiltInWords((currentWords) => currentWords.filter((item) => getWordKey(item) !== targetKey));
      setSelectedWord((currentWord) => (
        currentWord && getWordKey(currentWord) === targetKey ? null : currentWord
      ));
      setDetailOpen(false);
      setToastMessage('Da xoa tu vung khoi database.');
    } catch (error) {
      setToastMessage(error?.response?.data?.message || error?.message || 'Khong the xoa tu vung trong database.');
    }
    setPendingDeleteWord(null);
  };

  const handleFillMissingWordData = async (word) => {
    if (!canManageTopicWords || !word) return;

    const wordId = getWordKey(word);
    if (aiFillingWordId === wordId) return;

    const baseWord = cleanAiText(word.word);
    if (!baseWord) {
      setToastMessage('Cần có từ vựng trước khi dùng AI kiểm tra dữ liệu.');
      return;
    }

    const aiMeta = AI_LANGUAGE_META[topicLang] || AI_LANGUAGE_META.en;
    setAiFillingWordId(wordId);

    try {
      const resp = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: aiMeta.systemPrompt },
            { role: 'user', content: buildAuditWordPrompt(word, aiMeta.name) },
          ],
          max_tokens: 1000,
          temperature: 0,
          stream: false,
        }),
      });

      if (!resp.ok) {
        throw new Error(await buildAiError(resp));
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(extractJsonObject(text));

      const normalized = normalizeAiAuditResult(parsed, baseWord, word);
      if (!normalized) {
        throw new Error('AI chưa trả về dữ liệu đủ hợp lệ để kiểm tra và sửa từ này. Vui lòng thử lại.');
      }

      if (isLikelyEnglishMeaning(normalized.mean)) {
        normalized.mean = await translateMeaningToVietnamese({
          word: normalized.word || baseWord,
          meaning: normalized.mean,
          wordtype: normalized.wordtype,
          langName: aiMeta.name,
        });
      }

      normalized.mean = limitMeaningToFiveWords(normalized.mean);

      if (isCustom) {
        await updateWordInTopic(topicId, word.id, normalized);
      } else {
        const flashcardId = getEditableFlashcardId(word);
        if (!flashcardId) {
          throw new Error('Tu vung nay chua co ID trong database de AI cap nhat.');
        }
        const savedFlashcard = await axiosClient.put(`/admin/flashcards/${flashcardId}`, buildAdminFlashcardPayload({
          ...normalized,
          language: word.language || topicLang,
        }));
        updateBuiltInWordState(word, mapAdminFlashcardToTopicWord(savedFlashcard, word));
      }
      setToastMessage('AI đã kiểm tra và sửa dữ liệu cho từ vựng.');
    } catch (error) {
      setToastMessage(error?.message || 'Không thể dùng AI để kiểm tra dữ liệu lúc này.');
    } finally {
      setAiFillingWordId(null);
    }
  };

  const openWordModal = (wordObj = null) => {
    setEditingWord(wordObj);
    setWordModalOpen(true);
  };

  const saveRememberedWords = (selectedWordIds, targetWords = activeWords) => {
    replaceRememberedInTopic(targetWords.map((word) => getWordKey(word)), selectedWordIds);
  };

  const handleToggleWord = (wordId) => {
    const word = words.find((item) => getWordKey(item) === wordId);
    const wasRemembered = !!remembered[wordId];
    toggleWord(wordId);

    if (!wasRemembered && word) {
      if (useServerSrs && hasServerFlashcardId(word)) {
        void syncServerReviews([
          { flashcard_id: word.flashcardId, quality: mapReviewRatingToQualityScore('good') },
        ]);
      } else {
        addToSrs(word, topicId, courseId);
      }
      return;
    }

    if (!useServerSrs || !hasServerFlashcardId(word)) {
      removeFromSrs(wordId);
    }
  };

  const enqueueWordsForImmediateSrs = async (targetWords) => {
    const serverFlashcardIds = [];

    targetWords.forEach((word) => {
      if (useServerSrs && hasServerFlashcardId(word)) {
        serverFlashcardIds.push(word.flashcardId);
        return;
      }

      enqueueToSrsNow(word, topicId, courseId);
    });

    if (serverFlashcardIds.length > 0) {
      try {
        await enqueueImmediateReviews(serverFlashcardIds);
      } catch (error) {
        console.error('Failed to enqueue immediate SRS reviews.', error);
      }
    }
  };

  const handleSaveStudyCompletion = async (selectedWordIds, targetWords = activeWords) => {
    const selectedSet = new Set(selectedWordIds);
    const wordsToReview = targetWords.filter((word) => !selectedSet.has(getWordKey(word)));

    replaceRememberedInTopic(targetWords.map((word) => getWordKey(word)), selectedWordIds);
    await enqueueWordsForImmediateSrs(wordsToReview);
  };

  const handleSaveFlashcard = async (selectedWordIds) => {
    const prevSet = new Set(activeWords.filter((word) => remembered[getWordKey(word)]).map((word) => getWordKey(word)));
    const newSet = new Set(selectedWordIds);
    const immediateServerFlashcardIds = [];

    activeWords.forEach((word) => {
      const key = getWordKey(word);
      const isNowRemembered = newSet.has(key);
      const wasRemembered = prevSet.has(key);

      if (useServerSrs && hasServerFlashcardId(word)) {
        if (isNowRemembered && !wasRemembered) {
          immediateServerFlashcardIds.push(word.flashcardId);
          enqueueToSrsNow({ ...word, id: word.flashcardId, wordId: word.flashcardId }, topicId, courseId);
        }
        if (!isNowRemembered && wasRemembered) {
          removeFromSrs(word.flashcardId ?? key);
        }
        return;
      }

      if (isNowRemembered && !wasRemembered) enqueueToSrsNow(word, topicId, courseId);
      if (!isNowRemembered && wasRemembered) removeFromSrs(key);
    });

    if (immediateServerFlashcardIds.length > 0) {
      await enqueueImmediateReviews(immediateServerFlashcardIds);
    }
    saveRememberedWords(selectedWordIds);
    recordFlashcardSessionProgress();
  };

  const handleQuizComplete = async (correctWordIds, wrongWordIds) => {
    const correctSet = new Set(correctWordIds);
    const wrongSet = new Set(wrongWordIds);
    const serverBatch = [];

    activeWords.forEach((word) => {
      const key = getWordKey(word);

      if (useServerSrs && hasServerFlashcardId(word)) {
        if (correctSet.has(key)) {
          serverBatch.push({ flashcard_id: word.flashcardId, quality: mapReviewRatingToQualityScore('good') });
        } else if (wrongSet.has(key)) {
          serverBatch.push({ flashcard_id: word.flashcardId, quality: mapReviewRatingToQualityScore('forgot') });
        }
        return;
      }

      if (correctSet.has(key)) {
        addToSrs(word, topicId, courseId);
        reviewItem(key, 'good');
      } else if (wrongSet.has(key)) {
        addToSrs(word, topicId, courseId);
        reviewItem(key, 'forgot');
      }
    });

    await syncServerReviews(serverBatch);
    saveRememberedWords(correctWordIds);
  };

  const handleModeClick = (modeName) => {
    if (!isCustom && builtInStatus === 'loading' && !words.length) return;
    if (!words.length) return;

    setStudyWordIds(null);
    if (modeName === 'flappy-bird') {
      setSelectedFunGameId('flappy-bird');
      setIsFunGameChooserOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (modeName === 'rain-vocab') {
      setActiveMode('rain-vocab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (IMMERSIVE_MODES.has(modeName)) {
      setActiveMode(modeName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (activeMode === modeName) setActiveMode(null);
    else setActiveMode(modeName);
  };

  const handleCloseFunGameChooser = () => {
    setIsFunGameChooserOpen(false);
  };

  const handleStartFunGame = () => {
    const selectedGame = FUN_GAME_CHOICES.find((game) => game.id === selectedFunGameId) || FUN_GAME_CHOICES[0];
    setIsFunGameChooserOpen(false);

    if (selectedGame?.id === 'rain-vocab') {
      setActiveMode('rain-vocab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveMode('flappy-bird-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initialLearnedWordIds = activeWords
    .filter((word) => remembered[getWordKey(word)])
    .map((word) => getWordKey(word));

  const studyModeProps = {
    topicLang,
    words: activeWords,
    allTopicWords: words,
    initialLearnedWordIds,
    onSessionComplete: () => trackStudySessionComplete(activeMode),
    onExit: () => {
      setActiveMode(null);
      setStudyWordIds(null);
    },
    onBackToTopic: () => {
      setActiveMode(null);
      setStudyWordIds(null);
    },
  };

  const flappyTopic = {
    id: topic?.id || topicId,
    title: topicTitle,
    source: courseTitle,
    lang: topicLang,
    words,
  };

  const handleStudyWrongWords = (wrongWordIds) => {
    setStudyWordIds(wrongWordIds);
    setActiveMode('flashcard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let modeView = null;
  if (activeMode === 'flashcard') {
    modeView = (
      <Flashcard
        {...studyModeProps}
        onSaveLearnedWords={handleSaveFlashcard}
        onStartQuiz={() => {
          setActiveMode('quiz');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  } else if (activeMode === 'quiz') {
    modeView = <Quiz {...studyModeProps} onSaveLearnedWords={handleQuizComplete} onStudyWrongWords={handleStudyWrongWords} />;
  } else if (activeMode === 'listen') {
    modeView = <Listening {...studyModeProps} onSaveLearnedWords={handleSaveStudyCompletion} />;
  } else if (activeMode === 'typing') {
    modeView = <Typing {...studyModeProps} onSaveLearnedWords={handleSaveStudyCompletion} />;
  } else if (activeMode === 'match') {
    modeView = <Match {...studyModeProps} onSaveLearnedWords={handleSaveStudyCompletion} />;
  } else if (activeMode === 'flappy-bird-setup') {
    modeView = (
      <FlappyBirdPicker
        selectedBird={selectedFlappyBird}
        onPickBird={setSelectedFlappyBird}
        onStart={() => {
          setActiveMode('flappy-bird');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onBack={() => {
          setActiveMode(null);
          setStudyWordIds(null);
        }}
      />
    );
  } else if (activeMode === 'flappy-bird') {
    modeView = (
      <FlappyBirdExperience
        topic={flappyTopic}
        selectedBird={selectedFlappyBird}
        onSessionComplete={() => trackStudySessionComplete('flappy-bird')}
        onBackToPicker={() => setActiveMode('flappy-bird-setup')}
        onBackGallery={() => {
          setActiveMode(null);
          setStudyWordIds(null);
        }}
      />
    );
  } else if (activeMode === 'rain-vocab') {
    modeView = (
      <VocabularyRainExperience
        {...studyModeProps}
      />
    );
  }

  if (isFlappyLayoutActive && modeView) {
    return (
      <main
        ref={pageRef}
        className={`dash-main games-page${isFlappyPlaying ? ' is-game-active' : ''}`}
        id="page-games"
      >
        {modeView}
      </main>
    );
  }

  return (
      <main
        ref={pageRef}
        className={`dash-main cv-subview${isCustom ? ' cv-custom-mode' : ''}${canManageTopicWords ? ' cv-manage-words-mode' : ''}`}
        id="cv-words-view"
      >
      <ToastNotice message={toastMessage} onHide={() => setToastMessage('')} />
      <div className="cv-subview-header">
        <Link className="cv-breadcrumb-btn" to={backUrl}>
          {SVG_ICONS.BACK}
          <span id="cv-back-course-label">{courseTitle}</span>
        </Link>
        <span className="cv-breadcrumb-sep">&gt;</span>
        <span className="cv-breadcrumb-current" id="cv-topic-title">{topicTitle}</span>
      </div>

      {isCustom && !IMMERSIVE_MODES.has(activeMode) && activeMode !== 'flappy-bird-setup' ? (
        <div id="cv-custom-toolbar" className="cv-custom-toolbar">
          <button className="btn btn-primary btn-small" id="cv-add-word-btn" onClick={() => openWordModal(null)}>
            Thêm từ vựng thủ công
          </button>
          <button className="cv-btn-import-excel" id="cv-import-excel-btn" onClick={() => setExcelImportModalOpen(true)}>
            Import từ file Excel
          </button>
          <button className="cv-btn-import-image" id="cv-import-image-btn" onClick={() => setImageImportModalOpen(true)}>
            Thêm từ hình ảnh
          </button>
          <button className="cv-btn-import-file" id="cv-import-file-btn" onClick={() => setFileImportModalOpen(true)}>
            Thêm từ file PDF/Word
          </button>
          <button className="cv-btn-import-text" id="cv-import-text-btn" onClick={() => setTextImportModalOpen(true)}>
            Thêm từ văn bản
          </button>
          <button className="cv-btn-ai" id="cv-ai-gen-btn" onClick={() => setAIModalOpen(true)}>
            AI tạo từ hàng loạt
          </button>
        </div>
      ) : null}

      {modeView ? (
        modeView
      ) : (
        <>
          <section className="cv-modes-section">
            <div className="cv-modes-header">
              <h3 className="cv-section-title">Chọn cách học</h3>
            </div>
            <div className="games-vocab-grid" id="games-vocab-grid" style={{ marginTop: '16px', marginBottom: '24px' }}>
              {VOCAB_GAMES_DISPLAY.map((game) => (
                <button
                  key={game.id}
                  className={`games-vocab-card${game.id === 'flappy-bird' ? ' games-vocab-card-image-only games-fun-launcher' : ''}${activeMode === game.id || (game.id === 'flappy-bird' && (activeMode === 'flappy-bird' || activeMode === 'flappy-bird-setup')) ? ' active' : ''}`}
                  id={`game-card-${game.id}`}
                  onClick={() => handleModeClick(game.id)}
                  style={{ '--game-color': game.color }}
                >
                  {game.id === 'flappy-bird' ? (
                    <>
                      <img className="games-vocab-card-banner" src={flappyLogo} alt={game.name} />
                      <span className="games-fun-launcher-overlay">
                        <span className="games-fun-launcher-badge">Chọn trò chơi</span>
                        <strong>Games</strong>
                        <span>Mở menu để chọn một trò để chơi</span>
                      </span>
                    </>
                  ) : (
                    <span className="games-vocab-icon">{game.icon}</span>
                  )}
                  {game.id !== 'flappy-bird' ? <span className="games-vocab-name">{game.name}</span> : null}
                  {game.id !== 'flappy-bird' ? <span className="games-vocab-desc">{game.desc}</span> : null}
                  <span className="games-vocab-play">Chơi ngay →</span>
                </button>
              ))}
            </div>
          </section>

          {isFunGameChooserOpen ? (
            <div className="cv-modal-overlay cv-modal-active games-fun-picker-overlay" onClick={handleCloseFunGameChooser}>
              <div className="cv-modal-box games-fun-picker-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header games-fun-picker-header">
                  <div>
                    <span className="games-fun-picker-eyebrow">Game ôn từ</span>
                    <h3>Chọn trò chơi bạn muốn bắt đầu</h3>
                  </div>
                  <button type="button" className="cv-modal-close" onClick={handleCloseFunGameChooser} aria-label="Đóng">
                    ×
                  </button>
                </div>

                <div className="cv-modal-body games-fun-picker-body">
                  <div className="games-fun-choice-grid">
                    {FUN_GAME_CHOICES.map((game) => {
                      const isSelected = selectedFunGameId === game.id;

                      return (
                        <button
                          key={game.id}
                          type="button"
                          className={`games-fun-choice${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedFunGameId(game.id)}
                          style={{ '--fun-game-color': game.color }}
                        >
                          <img className="games-fun-choice-image" src={game.image} alt={game.alt} />
                          <span className="games-fun-choice-copy">
                            <span className="games-fun-choice-badge">{game.badge}</span>
                            <strong>{game.title}</strong>
                            <span>{game.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cv-modal-footer games-fun-picker-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseFunGameChooser}>
                    Hủy
                  </button>
                  <button type="button" className="btn btn-primary games-fun-picker-start" onClick={handleStartFunGame}>
                    Bắt đầu chơi
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="cv-stats-bar">
            <h3 className="cv-section-title cv-stats-title" id="cv-vocab-title">Danh sách từ vựng</h3>
            <span className="cv-stat">
              <span className="cv-stat-dot dot-total"></span>
              Tổng: <strong id="cv-total">{words.length}</strong> từ
            </span>
          </div>

          <section className="cv-vocab-section">
            {!isCustom && builtInStatus === 'loading' ? (
              <div style={{ padding: '18px 0', color: 'var(--gray-text)' }}>
                Đang tải dữ liệu từ vựng...
              </div>
            ) : null}

            <div className="cv-word-table">
              <div className="cv-word-table-head">
                <span>Từ vựng</span>
                <span>Phiên âm</span>
                <span>Nghĩa</span>
                <span>Loại từ</span>
                <span>Ví dụ</span>
                <span className="cv-col-actions">Hành động</span>
              </div>

              <div id="cv-word-rows">
                {words.map((word) => {
                  const wordKey = getWordKey(word);
                  const isDone = !!remembered[wordKey];

                  return (
                    <div
                      key={wordKey}
                      className={`cv-word-row${isDone ? ' cv-word-remembered' : ''}`}
                      id={`cv-row-${wordKey}`}
                      onClick={(event) => {
                        if (event.target.closest('button, label, input, a')) return;
                        setSelectedWord(word);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="cv-cell cv-cell-word">
                        <div className="cv-word-main">
                          <strong className="cv-word-text">{word.word}</strong>
                          <span className="cv-row-chevron" aria-hidden="true">{SVG_ICONS.CHEVRON}</span>
                        </div>
                        <div className="cv-mobile-sub">
                          <button
                            className="cv-voice-btn"
                            title="Nghe phát âm"
                            onClick={(event) => {
                              event.stopPropagation();
                              speakWord(word.word, word.language || topicLang);
                            }}
                          >
                            {SVG_ICONS.VOICE}
                          </button>
                          <span className="cv-trans">{word.transcription || ''}</span>
                        </div>
                      </div>

                      <div className="cv-cell cv-cell-trans cv-cell-trans-desktop">
                        <span className="cv-trans">{word.transcription || ''}</span>
                        <button
                          className="cv-voice-btn cv-voice-desktop"
                          title="Nghe phát âm"
                          onClick={(event) => {
                            event.stopPropagation();
                            speakWord(word.word, word.language || topicLang);
                          }}
                        >
                          {SVG_ICONS.VOICE}
                        </button>
                      </div>

                      <div className="cv-cell cv-cell-mean">
                        <span className="cv-mean">{word.mean || ''}</span>
                      </div>

                      <div className="cv-cell cv-cell-type">
                        <span className="cv-type-badge">{word.wordtype || ''}</span>
                      </div>

                      <div className="cv-cell cv-cell-example">
                        <span className="cv-example">{word.example || ''}</span>
                      </div>

                      <div className="cv-cell cv-cell-actions">
                        {canManageTopicWords ? (
                          <>
                            <label className="cv-switch cv-actions-switch" title={isDone ? 'Đã thuộc' : 'Chưa thuộc'}>
                              <input
                                type="checkbox"
                                className="cv-switch-chk cv-switch-chk-extra"
                                checked={isDone}
                                onChange={() => handleToggleWord(wordKey)}
                              />
                              <span className="cv-switch-track"><span className="cv-switch-thumb"></span></span>
                            </label>
                            <button className="cv-action-btn cv-action-edit" title="Sửa từ" onClick={(event) => { event.stopPropagation(); openWordModal(word); }}>
                              {SVG_ICONS.EDIT}
                            </button>
                            <button
                              className={`cv-action-btn cv-action-ai${aiFillingWordId === wordKey ? ' is-loading' : ''}`}
                              title={aiFillingWordId === wordKey ? 'AI đang kiểm tra dữ liệu' : 'AI kiểm tra và sửa dữ liệu'}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleFillMissingWordData(word);
                              }}
                              disabled={aiFillingWordId === wordKey}
                            >
                              {SVG_ICONS.AI}
                            </button>
                            <button
                              className="cv-action-btn cv-action-delete"
                              title="Xóa từ"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPendingDeleteWord(word);
                              }}
                            >
                              {SVG_ICONS.DELETE}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div id="cv-empty-words" className={`cv-words-empty${words.length > 0 ? ' cv-hidden' : ''}`}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>EMPTY</div>
                <p>Chưa có từ vựng nào.<br />Hãy thêm từ thủ công hoặc dùng AI tạo từ hàng loạt.</p>
              </div>
            </div>
          </section>
        </>
      )}

      <WordModal
        key={`${editingWord?.id || 'new'}-${isWordModalOpen ? 'open' : 'closed'}`}
        isOpen={isWordModalOpen}
        onClose={() => setWordModalOpen(false)}
        onSave={handleSaveWord}
        existingWord={editingWord}
      />

      <AIGenModal
        isOpen={isAIModalOpen}
        onClose={() => setAIModalOpen(false)}
        onSave={handleSaveAIWords}
        topicLang={topicLang}
        existingWords={words}
      />

      <CustomTopicExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setExcelImportModalOpen(false)}
        onImport={handleImportExcelWords}
      />

      <CustomTopicImageImportModal
        isOpen={isImageImportModalOpen}
        onClose={() => setImageImportModalOpen(false)}
        onImport={handleImportImageWords}
        topicLang={topicLang}
        existingWords={words}
      />

      <CustomTopicFileImportModal
        isOpen={isFileImportModalOpen}
        onClose={() => setFileImportModalOpen(false)}
        onImport={handleImportFileWords}
        topicLang={topicLang}
        existingWords={words}
      />

      <CustomTopicTextImportModal
        isOpen={isTextImportModalOpen}
        onClose={() => setTextImportModalOpen(false)}
        onImport={handleImportTextWords}
        topicLang={topicLang}
        existingWords={words}
      />

      <WordDetailOverlay
        isOpen={isDetailOpen}
        onClose={() => setDetailOpen(false)}
        word={selectedWord}
        topicLang={topicLang}
        showAddBtn={!isCustom}
        onAdd={(word) => {
          setDetailOpen(false);
          setPickerWord(word);
        }}
        onAskAI={(word) => {
          setDetailOpen(false);
          const parts = [];
          parts.push(`Hãy giải thích chi tiết cho tôi về từ "${word.word}"`);
          if (word.transcription) parts.push(`(phiên âm: ${word.transcription})`);
          if (word.mean) parts.push(`- nghĩa: "${word.mean}"`);
          if (word.wordtype) parts.push(`- loại từ: ${word.wordtype}`);
          if (word.example) parts.push(`- ví dụ: "${word.example}"`);
          parts.push('. Bao gồm: cách dùng chi tiết, các nghĩa khác nếu có, thêm ví dụ thực tế, từ đồng nghĩa/trái nghĩa, và mẹo ghi nhớ.');
          window.dispatchEvent(new CustomEvent('pkaAskAI', { detail: { message: parts.join(' ') } }));
        }}
      />

      {pickerWord ? (
        <TopicPickerModal
          isOpen={!!pickerWord}
          onClose={() => setPickerWord(null)}
          word={pickerWord}
          customCourses={customCourses}
          onAdd={async (targetTopicId, newWordObj) => {
            const result = await addWordToTopic(targetTopicId, newWordObj);
            if (!result?.error) {
              setPickerWord(null);
            }
            return result;
          }}
          onCreateTopic={(topicData) => createTopic(topicData)}
        />
      ) : null}

      <ConfirmActionModal
        isOpen={Boolean(pendingDeleteWord)}
        onClose={() => setPendingDeleteWord(null)}
        onConfirm={() => handleDeleteWord(pendingDeleteWord)}
        title="Xác nhận xóa từ"
        message={pendingDeleteWord ? `Bạn có chắc muốn xóa từ "${pendingDeleteWord.word}" không?` : ''}
        confirmLabel="Xóa từ"
      />
    </main>
  );
}


