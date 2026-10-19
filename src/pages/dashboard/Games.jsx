import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import flappyLogo from '../../assets/images/logo-flappybird-course.png';
import rainLogo from '../../assets/images/logo-rain-vocab.png';
import FlappyBirdExperience, { BIRD_OPTIONS, GAME_CARD, GAME_ID } from '../../components/games/FlappyBirdExperience';
import CourseTopicPicker from '../../components/games/CourseTopicPicker';
import VocabularyRainExperience from '../../components/games/VocabularyRainExperience';
import SpacedRepetitionSection from '../../components/games/SpacedRepetitionSection';
import Quiz from '../../components/Quiz';
import Typing from '../../components/Typing';
import Listening from '../../components/Listening';
import Match from '../../components/Match';
import Flashcard from '../../components/Flashcard';
import { useCourseProgress } from '../../hooks/useCourseProgress';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import { getGuestReadyCourseTopics } from '../../data/guestToeicCourses';
import axiosClient from '../../utils/axiosClient';
import { getDashboardUserKey, recordStudyModeCompletion } from '../../utils/dashboardProgress';
import { recordGamePlay } from '../../utils/userStats';
import { enqueueToSrsNow, getDueItems as getLocalDueItems, reviewItem as reviewLocalItem } from '../../utils/srsStorage';
import {
  enqueueImmediateReviews,
  fetchDueReviews,
  hasServerFlashcardId,
  hasServerSrsAccess,
  mapReviewRatingToQualityScore,
  submitSrsReviewBatch,
} from '../../utils/srsApi';
import { xpStudyModeComplete } from '../../utils/xpSystem';
import { recordVocabularyActivity } from '../../utils/vocabActivityApi';

const VOCAB_GAMES = [
  { id: 'quiz', name: 'Trắc nghiệm', icon: '🎯', desc: '4 đáp án, chọn nghĩa đúng', color: '#6366f1' },
  { id: 'typing', name: 'Gõ từ', icon: '⌨️', desc: 'Nhìn nghĩa, gõ lại từ vựng', color: '#f59e0b' },
  { id: 'listen', name: 'Luyện nghe', icon: '🎧', desc: 'Nghe phát âm, điền lại từ', color: '#10b981' },
  { id: 'match', name: 'Nối từ', icon: '🔗', desc: 'Ghép từ vựng với nghĩa đúng', color: '#ec4899' },
  { id: 'flashcard', name: 'Flashcard', icon: '🃏', desc: 'Lật thẻ, ôn lại từ nhanh chóng', color: '#8b5cf6' },
  { id: 'rain', name: 'Mưa từ vựng', icon: '🌧️', desc: 'Chọn đúng từ đang rơi theo nghĩa hiển thị', color: '#0ea5e9' },
];

const VOCAB_GAMES_DISPLAY = [
  VOCAB_GAMES.find((game) => game.id === 'flashcard'),
  { ...VOCAB_GAMES.find((game) => game.id === 'quiz'), name: 'Quiz' },
  { ...VOCAB_GAMES.find((game) => game.id === 'listen'), name: 'Listening' },
  { ...VOCAB_GAMES.find((game) => game.id === 'typing'), name: 'Typing' },
  { ...VOCAB_GAMES.find((game) => game.id === 'match'), name: 'Match' },
].filter(Boolean);

const BACK_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z" />
  </svg>
);

function getCurrentStudyUserKey() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return getDashboardUserKey(storedUser);
  } catch {
    return 'guest';
  }
}

function trackStudySessionComplete(modeName) {
  recordGamePlay(getCurrentStudyUserKey());
  if (modeName) {
    xpStudyModeComplete(modeName);
    recordVocabularyActivity(modeName);
    recordStudyModeCompletion(modeName);
  }
}

function mapDueItemToWord(item) {
  return {
    id: item.flashcardId ?? item.wordId,
    flashcardId: item.flashcardId,
    wordId: item.wordId ?? item.flashcardId,
    word: item.word,
    mean: item.mean,
    transcription: item.transcription,
    example: item.example,
    example_vi: item.example_vi,
    wordtype: item.wordtype,
  };
}

function mergeDueWords(primaryWords = [], secondaryWords = []) {
  const merged = [];
  const seen = new Set();

  [...primaryWords, ...secondaryWords].forEach((word) => {
    if (!word) return;
    const key = String(word.id ?? word.wordId ?? word.flashcardId ?? '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(word);
  });

  return merged;
}

async function enqueueWordsForImmediateSrs(words, useServerSrs, topicId, courseId) {
  const serverFlashcardIds = [];

  words.forEach((word) => {
    if (useServerSrs && hasServerFlashcardId(word)) {
      serverFlashcardIds.push(word.flashcardId);
      enqueueToSrsNow({ ...word, id: word.flashcardId, wordId: word.flashcardId }, topicId, courseId);
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
}

function TopicPicker({ dueReviewWords, gameInfo, onSelect, onBack }) {
  const { customCourses } = useCustomCourses();
  const [search, setSearch] = useState('');
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState(new Set());

  const [apiTopics, setApiTopics] = useState([]);

  useEffect(() => {
    axiosClient.get('/courses')
      .then(async (courses) => {
        if (!Array.isArray(courses)) return;
        const allTopics = [];
        for (const course of courses) {
          try {
            const data = await axiosClient.get(`/courses/${course.slug || course.id}/topics`);
            const topics = Array.isArray(data?.topics) ? data.topics : (Array.isArray(data) ? data : []);
            topics.forEach((topic) => {
              if ((topic.vocabularyCount || topic.words?.length || topic.wordCount || 0) >= 2) {
                allTopics.push({
                  id: topic.id,
                  slug: topic.slug,
                  title: topic.title,
                  source: course.title,
                  lang: course.lang || 'en',
                  words: topic.words || null,
                  vocabularyCount: topic.vocabularyCount,
                });
              }
            });
          } catch {
            /* skip */
          }
        }
        setApiTopics(allTopics);
      })
      .catch(() => {});
  }, []);

  const allTopics = useMemo(() => {
    const list = [];

    if (dueReviewWords.length >= 2) {
      list.push({
        id: 'srs-due',
        title: '🔥 Từ vựng cần ôn tập',
        source: 'Hệ thống SRS',
        lang: 'en',
        words: dueReviewWords,
        isSrs: true,
      });
    }

    list.push(...apiTopics);

    customCourses.forEach((topic) => {
      if ((topic.words?.length || 0) >= 2) {
        list.push({
          id: topic.id,
          title: topic.title,
          source: 'Tài liệu của bạn',
          lang: topic.language || topic.lang || 'en',
          language: topic.language || topic.lang || 'en',
          words: topic.words,
        });
      }
    });

    return list;
  }, [customCourses, dueReviewWords, apiTopics]);

  const filteredTopics = allTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(search.toLowerCase()) ||
      topic.source.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTopic = (topic) => {
    const next = new Set(selectedTopicIds);
    if (next.has(topic.id)) next.delete(topic.id);
    else next.add(topic.id);
    setSelectedTopicIds(next);
  };

  const handleStartMixed = async () => {
    if (selectedTopicIds.size === 0) return;

    const mixedWords = [];
    const seenIds = new Set();

    for (const topicId of selectedTopicIds) {
      const topic = allTopics.find((item) => item.id === topicId);
      if (!topic) continue;

      let topicWords = topic.words;
      if (!topicWords) {
        try {
          const data = await axiosClient.get(`/topics/${encodeURIComponent(topic.slug || topic.id)}/flashcards`);
          topicWords = Array.isArray(data) ? data : [];
        } catch (err) {
          console.error(err);
          topicWords = [];
        }
      }

      topicWords.forEach((word) => {
        const key = word.id ?? word.flashcardId;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          mixedWords.push(word);
        }
      });
    }

    if (mixedWords.length < 2) {
      alert('Cần ít nhất 2 từ vựng để chơi.');
      return;
    }

    onSelect({
      id: `mixed-${Date.now()}`,
      title: `🔀 Chủ đề kết hợp (${selectedTopicIds.size})`,
      source: 'Đã trộn nhiều chủ đề',
      lang: 'en',
      words: mixedWords,
      isSrs: false,
    });
  };

  return (
    <div className="game-topic-picker">
      <div className="game-picker-topbar">
        <button className="game-picker-back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z" />
          </svg>
          Quay lại
        </button>

        <label className="game-picker-multi-toggle">
          <input
            type="checkbox"
            className="game-picker-multi-checkbox"
            checked={isMultiMode}
            onChange={(event) => {
              setIsMultiMode(event.target.checked);
              if (!event.target.checked) setSelectedTopicIds(new Set());
            }}
          />
          <span className="game-picker-multi-label">Chế độ trộn chủ đề</span>
        </label>
      </div>

      <div className="game-picker-hero" style={{ marginTop: 0 }}>
        <span className="game-picker-game-icon">{gameInfo.icon}</span>
        <div>
          <h2 className="game-picker-title">Chọn chủ đề để chơi</h2>
          <p className="game-picker-subtitle">
            {gameInfo.name} · {gameInfo.desc}
          </p>
        </div>
      </div>

      <input
        className="game-picker-search"
        placeholder="🔍 Tìm chủ đề..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        autoFocus
      />

      {filteredTopics.length === 0 ? (
        <div className="game-picker-empty">
          <div className="game-picker-empty-icon">📭</div>
          <p>Không tìm thấy chủ đề nào có ít nhất 2 từ vựng.</p>
          <p>Hãy thêm từ vào các topic trước nhé.</p>
        </div>
      ) : (
        <>
          <div className="game-picker-grid" id="game-picker-grid" style={{ paddingBottom: isMultiMode && selectedTopicIds.size > 0 ? '80px' : '0' }}>
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopicIds.has(topic.id);
              return (
                <button
                  key={topic.id}
                  className={`game-picker-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (isMultiMode) toggleTopic(topic);
                    else onSelect(topic);
                  }}
                  id={`game-picker-${topic.id}`}
                >
                  <div className="game-picker-card-head">
                    <div className="game-picker-card-copy">
                      <span className="game-picker-card-title">{topic.title}</span>
                      <span className="game-picker-card-source"> ({topic.source})</span>
                    </div>
                    {isMultiMode ? (
                      <div className={`game-picker-check${isSelected ? ' is-selected' : ''}`}>
                        {isSelected ? '✓' : null}
                      </div>
                    ) : null}
                  </div>
                  <span className="game-picker-card-count">{topic.words ? topic.words.length : topic.vocabularyCount} từ</span>
                </button>
              );
            })}
          </div>

          {isMultiMode && selectedTopicIds.size > 0 ? (
            <div className="game-picker-mixed-cta-wrap">
              <button
                className="btn btn-primary game-picker-mixed-cta"
                onClick={handleStartMixed}
              >
                🔀 Bắt đầu với {selectedTopicIds.size} chủ đề (
                {Array.from(selectedTopicIds).reduce((sum, topicId) => {
                  const topic = allTopics.find((item) => item.id === topicId);
                  return sum + (topic ? (topic.words ? topic.words.length : topic.vocabularyCount) : 0);
                }, 0)}
                {' '}từ)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FlappyBirdPicker({ selectedBird, onPickBird, onContinue, onBack }) {
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
            <p>Sau khi chọn chim, bạn sẽ tiếp tục đến bước chọn chủ đề để chơi.</p>
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
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            Tiếp tục chọn chủ đề
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Games() {
  const location = useLocation();
  const [activeGameId, setActiveGameId] = useState(null);
  const [isSrsScreenOpen, setIsSrsScreenOpen] = useState(false);
  const [activeFunGamePhase, setActiveFunGamePhase] = useState('hub');
  const [selectedFlappyBird, setSelectedFlappyBird] = useState(BIRD_OPTIONS[0]?.id || 'yellow');
  const [selectedFlappyTopic, setSelectedFlappyTopic] = useState(null);
  const [vocabGame, setVocabGame] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [phase, setPhase] = useState('hub');
  const [studyWordIds, setStudyWordIds] = useState(null);
  const [dueReviewWords, setDueReviewWords] = useState([]);
  const { remembered, replaceRememberedInTopic } = useCourseProgress();
  const pageRef = useRef(null);
  const useServerSrs = hasServerSrsAccess();

  const activeWords = useMemo(() => {
    if (!selectedTopic) return [];
    return studyWordIds ? selectedTopic.words.filter((word) => studyWordIds.includes(word.id)) : selectedTopic.words;
  }, [selectedTopic, studyWordIds]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadDueReviews() {
      if (useServerSrs) {
        try {
          const items = await fetchDueReviews();
          const serverDueWords = items.map(mapDueItemToWord);
          const localDueWords = getLocalDueItems().map((item) => ({
            id: item.wordId,
            wordId: item.wordId,
            flashcardId: item.flashcardId ?? null,
            word: item.word,
            mean: item.mean,
            transcription: item.transcription,
            example: item.example,
            example_vi: item.example_vi,
            wordtype: item.wordtype,
          }));
          if (!cancelled && items.length > 0) {
            setDueReviewWords(mergeDueWords(serverDueWords, localDueWords));
            return;
          }
        } catch (error) {
          console.error('Failed to load due reviews from server.', error);
        }
      }

      if (!cancelled) {
        setDueReviewWords(
          getLocalDueItems().map((item) => ({
            id: item.wordId,
            wordId: item.wordId,
            flashcardId: item.flashcardId ?? null,
            word: item.word,
            mean: item.mean,
            transcription: item.transcription,
            example: item.example,
            example_vi: item.example_vi,
            wordtype: item.wordtype,
          }))
        );
      }
    }

    loadDueReviews();

    return () => {
      cancelled = true;
    };
  }, [useServerSrs]);

  useEffect(() => {
    if (location.hash === '#games-srs-label') {
      setIsSrsScreenOpen(true);
      return;
    }

    if (phase !== 'hub' || activeGameId || isSrsScreenOpen) return;
    if (!location.hash) return;

    const target = document.querySelector(location.hash);
    if (!target) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeGameId, isSrsScreenOpen, location.hash, phase]);

  const handleVocabGameClick = (game) => {
    setVocabGame(game);
    setPhase('picker');
  };

  const handleFlappyGameClick = () => {
    setActiveGameId(GAME_ID);
    setActiveFunGamePhase('bird');
    setSelectedFlappyTopic(null);
  };

  const handleSrsOpen = () => {
    setIsSrsScreenOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSrsClose = () => {
    setIsSrsScreenOpen(false);
    if (location.hash === '#games-srs-label') {
      window.history.replaceState(null, '', '/dashboard/games');
    }
  };

  const handleTopicSelect = async (topic) => {
    let fullTopic = topic;
    if (!topic.words) {
      const guestCourse = getGuestReadyCourseTopics(
        topic.courseKey || topic.sourceCourseId,
      );
      const guestTopic = guestCourse?.topics?.find((item) => item.slug === topic.slug || String(item.id) === String(topic.id));
      if (guestTopic?.words?.length) {
        fullTopic = { ...topic, words: guestTopic.words };
      } else {
        try {
          const data = await axiosClient.get(`/topics/${encodeURIComponent(topic.slug || topic.id)}/flashcards`);
          fullTopic = { ...topic, words: Array.isArray(data) ? data : [] };
        } catch (err) {
          console.error(err);
        }
      }
    }
    setSelectedTopic(fullTopic);
    setPhase('playing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitGame = () => {
    setPhase('hub');
    setVocabGame(null);
    setSelectedTopic(null);
    setStudyWordIds(null);
  };

  const handleBackToPicker = () => {
    setSelectedTopic(null);
    setPhase('picker');
    setStudyWordIds(null);
  };

  const handleStudyWrongWords = (wrongWordIds) => {
    setStudyWordIds(wrongWordIds);
    setVocabGame(VOCAB_GAMES_DISPLAY.find((game) => game.id === 'flashcard') || vocabGame);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const flappyPickerInfo = useMemo(
    () => ({
      icon: '🐦',
      name: GAME_CARD.title,
      desc: 'Chọn topic để bắt đầu Flappy Bird với bird bạn vừa chọn',
    }),
    []
  );

  const studyModeProps = selectedTopic
    ? {
      topicLang: selectedTopic.lang,
      words: activeWords,
      topicTitle: selectedTopic.title,
      sourceTitle: selectedTopic.source,
      allTopicWords: selectedTopic.words,
      initialLearnedWordIds: activeWords.filter((word) => remembered[word.id]).map((word) => word.id),
      onSessionComplete: () => trackStudySessionComplete(vocabGame?.id),
      onExit: handleExitGame,
      onBackToTopic: handleBackToPicker,
      learnUntilMastered: false,
      onSaveLearnedWords: async (correctWordIds, wrongWordIds = []) => {
        const correctSet = new Set(correctWordIds);
        const wrongSet = new Set(wrongWordIds);
        const immediateServerFlashcardIds = [];

        activeWords.forEach((word) => {
          if (hasServerFlashcardId(word)) {
            if (correctSet.has(word.id)) {
              immediateServerFlashcardIds.push(word.flashcardId);
              enqueueToSrsNow({ ...word, id: word.flashcardId, wordId: word.flashcardId }, selectedTopic.id, 'game');
            } else if (wrongSet.has(word.id)) {
              // Leave wrong cards to the normal study flows; completion should only
              // enqueue the words the learner actually remembered.
            }
            return;
          }

          if (correctSet.has(word.id)) {
            if (!selectedTopic.isSrs) enqueueToSrsNow(word, selectedTopic.id, 'game');
            reviewLocalItem(word.id, 'good');
          } else if (wrongSet.has(word.id)) {
            if (!selectedTopic.isSrs) enqueueToSrsNow(word, selectedTopic.id, 'game');
            reviewLocalItem(word.id, 'forgot');
          }
        });

        if (immediateServerFlashcardIds.length > 0) {
          try {
            await enqueueImmediateReviews(immediateServerFlashcardIds);
          } catch (error) {
            console.error('Failed to enqueue immediate game flashcard reviews.', error);
          }
        }

        replaceRememberedInTopic(activeWords.map((word) => word.id), correctWordIds);
      },
      onStartQuiz: () => {
        setVocabGame(VOCAB_GAMES_DISPLAY.find((game) => game.id === 'quiz') || vocabGame);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onStudyWrongWords: handleStudyWrongWords,
    }
    : null;

  if (studyModeProps && ['listen', 'typing', 'match'].includes(vocabGame?.id)) {
    studyModeProps.onSaveLearnedWords = async (selectedWordIds) => {
      const selectedSet = new Set(selectedWordIds);
      const wordsToReview = activeWords.filter((word) => !selectedSet.has(word.id));

      replaceRememberedInTopic(activeWords.map((word) => word.id), selectedWordIds);

      if (!selectedTopic?.isSrs) {
        await enqueueWordsForImmediateSrs(wordsToReview, useServerSrs, selectedTopic?.id, 'game');
      }
    };
  }

  if (activeGameId === GAME_ID && activeFunGamePhase === 'playing' && selectedFlappyTopic) {
    return (
      <main ref={pageRef} className="dash-main games-page is-game-active" id="page-games">
        <FlappyBirdExperience
          topic={selectedFlappyTopic}
          selectedBird={selectedFlappyBird}
          onSessionComplete={() => trackStudySessionComplete('flappy-bird')}
          onBackToPicker={() => setActiveFunGamePhase('picker')}
          onBackGallery={() => {
            setActiveGameId(null);
            setActiveFunGamePhase('hub');
            setSelectedFlappyTopic(null);
          }}
        />
      </main>
    );
  }

  if (activeGameId === GAME_ID && activeFunGamePhase === 'picker') {
    return (
      <main ref={pageRef} className="dash-main games-page" id="page-games">
        <CourseTopicPicker
          dueReviewWords={dueReviewWords}
          gameInfo={flappyPickerInfo}
          onSelect={async (topic) => {
            let fullTopic = topic;
            if (!topic.words) {
              try {
                const data = await axiosClient.get(`/topics/${encodeURIComponent(topic.slug || topic.id)}/flashcards`);
                fullTopic = { ...topic, words: Array.isArray(data) ? data : [] };
              } catch (err) {
                console.error(err);
              }
            }
            setSelectedFlappyTopic(fullTopic);
            setActiveFunGamePhase('playing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={() => {
            setActiveFunGamePhase('bird');
            setSelectedFlappyTopic(null);
          }}
        />
      </main>
    );
  }

  if (activeGameId === GAME_ID && activeFunGamePhase === 'bird') {
    return (
      <main ref={pageRef} className="dash-main games-page" id="page-games">
        <FlappyBirdPicker
          selectedBird={selectedFlappyBird}
          onPickBird={setSelectedFlappyBird}
          onContinue={() => setActiveFunGamePhase('picker')}
          onBack={() => {
            setActiveGameId(null);
            setActiveFunGamePhase('hub');
            setSelectedFlappyTopic(null);
          }}
        />
      </main>
    );
  }

  if (isSrsScreenOpen) {
    return (
      <main ref={pageRef} className="dash-main games-page" id="page-games">
        <SpacedRepetitionSection
          variant="full"
          onClose={handleSrsClose}
          onGoHome={() => window.location.assign('/dashboard')}
        />
      </main>
    );
  }

  if (phase === 'playing' && selectedTopic && studyModeProps) {
    const modeMap = {
      quiz: <Quiz {...studyModeProps} />,
      typing: <Typing {...studyModeProps} />,
      listen: <Listening {...studyModeProps} />,
      match: <Match {...studyModeProps} />,
      flashcard: <Flashcard {...studyModeProps} onSaveLearnedWords={studyModeProps.onSaveLearnedWords} />,
      rain: <VocabularyRainExperience {...studyModeProps} onSessionComplete={() => trackStudySessionComplete('rain')} />,
    };

    return (
      <main ref={pageRef} className="dash-main cv-subview study-modes-surface" id="page-games">
        <div className="cv-subview-header">
          <button type="button" className="cv-breadcrumb-btn" onClick={handleBackToPicker}>
            {BACK_ICON}
            <span>{selectedTopic.source || 'Chon chu de'}</span>
          </button>
          <span className="cv-breadcrumb-sep">&gt;</span>
          <span className="cv-breadcrumb-current">{selectedTopic.title || vocabGame?.name || 'Dang hoc'}</span>
        </div>
        {modeMap[vocabGame?.id] ?? null}
      </main>
    );
  }

  if (phase === 'picker' && vocabGame) {
    return (
      <main ref={pageRef} className="dash-main games-page" id="page-games">
        <CourseTopicPicker
          dueReviewWords={dueReviewWords}
          gameInfo={vocabGame}
          onSelect={handleTopicSelect}
          onBack={() => {
            setPhase('hub');
            setVocabGame(null);
          }}
        />
      </main>
    );
  }

  return (
    <main ref={pageRef} className="dash-main games-page" id="page-games">
      <section className="games-hub">
        <div className="games-hero">
          <div>
            <div className="games-eyebrow">Luyện tập từ vựng</div>
            <h1>Chọn trò chơi để bắt đầu</h1>
            <p>Ôn luyện từ vựng qua các mini-game tương tác. Chọn chủ đề và bắt đầu thách thức bản thân.</p>
          </div>
        </div>

        <div className="games-section-label" id="games-vocab-label">Học từ vựng</div>
        <div className="games-vocab-grid" id="games-vocab-grid">
          {VOCAB_GAMES_DISPLAY.map((game) => (
            <button
              key={game.id}
              className="games-vocab-card"
              id={`game-card-${game.id}`}
              onClick={() => handleVocabGameClick(game)}
              style={{ '--game-color': game.color }}
            >
              <span className="games-vocab-icon">{game.icon}</span>
              <span className="games-vocab-name">{game.name}</span>
              <span className="games-vocab-desc">{game.desc}</span>
              <span className="games-vocab-play">Chơi ngay →</span>
            </button>
          ))}
        </div>

        <div className="games-section-label" id="games-fun-label">Game ôn từ</div>
        <div className="games-grid">
          <button
            type="button"
            className="game-card-image-button"
            onClick={handleFlappyGameClick}
            aria-label={GAME_CARD.title}
            id="game-card-flappy"
          >
            <img className="game-card-image" src={flappyLogo} alt={GAME_CARD.title} />
          </button>

          <button
            type="button"
            className="games-vocab-card games-vocab-card-image-only"
            id="game-card-rain"
            onClick={() => handleVocabGameClick(VOCAB_GAMES.find((game) => game.id === 'rain'))}
            style={{ '--game-color': '#0ea5e9' }}
            aria-label="Mưa từ vựng"
          >
            <img className="games-vocab-card-banner" src={rainLogo} alt="Mưa từ vựng" />
          </button>
        </div>

        <div className="games-section-label" id="games-srs-label">Ôn tập Spaced Repetition</div>
        <SpacedRepetitionSection variant="preview" onOpen={handleSrsOpen} />
      </section>
    </main>
  );
}
