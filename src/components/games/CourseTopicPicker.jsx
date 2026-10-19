import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useCustomCourses } from '../../hooks/useCustomCourses';
import { getGuestReadyCourseTopics, mergeGuestReadyCourses } from '../../data/guestToeicCourses';
import axiosClient from '../../utils/axiosClient';
import { isAuthenticatedUser } from '../../utils/userStorage';

export default function CourseTopicPicker({ dueReviewWords, gameInfo, onSelect, onBack }) {
  const { user } = useAuth();
  const { customCourses } = useCustomCourses();
  const [search, setSearch] = useState('');
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState(new Set());
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [apiCourses, setApiCourses] = useState([]);
  const [topicsByCourseId, setTopicsByCourseId] = useState({});
  const [loadingTopicsCourseId, setLoadingTopicsCourseId] = useState(null);

  useEffect(() => {
    let active = true;
    const useGuestCatalog = !isAuthenticatedUser(user);

    axiosClient.get('/courses')
      .then((courses) => {
        if (!active) return;
        const nextCourses = Array.isArray(courses) ? courses : [];
        setApiCourses(mergeGuestReadyCourses(nextCourses));
      })
      .catch(() => {
        if (active) setApiCourses(mergeGuestReadyCourses([]));
      });

    return () => {
      active = false;
    };
  }, [user]);

  const customTopics = useMemo(
    () => customCourses
      .filter((topic) => (topic.words?.length || 0) >= 2)
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        source: 'Tài liệu của bạn',
        lang: topic.language || topic.lang || 'en',
        language: topic.language || topic.lang || 'en',
        words: topic.words,
        vocabularyCount: topic.words?.length || 0,
      })),
    [customCourses]
  );

  const courseOptions = useMemo(() => {
    const options = [];

    if (dueReviewWords.length >= 2) {
      options.push({
        id: 'srs-course',
        title: 'Ôn tập SRS',
        description: 'Bắt đầu nhanh với các từ đang đến hạn ôn tập.',
        source: 'Hệ thống SRS',
        lang: 'en',
        topicCount: 1,
        vocabularyCount: dueReviewWords.length,
      });
    }

    apiCourses.forEach((course) => {
      if (Number(course.topic_count || 0) >= 1 && Number(course.vocabulary_count || 0) >= 2) {
        options.push({
          id: `course-${course.id}`,
          courseKey: course.slug || course.id,
          title: course.title,
          description: course.description || 'Bộ chủ đề luyện tập từ vựng',
          source: 'Khóa học hệ thống',
          lang: course.language || course.lang || 'en',
          topicCount: Number(course.topic_count || 0),
          vocabularyCount: Number(course.vocabulary_count || 0),
        });
      }
    });

    if (customTopics.length > 0) {
      options.push({
        id: 'custom-course',
        title: 'Tài liệu của bạn',
        description: 'Các topic cá nhân bạn đã tự tạo để ôn luyện.',
        source: 'Cá nhân',
        lang: 'en',
        topicCount: customTopics.length,
        vocabularyCount: customTopics.reduce((sum, topic) => sum + (topic.words?.length || 0), 0),
      });
    }

    return options;
  }, [apiCourses, customTopics, dueReviewWords]);

  useEffect(() => {
    if (!selectedCourseId || selectedCourseId === 'srs-course' || selectedCourseId === 'custom-course') return;
    if (topicsByCourseId[selectedCourseId]) return;

    const course = courseOptions.find((item) => item.id === selectedCourseId);
    if (!course?.courseKey) return;

    let active = true;
    setLoadingTopicsCourseId(selectedCourseId);

    if (course?.courseKey) {
      const guestCourse = getGuestReadyCourseTopics(course.courseKey);
      if (guestCourse) {
        setTopicsByCourseId((current) => ({
          ...current,
          [selectedCourseId]: guestCourse.topics
            .filter((topic) => (topic.vocabularyCount || topic.words?.length || topic.wordCount || 0) >= 2)
            .map((topic) => ({
              id: topic.id,
              slug: topic.slug,
              title: topic.title,
              source: course.title,
              sourceCourseId: course.courseKey,
              courseKey: course.courseKey,
              lang: course.lang || 'en',
              words: topic.words || null,
              vocabularyCount: topic.vocabularyCount || topic.wordCount || topic.words?.length || 0,
            })),
        }));
        setLoadingTopicsCourseId(null);
        return () => {
          active = false;
        };
      }
    }

    axiosClient.get(`/courses/${course.courseKey}/topics`)
      .then((data) => {
        if (!active) return;

        const topics = Array.isArray(data?.topics) ? data.topics : (Array.isArray(data) ? data : []);
        setTopicsByCourseId((current) => ({
          ...current,
          [selectedCourseId]: topics
            .filter((topic) => (topic.vocabularyCount || topic.words?.length || topic.wordCount || 0) >= 2)
            .map((topic) => ({
              id: topic.id,
              slug: topic.slug,
              title: topic.title,
              source: course.title,
              sourceCourseId: course.courseKey,
              courseKey: course.courseKey,
              lang: course.lang || 'en',
              words: topic.words || null,
              vocabularyCount: topic.vocabularyCount || topic.wordCount || topic.words?.length || 0,
            })),
        }));
      })
      .catch(() => {
        if (!active) return;
        setTopicsByCourseId((current) => ({ ...current, [selectedCourseId]: [] }));
      })
      .finally(() => {
        if (active) setLoadingTopicsCourseId(null);
      });

    return () => {
      active = false;
    };
  }, [courseOptions, selectedCourseId, topicsByCourseId, user]);

  const currentCourse = useMemo(
    () => courseOptions.find((course) => course.id === selectedCourseId) || null,
    [courseOptions, selectedCourseId]
  );

  const visibleTopics = useMemo(() => {
    if (!selectedCourseId) return [];

    if (selectedCourseId === 'srs-course') {
      return dueReviewWords.length >= 2
        ? [{
          id: 'srs-due',
          title: '🔥 Từ vựng cần ôn tập',
          source: 'Hệ thống SRS',
          lang: 'en',
          words: dueReviewWords,
          isSrs: true,
        }]
        : [];
    }

    if (selectedCourseId === 'custom-course') {
      return customTopics;
    }

    return topicsByCourseId[selectedCourseId] || [];
  }, [customTopics, dueReviewWords, selectedCourseId, topicsByCourseId]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCourses = courseOptions.filter(
    (course) =>
      course.title.toLowerCase().includes(normalizedSearch) ||
      course.description.toLowerCase().includes(normalizedSearch) ||
      course.source.toLowerCase().includes(normalizedSearch)
  );
  const filteredTopics = visibleTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(normalizedSearch) ||
      topic.source.toLowerCase().includes(normalizedSearch)
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
      const topic = visibleTopics.find((item) => item.id === topicId);
      if (!topic) continue;

      let topicWords = topic.words;
      if (!topicWords) {
        try {
          const data = await axiosClient.get(`/topics/${encodeURIComponent(topic.slug || topic.id)}/flashcards`);
          topicWords = Array.isArray(data) ? data : [];
        } catch (error) {
          console.error(error);
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
      source: currentCourse?.title || 'Đã trộn nhiều chủ đề',
      lang: currentCourse?.language || currentCourse?.lang || 'en',
      language: currentCourse?.language || currentCourse?.lang || 'en',
      words: mixedWords,
      isSrs: false,
    });
  };

  return (
    <div className="game-topic-picker">
      <div className="game-picker-topbar">
        <button
          className="game-picker-back-btn"
          onClick={() => {
            if (selectedCourseId) {
              setSelectedCourseId(null);
              setSelectedTopicIds(new Set());
              setIsMultiMode(false);
              setSearch('');
              return;
            }

            onBack();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z" />
          </svg>
          Quay lại
        </button>

        {selectedCourseId ? (
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
        ) : null}
      </div>

      <div className="game-picker-hero" style={{ marginTop: 0 }}>
        <span className="game-picker-game-icon">{gameInfo.icon}</span>
        <div>
          <h2 className="game-picker-title">
            {selectedCourseId ? `Chọn chủ đề trong ${currentCourse?.title || 'khóa học'}` : 'Chọn khóa học để chơi'}
          </h2>
          <p className="game-picker-subtitle">
            {gameInfo.name} · {gameInfo.desc}
          </p>
        </div>
      </div>

      <input
        className="game-picker-search"
        placeholder={selectedCourseId ? '🔍 Tìm chủ đề...' : '🔍 Tìm khóa học...'}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        autoFocus
      />

      {!selectedCourseId && filteredCourses.length === 0 ? (
        <div className="game-picker-empty">
          <div className="game-picker-empty-icon">📭</div>
          <p>Không tìm thấy khóa học nào phù hợp.</p>
          <p>Hãy tạo thêm khóa học hoặc bổ sung từ vựng trước nhé.</p>
        </div>
      ) : selectedCourseId && loadingTopicsCourseId === selectedCourseId ? (
        <div className="game-picker-empty">
          <div className="game-picker-empty-icon">⏳</div>
          <p>Đang tải các chủ đề trong khóa học này...</p>
        </div>
      ) : selectedCourseId && filteredTopics.length === 0 ? (
        <div className="game-picker-empty">
          <div className="game-picker-empty-icon">📭</div>
          <p>Không tìm thấy chủ đề nào có ít nhất 2 từ vựng.</p>
          <p>Hãy chọn khóa học khác hoặc bổ sung thêm từ vựng trước nhé.</p>
        </div>
      ) : !selectedCourseId ? (
        <div className="game-picker-grid">
          {filteredCourses.map((course) => (
            <button
              key={course.id}
              className="game-picker-card"
              onClick={() => {
                setSelectedCourseId(course.id);
                setSelectedTopicIds(new Set());
                setIsMultiMode(false);
                setSearch('');
              }}
            >
              <div className="game-picker-card-head">
                <div className="game-picker-card-copy">
                  <span className="game-picker-card-title">{course.title}</span>
                  <span className="game-picker-card-source"> ({course.source})</span>
                </div>
              </div>
              <span className="game-picker-card-count">{course.topicCount} chủ đề · {course.vocabularyCount} từ</span>
            </button>
          ))}
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
                  const topic = visibleTopics.find((item) => item.id === topicId);
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
