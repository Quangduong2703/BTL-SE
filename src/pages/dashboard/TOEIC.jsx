import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { mergeGuestReadyCourses } from "../../data/guestToeicCourses";
import { xpToeicFullTest, xpToeicPartComplete } from "../../utils/xpSystem";
import axiosClient from "../../utils/axiosClient";
import { mapApiTestToFrontendFormat } from "../../utils/toeicAdapter";
import {
  getGuestToeicFullTestVariants,
  getGuestToeicListeningTests,
  getGuestToeicPracticeModes,
  getGuestToeicReadingTests,
  getGuestToeicTests,
  isGuestToeicTestId,
  readGuestToeicHistory,
  submitGuestToeicAnswers,
} from "../../utils/guestToeic";
import { recordToeicFullTestProgress } from "../../utils/dashboardProgress";
import { getStoredUser, isAuthenticatedUser } from "../../utils/userStorage";
import { useCustomCourses } from "../../hooks/useCustomCourses";

function formatTime(s) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function isGuestToeicMode() {
  return !isAuthenticatedUser(getStoredUser());
}

const LISTENING_PRACTICE_TYPES = new Set([
  "part1-picture",
  "part2-response",
  "part3-conversations",
  "part4-talks",
]);

const READING_PRACTICE_TYPES = new Set([
  "part5-reading",
  "part6-reading",
  "part7-reading",
]);

function speakToeicText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

function getFullTestPartKey(partLabel = "") {
  return String(partLabel || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function shouldHideListeningTranscriptInFullTest(question) {
  return question?.skill === "Listening";
}

function buildFullTestPartGroups(questions) {
  const groups = [];
  let current = null;

  questions.forEach((question, index) => {
    const partKey = getFullTestPartKey(question.partLabel);
    if (!current || current.partKey !== partKey) {
      current = {
        partKey,
        partLabel: question.partLabel,
        skill: question.skill,
        startIndex: index,
        endIndex: index,
        questions: [question],
      };
      groups.push(current);
      return;
    }

    current.endIndex = index;
    current.questions.push(question);
  });

  return groups;
}

const FULL_TEST_PART_META = {
  "PART 1": { title: "Photographs", count: 6 },
  "PART 2": { title: "Question-Response", count: 25 },
  "PART 3": { title: "Conversations", count: 39 },
  "PART 4": { title: "Talks", count: 30 },
  "PART 5": { title: "Incomplete Sentences", count: 30 },
  "PART 6": { title: "Text Completion", count: 16 },
  "PART 7": { title: "Reading Comprehension", count: 54 },
};

const LISTENING_TEST_SECTION_DURATIONS = {
  "lt1-part1": 14 * 60,
  "lt1-part2": 18 * 60,
  "lt1-part3": 13 * 60,
  "lt2-part1": 14 * 60,
  "lt2-part2": 18 * 60,
  "lt2-part3": 13 * 60,
};

const READING_TEST_SECTION_DURATIONS = {
  "rt1-part1": 18 * 60,
  "rt1-part2": 18 * 60,
  "rt1-part3": 19 * 60,
  "rt2-part1": 18 * 60,
  "rt2-part2": 18 * 60,
  "rt2-part3": 19 * 60,
};

// We will now fetch lists and questions dynamically via API instead of hardcoded SETS.

function normalizeResourceKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveRecommendedResourceLink(resource, courses) {
  if (!resource?.courseMatchers?.length || !Array.isArray(courses) || courses.length === 0) {
    return resource.link;
  }

  const normalizedMatchers = resource.courseMatchers.map(normalizeResourceKey);
  const matchedCourse = courses.find((course) => {
    const candidates = [
      course?.slug,
      course?.title,
      course?.description,
      course?.courseId,
      course?.id,
    ]
      .filter(Boolean)
      .map(normalizeResourceKey);

    return normalizedMatchers.some((matcher) =>
      candidates.some((candidate) => candidate === matcher || candidate.includes(matcher) || matcher.includes(candidate)),
    );
  });

  if (!matchedCourse) return resource.fallbackLink || resource.link || "/dashboard/courses";
  return `/dashboard/courses/${matchedCourse.slug || matchedCourse.courseId || matchedCourse.id}`;
}

function ModeGrid({ modes, onSelect }) {
  return (
    <div className="toeic-parts-grid">
      {modes.map((mode) => (
        <button
          key={mode.id}
          className="toeic-part-card"
          onClick={() => onSelect(mode)}
        >
          <span className="toeic-part-card-icon">{mode.icon}</span>
          <div className="toeic-part-card-body">
            <strong>
              {mode.label}: {mode.title}
            </strong>
            <span className="toeic-part-card-desc">{mode.desc}</span>
            <span className="toeic-part-card-count">
              {mode.topics.length} topic luyện tập
            </span>
          </div>
          <span className="toeic-part-card-arrow">→</span>
        </button>
      ))}
    </div>
  );
}

function TopicGrid({ mode, onSelect, onBack, backLabel }) {
  return (
    <div className="toeic-practice-layout">
      <button className="toeic-back-link" onClick={onBack}>
        {backLabel}
      </button>
      <div className="toeic-listening-topic-hero">
        <div className="toeic-test-hero-icon">{mode.icon}</div>
        <div>
          <h2>{mode.title}</h2>
          <p>{mode.desc}</p>
        </div>
      </div>
      <div className="toeic-parts-grid">
        {mode.topics.map((topic) => (
          <button
            key={topic.id}
            className="toeic-part-card"
            onClick={() => onSelect(topic)}
          >
            <span className="toeic-part-card-icon">{topic.icon}</span>
            <div className="toeic-part-card-body">
              <strong>{topic.title}</strong>
              <span className="toeic-part-card-desc">{topic.desc}</span>
              <span className="toeic-part-card-count">
                {topic.questions?.length ? `${topic.questions.length} câu hỏi` : 'Luyện tập ngay'}
              </span>
            </div>
            <span className="toeic-part-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ListeningTestGrid({ tests, onSelect }) {
  return (
    <div className="toeic-practice-layout">
      <div className="toeic-listening-test-hero">
        <div className="toeic-listening-test-hero-copy">
          <h2>Listening Test</h2>
          <p>
            Chọn đề listening để vào giao diện thi thử, nghe audio thật và luyện
            theo đúng nhịp làm bài.
          </p>
        </div>
      </div>
      <div className="toeic-parts-grid">
        {tests.map((test) => (
          <button
            key={test.id}
            className="toeic-part-card"
            onClick={() => onSelect(test)}
          >
            <span className="toeic-part-card-icon">
              {test.id === "listening-test-1"
                ? "A1"
                : test.id === "listening-test-2"
                  ? "B1-"
                  : "Đề"}
            </span>
            <div className="toeic-part-card-body">
              <strong>{test.name}</strong>
              <span className="toeic-part-card-desc">{test.desc}</span>
              <span className="toeic-part-card-count">
                {test.id === "listening-test-1"
                  ? "Target 450+"
                  : test.id === "listening-test-2"
                    ? "Target 450+"
                    : `${(test.sections || []).length} phần`}
              </span>
            </div>
            <span className="toeic-part-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ListeningTestParts({ test, onBack, onSelectPart }) {
  return (
    <div className="toeic-practice-layout">
      <button className="toeic-back-link" onClick={onBack}>
        ← Quay lại chọn đề listening
      </button>
      <div className="toeic-listening-test-hero">
        <div className="toeic-listening-test-hero-copy">
          <div>
            <h2>{test.name}</h2>
            <p>Chọn part để vào giao diện làm bài.</p>
          </div>
        </div>
      </div>
      <div className="toeic-listening-test-parts">
        {(test.sections || []).map((part) => (
          <button
            key={part.id}
            className="toeic-listening-test-part-card"
            onClick={() => onSelectPart(part)}
          >
            <span className="toeic-listening-test-part-label">
              {part.label}
            </span>
            <strong>{part.title}</strong>
            <span className="toeic-part-card-desc">
              {part.desc || "Mở đề thi"}
            </span>
            <span className="toeic-part-card-count">
              {part.questionCount || 0} câu hỏi
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadingTestGrid({ tests, onSelect }) {
  return (
    <div className="toeic-practice-layout">
      <div className="toeic-listening-test-hero">
        <div className="toeic-listening-test-hero-copy">
          <h2>Reading Test</h2>
          <p>
            Chọn đề reading để làm bài theo giao diện thi thử, tập trung vào tốc
            độ đọc và xử lý câu hỏi.
          </p>
        </div>
      </div>
      <div className="toeic-parts-grid">
        {tests.map((test) => (
          <button
            key={test.id}
            className="toeic-part-card"
            onClick={() => onSelect(test)}
          >
            <span className="toeic-part-card-icon">
              {test.id === "reading-test-1"
                ? "A2"
                : test.id === "reading-test-2"
                  ? "B1"
                  : "Đề"}
            </span>
            <div className="toeic-part-card-body">
              <strong>{test.name}</strong>
              <span className="toeic-part-card-desc">{test.desc}</span>
              <span className="toeic-part-card-count">
                {test.id === "reading-test-1"
                  ? "Target 450+"
                  : test.id === "reading-test-2"
                    ? "Target 450+"
                    : `${(test.sections || []).length} phần`}
              </span>
            </div>
            <span className="toeic-part-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadingTestParts({ test, onBack, onSelectPart }) {
  return (
    <div className="toeic-practice-layout">
      <button className="toeic-back-link" onClick={onBack}>
        ← Quay lại chọn đề reading
      </button>
      <div className="toeic-listening-test-hero">
        <div className="toeic-listening-test-hero-copy">
          <div>
            <h2>{test.name}</h2>
            <p>Chọn part để vào giao diện làm bài.</p>
          </div>
        </div>
      </div>
      <div className="toeic-listening-test-parts">
        {(test.sections || []).map((part) => (
          <button
            key={part.id}
            className="toeic-listening-test-part-card"
            onClick={() => onSelectPart(part)}
          >
            <span className="toeic-listening-test-part-label">
              {part.label}
            </span>
            <strong>{part.title}</strong>
            <span className="toeic-part-card-desc">
              {part.desc || "Mở đề thi"}
            </span>
            <span className="toeic-part-card-count">
              {part.questionCount || 0} câu hỏi
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ListeningTestPlaceholder({ test, part, onBack }) {
  return (
    <div className="toeic-practice-layout">
      <button className="toeic-back-link" onClick={onBack}>
        ← Quay lại chọn part
      </button>
      <div className="review-empty-card toeic-listening-test-empty">
        <div className="review-empty-icon">LT</div>
        <h2>
          {test.name} · {part.label}
        </h2>
        <p>
          {part.title} chưa có dữ liệu hoàn chỉnh. Khung này đã sẵn sàng để nối
          tiếp bộ đề thật ở bước sau.
        </p>
      </div>
    </div>
  );
}

function ReadingTestPlaceholder({ test, part, onBack }) {
  return (
    <div className="toeic-practice-layout">
      <button className="toeic-back-link" onClick={onBack}>
        ← Quay lại chọn part
      </button>
      <div className="review-empty-card toeic-listening-test-empty">
        <div className="review-empty-icon">RT</div>
        <h2>
          {test.name} · {part.label}
        </h2>
        <p>
          {part.title} chưa có dữ liệu hoàn chỉnh. Khung này đã sẵn sàng để nối
          bộ đề thật ở bước sau.
        </p>
      </div>
    </div>
  );
}

function getListeningTestPrompt(prompt) {
  if (!prompt) return "";
  return String(prompt)
    .replace(/\s+/g, " ")
    .replace(/^.*spoken only one time\.\s*/i, "")
    .replace(/^.*answer sheet\.\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function getReadingTestPrompt(prompt) {
  if (!prompt) return "";
  return String(prompt).replace(/\s+/g, " ").trim();
}

function formatReadingPassage(passage) {
  if (!passage) return "";

  let formatted = String(passage)
    .replace(/\/n/g, "\n")
    .replace(/\s*\n\s*/g, "\n")
    .replace(
      /(Directions:[\s\S]*?answer sheet\.)\s*(Questions\s+\d+-\d+\s+refer to the following[^.]*\.)/i,
      "$1\n\n$2",
    )
    .replace(
      /(Questions\s+\d+-\d+\s+refer to the following[^.]*\.)\s*/gi,
      "$1\n\n",
    )
    .replace(/\s+(From:|To:|Subject:|Date:|Dear\s)/g, "\n$1")
    .replace(/(Date:[^\n]*)(\nDear\s)/g, "$1\n\n$2")
    .replace(/\s+(Sincerely,|Regards,|Best regards,)/g, "\n\n$1")
    .replace(/\s+Câu\s+\d+\s*$/i, "")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  formatted = formatted.replace(
    /(Questions\s+\d+-\d+\s+refer to the following e-mail\.)\n(From:)/gi,
    "$1\n\n$2",
  );
  formatted = formatted.replace(/(Dear [^\n,]+,)\s+/i, "$1\n\n");
  formatted = formatted.replace(
    /(Sincerely,|Regards,|Best regards,)\s+([^\n]+)/i,
    "$1\n$2",
  );

  return formatted;
}

function renderReadingPassageBlock(passage) {
  const formatted = formatReadingPassage(passage);
  if (!formatted) return null;

  const lines = formatted
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const nodes = [];
  let paragraphBuffer = [];
  let tableBuffer = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    nodes.push(
      <div key={`p-${nodes.length}`} className="toeic-reading-block">
        {paragraphBuffer.map((line, index) => {
          const isLabel =
            /^(Questions\s+\d+-\d+\s+refer to the following|E-mail|E-mail \d+|Web Page|Web Page \d+|Survey Form|Article|Letter|Receipt|Review|Comments:|Directions:|Return Policy:|Date:|Time:|Event Web page:|Subject:|Attachment:|From:|To:|Dear |Sincerely,|Best regards,|All the best,|Name:|Company name:|E-mail address:|Phone:|Location and date of event:|What events are you interested in\?|Number of participants:|Additional information:|Application deadline:)/i.test(
              line,
            );
          const className = isLabel
            ? "toeic-reading-line label"
            : "toeic-reading-line";
          return (
            <div key={index} className={className}>
              {line}
            </div>
          );
        })}
      </div>,
    );
    paragraphBuffer = [];
  };

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map((line) =>
      line.split("|").map((cell) => cell.trim()),
    );
    nodes.push(
      <div key={`t-${nodes.length}`} className="toeic-reading-table-wrap">
        <table className="toeic-reading-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={rowIndex === 0 ? "is-head" : ""}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  };

  lines.forEach((line) => {
    if (line.includes("|")) {
      flushParagraph();
      tableBuffer.push(line);
      return;
    }

    flushTable();
    paragraphBuffer.push(line);
  });

  flushParagraph();
  flushTable();

  return nodes;
}

function getListeningCorrectIndex(question) {
  if (!question?.correctKey || !Array.isArray(question.options)) return -1;
  return question.options.findIndex(
    (option) => option.key === question.correctKey,
  );
}

function getEstimatedToeicPartScore(
  test,
  section,
  correctCount,
  gradableCount,
) {
  if (!test?.sections?.length || !section?.id || !gradableCount) return null;
  const totalQuestions = test.sections.reduce(
    (sum, item) => sum + (item.questions?.length || 0),
    0,
  );
  if (!totalQuestions) return null;

  const sectionQuestions = section.questions?.length || gradableCount;
  const sectionMaxScore = Math.round((495 * sectionQuestions) / totalQuestions);
  return Math.round((sectionMaxScore * correctCount) / gradableCount);
}

function ListeningTestSession({ test, section, onBack }) {
  const questions = section.questions || [];
  const gradableQuestions = questions.filter(
    (question) => getListeningCorrectIndex(question) !== -1,
  );
  const gradableCount = gradableQuestions.length;
  const hasAnswerKey = gradableCount > 0;
  const hasFullAnswerKey = gradableCount === questions.length;
  const durationSeconds =
    section.durationSeconds || Math.max(questions.length * 25, 10 * 60);
  const [phase, setPhase] = useState("running");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);
  const q = questions[qi];
  const currentAudioUrl = q?.audioUrl || section.audioUrl;
  const isMixedAudioSection = questions.some(
    (question) => question.audioUrl && question.audioUrl !== section.audioUrl,
  );

  useEffect(() => {
    setPhase("running");
    setQi(0);
    setAnswers({});
    setTimeLeft(durationSeconds);
    setShowSubmitConfirm(false);
    clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [section.id, durationSeconds]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

    const submit = async () => {
      clearInterval(timerRef.current);
      setPhase("submitting");
      setShowSubmitConfirm(false);

      try {
        const payload = {
          test_id: test.apiId,
          isPartial: true,
          answers: Object.keys(answers)
            .map((k) => {
              const selectedIndex = answers[k];
              let selectedLetter = null;
              if (selectedIndex >= 0) {
                selectedLetter = String.fromCharCode(65 + selectedIndex);
              }
              return {
                question_id: isGuestToeicMode()
                  ? k
                  : parseInt(k.replace("ft-", ""), 10),
                selected: selectedLetter,
              };
            })
            .filter((a) => a.selected !== null),
        };

        const data = isGuestToeicTestId(test.apiId)
          ? submitGuestToeicAnswers(payload)
          : await axiosClient.post("/toeic/submit", payload);

        if (data.correctAnswersMap) {
          questions.forEach((q) => {
            const answerKey = isGuestToeicTestId(test.apiId)
              ? q.id
              : parseInt(q.id.replace("ft-", ""), 10);
            q.correctKey = data.correctAnswersMap[answerKey];
          });
        }

      setPhase("result");
    } catch (e) {
      console.error("Submit failed", e);
      alert("Nộp bài thất bại. Vui lòng thử lại!");
      setPhase("running");
    }
  };

  const requestSubmit = () => {
    setShowSubmitConfirm(true);
  };

  if (!q) {
    return (
      <ListeningTestPlaceholder test={test} part={section} onBack={onBack} />
    );
  }

  if (phase === "submitting") {
    return (
      <div className="toeic-result">
        <h2>Đang nộp bài...</h2>
      </div>
    );
  }

  if (phase === "running") {
    const answered = Object.keys(answers).length;
    const isUrgent = timeLeft < 60;
    const prompt = getListeningTestPrompt(q.prompt);
    return (
      <div className="toeic-test-running">
        <div className="toeic-test-topbar">
          <div className="toeic-test-info">
            <span className="toeic-test-badge">Listening Test</span>
            <span className="toeic-test-badge">{test.name}</span>
            <span className="toeic-test-badge">{section.label}</span>
            <span className="toeic-test-progress">
              Câu {qi + 1} / {questions.length}
            </span>
            <span className="toeic-answered-count">{answered} đã trả lời</span>
          </div>
          <div className={`toeic-timer${isUrgent ? " urgent" : ""}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm1-10V7h-2v7h6v-2h-4Z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
          <button className="toeic-submit-early-btn" onClick={requestSubmit}>
            Nộp bài
          </button>
        </div>
        <div className="toeic-timer-bar">
          <div
            className="toeic-timer-fill"
            style={{
              width: `${(timeLeft / durationSeconds) * 100}%`,
              background: isUrgent
                ? "var(--red,#ef4444)"
                : "var(--blue,#3b82f6)",
            }}
          />
        </div>
        <div className="toeic-question-nav">
          <div className="toeic-nav-grid">
            {questions.map((question, index) => (
              <button
                key={question.id}
                className={`toeic-nav-cell${index === qi ? " active" : ""}${answers[question.id] !== undefined ? " answered" : ""}`}
                onClick={() => setQi(index)}
              >
                {question.displayNumber}
              </button>
            ))}
          </div>
        </div>
        <div className="toeic-test-question-area">
          <div className="toeic-test-part-label">
            {q.toeicPart}
            {q.groupIndex ? ` · Nhóm ${q.groupIndex}` : ""}
          </div>
          {q.imageUrl && (
            <div className="toeic-q-image">
              <img src={q.imageUrl} alt={`Question ${q.displayNumber}`} />
            </div>
          )}
          <div className="toeic-audio-shell">
            <div className="toeic-audio-row toeic-audio-row-spaced">
              <span className="toeic-audio-meta">
                {isMixedAudioSection
                  ? "Đang dùng audio cho nhóm câu hiện tại."
                  : "Audio của part này được dùng chung cho toàn bộ câu hỏi trong phần."}
              </span>
            </div>
            <audio
              key={currentAudioUrl}
              className="toeic-audio-player"
              controls
              preload="none"
              src={currentAudioUrl}
            >
              Trinh duyet nay khong ho tro audio.
            </audio>
          </div>
          {q.instruction && (
            <div className="toeic-test-q-text">{q.instruction}</div>
          )}
          {prompt && (
            <div className="toeic-test-q-text">
              <strong>{prompt}</strong>
            </div>
          )}
          <div className="toeic-options-grid">
            {q.options.map((opt, index) => (
              <button
                key={opt.key}
                className={`toeic-option${answers[q.id] === index ? " selected" : ""}`}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [q.id]: index }))
                }
              >
                <span className="toeic-option-letter">{opt.key}</span>
                {opt.text}
              </button>
            ))}
          </div>
          <div className="toeic-test-nav">
            <button
              disabled={qi === 0}
              onClick={() => setQi(qi - 1)}
              className="toeic-nav-btn"
            >
              ← Trước
            </button>
            {qi < questions.length - 1 ? (
              <button
                onClick={() => setQi(qi + 1)}
                className="toeic-nav-btn toeic-nav-next"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={requestSubmit}
                className="toeic-nav-btn toeic-nav-submit"
              >
                Nộp bài ✓
              </button>
            )}
          </div>
        </div>
        {showSubmitConfirm && (
          <div
            className="toeic-confirm-overlay"
            role="presentation"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <div
              className="toeic-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="toeic-submit-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="toeic-submit-confirm-title">Xác nhận nộp bài</h3>
              <p>
                Bạn đã trả lời {answered}/{questions.length} câu.
                {answered < questions.length
                  ? ` Vẫn còn ${questions.length - answered} câu chưa chọn.`
                  : ""}
              </p>
              <div className="toeic-confirm-actions">
                <button
                  className="toeic-nav-btn"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Làm tiếp
                </button>
                <button
                  className="toeic-nav-btn toeic-nav-next"
                  onClick={submit}
                >
                  Xác nhận nộp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const spentTime = durationSeconds - timeLeft;
  const correctCount = hasAnswerKey
    ? gradableQuestions.filter(
        (question) =>
          answers[question.id] === getListeningCorrectIndex(question),
      ).length
    : 0;
  const wrongCount = hasAnswerKey
    ? gradableQuestions.filter((question) => {
        const selectedIndex = answers[question.id];
        const correctIndex = getListeningCorrectIndex(question);
        return selectedIndex !== undefined && selectedIndex !== correctIndex;
      }).length
    : 0;
  const scorePercent = hasAnswerKey
    ? Math.round((correctCount / gradableCount) * 100)
    : Math.round((answeredCount / questions.length) * 100);
  const estimatedPartScore = hasAnswerKey
    ? getEstimatedToeicPartScore(test, section, correctCount, gradableCount)
    : null;
  const resultTitle = hasAnswerKey
    ? scorePercent >= 80
      ? "Làm rất tốt"
      : scorePercent >= 60
        ? "Tiếp tục phát huy"
        : "Tiếp tục luyện thêm"
    : answeredCount === questions.length
      ? "Hoàn thành part"
      : "Đã lưu bài làm";

  return (
    <div className="toeic-result">
      <div className="toeic-result-header">
        {timeLeft === 0 && (
          <div className="toeic-timeout-badge">
            Hết giờ - bài đã được nộp tự động
          </div>
        )}
        <div className="toeic-result-score-circle">
          <div className="toeic-score-inner">
            <span className="toeic-score-num">
              {hasAnswerKey
                ? `${correctCount}/${gradableCount}`
                : `${answeredCount}/${questions.length}`}
            </span>
            <span className="toeic-score-label">
              {hasAnswerKey ? "câu đúng" : "đã chọn"}
            </span>
          </div>
        </div>
        <h2>{resultTitle}</h2>
      </div>

      <div className="toeic-result-stats">
        <h3>Tổng quan bài làm</h3>
        <div className="toeic-part-scores">
          {hasAnswerKey && (
            <div className="toeic-part-score-card">
              <div className="toeic-part-score-header">
                <span className="toeic-part-score-name">Câu đúng</span>
                <span className="toeic-part-score-pct">{scorePercent}%</span>
              </div>
              <div className="toeic-part-score-bar">
                <div
                  className="toeic-part-score-fill"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              <span className="toeic-part-score-detail">
                {correctCount} đúng · {wrongCount} sai · {gradableCount} câu
                chấm được
              </span>
            </div>
          )}
          {hasAnswerKey && estimatedPartScore !== null && (
            <div className="toeic-part-score-card">
              <div className="toeic-part-score-header">
                <span className="toeic-part-score-name">
                  Điểm {section.label}
                </span>
                <span className="toeic-part-score-pct">
                  {estimatedPartScore}
                </span>
              </div>
              <div className="toeic-part-score-bar">
                <div
                  className="toeic-part-score-fill"
                  style={{
                    width: `${Math.min(100, (estimatedPartScore / 495) * 100)}%`,
                  }}
                />
              </div>
              <span className="toeic-part-score-detail">
                Điểm ước tính của bạn tại {section.label}
              </span>
            </div>
          )}
          <div className="toeic-part-score-card">
            <div className="toeic-part-score-header">
              <span className="toeic-part-score-name">Đã trả lời</span>
              <span className="toeic-part-score-pct">
                {Math.round((answeredCount / questions.length) * 100)}%
              </span>
            </div>
            <div className="toeic-part-score-bar">
              <div
                className="toeic-part-score-fill"
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="toeic-part-score-detail">
              {answeredCount}/{questions.length} câu
            </span>
          </div>
        </div>
      </div>

      {!hasAnswerKey && (
        <div className="toeic-feedback feedback-wrong toeic-listening-review-note">
          <strong>Đề này chưa có đáp án đúng trong file nguồn</strong>
          <p>
            Mình đã hoàn thiện full flow làm bài cho Đề Listening 1. Khi bổ sung
            answer key, màn hình này sẽ tự động mở thêm chấm điểm và review
            đúng-sai.
          </p>
        </div>
      )}
      {hasAnswerKey && !hasFullAnswerKey && (
        <div className="toeic-feedback feedback-wrong toeic-listening-review-note">
          <strong>Phần này mới chấm được một phần</strong>
          <p>
            Hiện có đáp án cho {gradableCount}/{questions.length} câu. Các câu
            còn lại trong nguồn `Đề Listening 2` vẫn thiếu transcript hoặc đáp
            án để chấm chắc chắn.
          </p>
        </div>
      )}

      <div className="toeic-result-review">
        <h3>{hasAnswerKey ? "Xem lại đáp án" : "Xem lại bài làm"}</h3>
        {questions.map((question, index) => {
          const selectedIndex = answers[question.id];
          const selectedOption =
            selectedIndex !== undefined
              ? question.options[selectedIndex]
              : null;
          const correctIndex = getListeningCorrectIndex(question);
          const correctOption =
            correctIndex !== -1 ? question.options[correctIndex] : null;
          const isGradable = correctIndex !== -1;
          const isCorrect = isGradable && selectedIndex === correctIndex;
          const previousQuestion = questions[index - 1];
          const showTranscriptBlock =
            Boolean(question.transcript) &&
            (!previousQuestion ||
              previousQuestion.transcript !== question.transcript);
          const reviewPrompt = getListeningTestPrompt(question.prompt);
          return (
            <div
              key={question.id}
              className={`toeic-review-item ${
                isGradable
                  ? isCorrect
                    ? "review-correct"
                    : selectedOption
                      ? "review-wrong"
                      : "review-unanswered"
                  : selectedOption
                    ? "review-correct"
                    : "review-unanswered"
              }`}
            >
              <div className="toeic-review-top">
                <span className="toeic-review-num">
                  Câu {question.displayNumber}
                </span>
                <span className="toeic-review-part">{question.toeicPart}</span>
                <span
                  className={`toeic-review-badge ${
                    isGradable
                      ? isCorrect
                        ? "badge-ok"
                        : selectedOption
                          ? "badge-err"
                          : "badge-unanswered"
                      : selectedOption
                        ? "badge-ok"
                        : "badge-unanswered"
                  }`}
                >
                  {isGradable
                    ? isCorrect
                      ? "✓ Đúng"
                      : selectedOption
                        ? "✗ Sai"
                        : "○ Bỏ trống"
                    : "Chưa chấm"}
                </span>
              </div>
              {question.imageUrl && (
                <div className="toeic-q-image">
                  <img
                    src={question.imageUrl}
                    alt={`Review ${question.displayNumber}`}
                  />
                </div>
              )}
              {showTranscriptBlock && (
                <div className="toeic-reading-passage">
                  {question.transcript}
                </div>
              )}
              {reviewPrompt && (
                <p className="toeic-review-q">
                  <strong>{reviewPrompt}</strong>
                </p>
              )}
              {isGradable && correctOption && (
                <p className="toeic-review-ans">
                  Đáp án đúng:{" "}
                  <strong>
                    {correctOption.key}. {correctOption.text}
                  </strong>
                </p>
              )}
              {selectedOption ? (
                <p className="toeic-review-user">
                  Bạn chọn: {selectedOption.key}. {selectedOption.text}
                </p>
              ) : (
                <p className="toeic-review-user">
                  Bạn chưa chọn đáp án cho câu này.
                </p>
              )}
              {!isGradable && (
                <p className="toeic-review-user">
                  Câu này hiện chưa có dữ liệu đáp án để chấm.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="toeic-result-actions">
        <button
          className="toeic-retry-btn"
          onClick={() => {
            setPhase("running");
            setAnswers({});
            setQi(0);
            setTimeLeft(durationSeconds);
          }}
        >
          Làm lại
        </button>
        <button className="toeic-back-btn" onClick={onBack}>
          ← Quay lại chọn part
        </button>
      </div>
    </div>
  );
}

function ReadingTestSession({ test, section, onBack }) {
  const questions = section.questions || [];
  const gradableQuestions = questions.filter(
    (question) => getListeningCorrectIndex(question) !== -1,
  );
  const gradableCount = gradableQuestions.length;
  const hasAnswerKey = gradableCount > 0;
  const hasFullAnswerKey = gradableCount === questions.length;
  const durationSeconds =
    section.durationSeconds || Math.max(questions.length * 40, 12 * 60);
  const [phase, setPhase] = useState("running");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);
  const q = questions[qi];

  useEffect(() => {
    setPhase("running");
    setQi(0);
    setAnswers({});
    setTimeLeft(durationSeconds);
    setShowSubmitConfirm(false);
    clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [section.id, durationSeconds]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

    const submit = async () => {
      clearInterval(timerRef.current);
      setPhase("submitting");
      setShowSubmitConfirm(false);

      try {
        const payload = {
          test_id: test.apiId,
          isPartial: true,
          answers: Object.keys(answers)
            .map((k) => {
              const selectedIndex = answers[k];
              let selectedLetter = null;
              if (selectedIndex >= 0) {
                selectedLetter = String.fromCharCode(65 + selectedIndex);
              }
              return {
                question_id: isGuestToeicMode()
                  ? k
                  : parseInt(k.replace("ft-", ""), 10),
                selected: selectedLetter,
              };
            })
            .filter((a) => a.selected !== null),
        };

        const data = isGuestToeicTestId(test.apiId)
          ? submitGuestToeicAnswers(payload)
          : await axiosClient.post("/toeic/submit", payload);

        if (data.correctAnswersMap) {
          questions.forEach((q) => {
            const answerKey = isGuestToeicTestId(test.apiId)
              ? q.id
              : parseInt(q.id.replace("ft-", ""), 10);
            q.correctKey = data.correctAnswersMap[answerKey];
          });
        }

      setPhase("result");
    } catch (e) {
      console.error("Submit failed", e);
      alert("Nộp bài thất bại. Vui lòng thử lại!");
      setPhase("running");
    }
  };

  const requestSubmit = () => {
    setShowSubmitConfirm(true);
  };

  if (!q) {
    return (
      <ReadingTestPlaceholder test={test} part={section} onBack={onBack} />
    );
  }

  if (phase === "submitting") {
    return (
      <div className="toeic-result">
        <h2>Đang nộp bài...</h2>
      </div>
    );
  }

  if (phase === "running") {
    const answered = Object.keys(answers).length;
    const isUrgent = timeLeft < 60;
    const prompt = getReadingTestPrompt(q.prompt);
    return (
      <div className="toeic-test-running">
        <div className="toeic-test-topbar">
          <div className="toeic-test-info">
            <span className="toeic-test-badge">Reading Test</span>
            <span className="toeic-test-badge">{test.name}</span>
            <span className="toeic-test-badge">{section.label}</span>
            <span className="toeic-test-progress">
              Câu {qi + 1} / {questions.length}
            </span>
            <span className="toeic-answered-count">{answered} đã trả lời</span>
          </div>
          <div className={`toeic-timer${isUrgent ? " urgent" : ""}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm1-10V7h-2v7h6v-2h-4Z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
          <button className="toeic-submit-early-btn" onClick={requestSubmit}>
            Nộp bài
          </button>
        </div>
        <div className="toeic-timer-bar">
          <div
            className="toeic-timer-fill"
            style={{
              width: `${(timeLeft / durationSeconds) * 100}%`,
              background: isUrgent
                ? "var(--red,#ef4444)"
                : "var(--blue,#3b82f6)",
            }}
          />
        </div>
        <div className="toeic-question-nav">
          <div className="toeic-nav-grid">
            {questions.map((question, index) => (
              <button
                key={question.id}
                className={`toeic-nav-cell${index === qi ? " active" : ""}${answers[question.id] !== undefined ? " answered" : ""}`}
                onClick={() => setQi(index)}
              >
                {question.displayNumber}
              </button>
            ))}
          </div>
        </div>
        <div className="toeic-test-question-area">
          <div className="toeic-test-part-label">
            {q.toeicPart}
            {q.groupIndex ? ` · Nhóm ${q.groupIndex}` : ""}
          </div>
          {q.sharedPassage && (
            <div className="toeic-reading-passage">
              {renderReadingPassageBlock(q.sharedPassage)}
            </div>
          )}
          {q.imageUrl && (
            <div className="toeic-q-image">
              <img src={q.imageUrl} alt={`Question ${q.displayNumber}`} />
            </div>
          )}
          {prompt && (
            <div className="toeic-test-q-text">
              <strong>{prompt}</strong>
            </div>
          )}
          <div className="toeic-options-grid">
            {q.options.map((opt, index) => (
              <button
                key={opt.key}
                className={`toeic-option${answers[q.id] === index ? " selected" : ""}`}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [q.id]: index }))
                }
              >
                <span className="toeic-option-letter">{opt.key}</span>
                {opt.text}
              </button>
            ))}
          </div>
          <div className="toeic-test-nav">
            <button
              disabled={qi === 0}
              onClick={() => setQi(qi - 1)}
              className="toeic-nav-btn"
            >
              ← Trước
            </button>
            {qi < questions.length - 1 ? (
              <button
                onClick={() => setQi(qi + 1)}
                className="toeic-nav-btn toeic-nav-next"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={requestSubmit}
                className="toeic-nav-btn toeic-nav-submit"
              >
                Nộp bài ✓
              </button>
            )}
          </div>
        </div>
        {showSubmitConfirm && (
          <div
            className="toeic-confirm-overlay"
            role="presentation"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <div
              className="toeic-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="toeic-submit-reading-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="toeic-submit-reading-confirm-title">Xác nhận nộp bài</h3>
              <p>
                Bạn đã trả lời {answered}/{questions.length} câu.
                {answered < questions.length
                  ? ` Vẫn còn ${questions.length - answered} câu chưa chọn.`
                  : ""}
              </p>
              <div className="toeic-confirm-actions">
                <button
                  className="toeic-nav-btn"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Làm tiếp
                </button>
                <button
                  className="toeic-nav-btn toeic-nav-next"
                  onClick={submit}
                >
                  Xác nhận nộp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const correctCount = hasAnswerKey
    ? gradableQuestions.filter(
        (question) =>
          answers[question.id] === getListeningCorrectIndex(question),
      ).length
    : 0;
  const wrongCount = hasAnswerKey
    ? gradableQuestions.filter((question) => {
        const selectedIndex = answers[question.id];
        const correctIndex = getListeningCorrectIndex(question);
        return selectedIndex !== undefined && selectedIndex !== correctIndex;
      }).length
    : 0;
  const scorePercent = hasAnswerKey
    ? Math.round((correctCount / gradableCount) * 100)
    : Math.round((answeredCount / questions.length) * 100);
  const estimatedPartScore = hasAnswerKey
    ? getEstimatedToeicPartScore(test, section, correctCount, gradableCount)
    : null;
  const resultTitle = hasAnswerKey
    ? scorePercent >= 80
      ? "Làm rất tốt"
      : scorePercent >= 60
        ? "Tiếp tục phát huy"
        : "Tiếp tục luyện thêm"
    : answeredCount === questions.length
      ? "Hoàn thành part"
      : "Đã lưu bài làm";

  return (
    <div className="toeic-result">
      <div className="toeic-result-header">
        {timeLeft === 0 && (
          <div className="toeic-timeout-badge">
            Hết giờ - bài đã được nộp tự động
          </div>
        )}
        <div className="toeic-result-score-circle">
          <div className="toeic-score-inner">
            <span className="toeic-score-num">
              {hasAnswerKey
                ? `${correctCount}/${gradableCount}`
                : `${answeredCount}/${questions.length}`}
            </span>
            <span className="toeic-score-label">
              {hasAnswerKey ? "câu đúng" : "đã chọn"}
            </span>
          </div>
        </div>
        <h2>{resultTitle}</h2>
      </div>

      <div className="toeic-result-stats">
        <h3>Tổng quan bài làm</h3>
        <div className="toeic-part-scores">
          {hasAnswerKey && (
            <div className="toeic-part-score-card">
              <div className="toeic-part-score-header">
                <span className="toeic-part-score-name">Câu đúng</span>
                <span className="toeic-part-score-pct">{scorePercent}%</span>
              </div>
              <div className="toeic-part-score-bar">
                <div
                  className="toeic-part-score-fill"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              <span className="toeic-part-score-detail">
                {correctCount} đúng · {wrongCount} sai · {gradableCount} câu
                chấm được
              </span>
            </div>
          )}
          {hasAnswerKey && estimatedPartScore !== null && (
            <div className="toeic-part-score-card">
              <div className="toeic-part-score-header">
                <span className="toeic-part-score-name">
                  Điểm {section.label}
                </span>
                <span className="toeic-part-score-pct">
                  {estimatedPartScore}
                </span>
              </div>
              <div className="toeic-part-score-bar">
                <div
                  className="toeic-part-score-fill"
                  style={{
                    width: `${Math.min(100, (estimatedPartScore / 495) * 100)}%`,
                  }}
                />
              </div>
              <span className="toeic-part-score-detail">
                Điểm ước tính của riêng part này để bạn tự cộng với các part còn
                lại
              </span>
            </div>
          )}
          <div className="toeic-part-score-card">
            <div className="toeic-part-score-header">
              <span className="toeic-part-score-name">Đã trả lời</span>
              <span className="toeic-part-score-pct">
                {Math.round((answeredCount / questions.length) * 100)}%
              </span>
            </div>
            <div className="toeic-part-score-bar">
              <div
                className="toeic-part-score-fill"
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="toeic-part-score-detail">
              {answeredCount}/{questions.length} câu
            </span>
          </div>
        </div>
      </div>

      {!hasAnswerKey && (
        <div className="toeic-feedback feedback-wrong toeic-listening-review-note">
          <strong>Đề này chưa có đáp án đúng trong file nguồn</strong>
          <p>
            Màn Reading Test đã hoàn thiện full flow làm bài và review. Khi bổ
            sung answer key, phần này sẽ tự động mở chấm điểm và review
            đúng-sai.
          </p>
        </div>
      )}
      {hasAnswerKey && !hasFullAnswerKey && (
        <div className="toeic-feedback feedback-wrong toeic-listening-review-note">
          <strong>Phần này mới chấm được một phần</strong>
          <p>
            Hiện có đáp án cho {gradableCount}/{questions.length} câu. Các câu
            còn lại vẫn đang chờ bổ sung từ bộ dữ liệu nguồn.
          </p>
        </div>
      )}

      <div className="toeic-result-review">
        <h3>{hasAnswerKey ? "Xem lại đáp án" : "Xem lại bài làm"}</h3>
        {questions.map((question, index) => {
          const selectedIndex = answers[question.id];
          const selectedOption =
            selectedIndex !== undefined
              ? question.options[selectedIndex]
              : null;
          const correctIndex = getListeningCorrectIndex(question);
          const correctOption =
            correctIndex !== -1 ? question.options[correctIndex] : null;
          const isGradable = correctIndex !== -1;
          const isCorrect = isGradable && selectedIndex === correctIndex;
          const previousQuestion = questions[index - 1];
          const showPassageBlock =
            Boolean(question.sharedPassage) &&
            (!previousQuestion ||
              previousQuestion.sharedPassage !== question.sharedPassage);
          const showImageBlock =
            Boolean(question.imageUrl) &&
            (!previousQuestion ||
              previousQuestion.imageUrl !== question.imageUrl);
          const reviewPrompt = getReadingTestPrompt(question.prompt);

          return (
            <div
              key={question.id}
              className={`toeic-review-item ${
                isGradable
                  ? isCorrect
                    ? "review-correct"
                    : selectedOption
                      ? "review-wrong"
                      : "review-unanswered"
                  : selectedOption
                    ? "review-correct"
                    : "review-unanswered"
              }`}
            >
              <div className="toeic-review-top">
                <span className="toeic-review-num">
                  Câu {question.displayNumber}
                </span>
                <span className="toeic-review-part">{question.toeicPart}</span>
                <span
                  className={`toeic-review-badge ${
                    isGradable
                      ? isCorrect
                        ? "badge-ok"
                        : selectedOption
                          ? "badge-err"
                          : "badge-unanswered"
                      : selectedOption
                        ? "badge-ok"
                        : "badge-unanswered"
                  }`}
                >
                  {isGradable
                    ? isCorrect
                      ? "✓ Đúng"
                      : selectedOption
                        ? "✗ Sai"
                        : "○ Bỏ trống"
                    : "Chưa chấm"}
                </span>
              </div>
              {showPassageBlock && (
                <div className="toeic-reading-passage">
                  {renderReadingPassageBlock(question.sharedPassage)}
                </div>
              )}
              {showImageBlock && (
                <div className="toeic-q-image">
                  <img
                    src={question.imageUrl}
                    alt={`Review ${question.displayNumber}`}
                  />
                </div>
              )}
              {reviewPrompt && (
                <p className="toeic-review-q">
                  <strong>{reviewPrompt}</strong>
                </p>
              )}
              {isGradable && correctOption && (
                <p className="toeic-review-ans">
                  Đáp án đúng:{" "}
                  <strong>
                    {correctOption.key}. {correctOption.text}
                  </strong>
                </p>
              )}
              {selectedOption ? (
                <p className="toeic-review-user">
                  Bạn chọn: {selectedOption.key}. {selectedOption.text}
                </p>
              ) : (
                <p className="toeic-review-user">
                  Bạn chưa chọn đáp án cho câu này.
                </p>
              )}
              {!isGradable && (
                <p className="toeic-review-user">
                  Câu này hiện chưa có dữ liệu đáp án để chấm.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="toeic-result-actions">
        <button
          className="toeic-retry-btn"
          onClick={() => {
            setPhase("running");
            setAnswers({});
            setQi(0);
            setTimeLeft(durationSeconds);
          }}
        >
          Làm lại
        </button>
        <button className="toeic-back-btn" onClick={onBack}>
          ← Quay lại chọn part
        </button>
      </div>
    </div>
  );
}

function PracticeSession({ part, onBack, backLabel = "← Quay lại" }) {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [showRes, setShowRes] = useState(false);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const practiceType = part.practiceType || "";
  const isListeningPractice = LISTENING_PRACTICE_TYPES.has(practiceType);
  const isReadingPractice = READING_PRACTICE_TYPES.has(practiceType);
  const isCustomPractice = isListeningPractice || isReadingPractice;
  const isPart1 = practiceType === "part1-picture";
  const isPart2 = practiceType === "part2-response";
  const isPart3 = practiceType === "part3-conversations";
  const isPart4 = practiceType === "part4-talks";
  const isPart5 = practiceType === "part5-reading";
  const isPart6 = practiceType === "part6-reading";
  const isPart7 = practiceType === "part7-reading";
  const isListening =
    isListeningPractice ||
    part.id.startsWith("part1") ||
    part.id.startsWith("part2") ||
    part.id.startsWith("part3") ||
    part.id.startsWith("part4");
  const q = part.questions[qi];
  const currentAudioUrl = q?.audioUrl || "";
  const xpAwardedRef = useRef(false);

  if (!q || !Array.isArray(q.options)) {
    return (
      <div className="toeic-practice-layout">
        <div className="toeic-question-card">
          <div className="toeic-qcard-header">
            <button
              className="toeic-back-link toeic-back-link-inline"
              onClick={onBack}
            >
              {backLabel}
            </button>
            <span className="toeic-qcard-part">
              {part.icon} {part.label || "Topic"} - {part.title}
            </span>
            <span className="toeic-qcard-counter">-</span>
          </div>
          <div className="toeic-feedback feedback-wrong">
            <strong>Không tải được câu hỏi</strong>
            <p>Dữ liệu của topic này đang bị thiếu hoặc sai định dạng.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (done && !xpAwardedRef.current) {
      xpToeicPartComplete();
      xpAwardedRef.current = true;
    }
  }, [done]);

  const answer = (idx) => {
    if (showRes) return;
    setSel(idx);
    setShowRes(true);
    setAnswers((prev) => ({ ...prev, [q.id]: idx }));
  };

  const next = () => {
    if (qi < part.questions.length - 1) {
      setQi(qi + 1);
      setSel(null);
      setShowRes(false);
    } else {
      setDone(true);
    }
  };

  const prev = () => {
    if (qi > 0) {
      setQi(qi - 1);
      setSel(null);
      setShowRes(false);
    }
  };

  const getInstruction = () => {
    if (isPart1)
      return "Quan sát hình, nghe bốn câu mô tả và chọn đáp án A/B/C/D đúng nhất.";
    if (isPart2)
      return "Nghe câu hỏi hoặc câu nói, rồi chọn phản hồi A/B/C phù hợp nhất.";
    if (isPart3)
      return "Nghe đoạn hội thoại ngắn rồi trả lời câu hỏi trắc nghiệm.";
    if (isPart4) return "Nghe bài nói ngắn rồi trả lời câu hỏi trắc nghiệm.";
    if (isPart5)
      return "Đọc câu chưa hoàn chỉnh và chọn đáp án đúng nhất để điền vào chỗ trống.";
    if (isPart6)
      return "Đọc đoạn văn ngắn và chọn đáp án phù hợp nhất với chỗ trống.";
    if (isPart7) return "Đọc passage và trả lời câu hỏi về nội dung bài đọc.";
    return "";
  };

  const renderOptionLabel = (opt, idx) => {
    if (isPart1 || isPart2) {
      return (
        <span className="toeic-option-code-only">
          Đáp án {String.fromCharCode(65 + idx)}
        </span>
      );
    }
    return opt;
  };

  if (done) {
    const correct = part.questions.filter(
      (qq) => answers[qq.id] === qq.correct,
    ).length;
    const pct = Math.round((correct / part.questions.length) * 100);
    const wrong = part.questions.filter(
      (qq) => answers[qq.id] !== undefined && answers[qq.id] !== qq.correct,
    );

    return (
      <div className="toeic-result">
        <div className="toeic-result-header">
          <div className="toeic-result-score-circle">
            <div className="toeic-score-inner">
              <span className="toeic-score-num">
                {correct}/{part.questions.length}
              </span>
              <span className="toeic-score-label">câu đúng</span>
            </div>
          </div>
          <h2>
            {pct >= 80
              ? "Excellent"
              : pct >= 60
                ? "Good job"
                : "Keep practicing"}
          </h2>
          <p>
            Bạn đạt {pct}% - {correct}/{part.questions.length} câu đúng
          </p>
        </div>

        <div className="toeic-result-review">
          <h3>Xem giải thích</h3>
          {part.questions.map((qq, i) => {
            const ua = answers[qq.id];
            const ok = ua === qq.correct;
            const skip = ua === undefined;
            return (
              <div
                key={qq.id}
                className={`toeic-review-item ${ok ? "review-correct" : skip ? "review-unanswered" : "review-wrong"}`}
              >
                <div className="toeic-review-top">
                  <span className="toeic-review-num">Câu {i + 1}</span>
                  <span
                    className={`toeic-review-badge ${ok ? "badge-ok" : skip ? "badge-unanswered" : "badge-err"}`}
                  >
                    {ok ? "✓ Đúng" : skip ? "○ Bỏ qua" : "✗ Sai"}
                  </span>
                </div>
                {(qq.imageTitle || qq.imageEmoji) && (
                  <p className="toeic-review-q">
                    <strong>
                      {qq.imageEmoji || ""} {qq.imageTitle || ""}
                    </strong>{" "}
                    {qq.imageDetail || ""}
                  </p>
                )}
                {qq.passage && <p className="toeic-review-q">{qq.passage}</p>}
                {(qq.question || qq.text) && (
                  <p className="toeic-review-q">
                    <strong>{qq.question || qq.text}</strong>
                  </p>
                )}
                {qq.audioText && (
                  <p className="toeic-review-q">{qq.audioText}</p>
                )}
                <p className="toeic-review-ans">
                  Đáp án đúng:{" "}
                  <strong>
                    {String.fromCharCode(65 + qq.correct)}.{" "}
                    {qq.options[qq.correct]}
                  </strong>
                </p>
                {!ok && ua !== undefined && (
                  <p className="toeic-review-user">
                    Bạn chọn: {String.fromCharCode(65 + ua)}. {qq.options[ua]}
                  </p>
                )}
                <p className="toeic-review-explain">💡 {qq.explanation}</p>
              </div>
            );
          })}
        </div>

        <div className="toeic-result-actions">
          {wrong.length > 0 && (
            <button
              className="toeic-retry-btn"
              onClick={() => {
                setDone(false);
                setQi(0);
                setSel(null);
                setShowRes(false);
                setAnswers({});
                xpAwardedRef.current = false;
              }}
            >
              ↻ Làm lại câu sai
            </button>
          )}
          <button className="toeic-back-btn" onClick={onBack}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="toeic-practice-layout">
      <div className="toeic-question-card">
        <div className="toeic-qcard-header">
          <button
            className="toeic-back-link toeic-back-link-inline"
            onClick={onBack}
          >
            {backLabel}
          </button>
          <span className="toeic-qcard-part">
            {part.icon} {part.label || "Topic"} - {part.title}
          </span>
          <span className="toeic-qcard-counter">
            {qi + 1} / {part.questions.length}
          </span>
        </div>

        {isListening && currentAudioUrl && (
          <div className="toeic-audio-shell">
            <audio
              key={currentAudioUrl}
              className="toeic-audio-player"
              controls
              preload="none"
              src={currentAudioUrl}
            >
              Trinh duyet nay khong ho tro audio.
            </audio>
          </div>
        )}

        {isListening && !currentAudioUrl && q.audioText && (
          <div className="toeic-audio-row">
            <button
              className="toeic-audio-btn"
              onClick={() => speakToeicText(q.audioText || "")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M2 16H5.889L11.183 20.332C11.273 20.405 11.385 20.445 11.5 20.445C11.776 20.445 12 20.221 12 19.945V4.055C12 3.94 11.96 3.828 11.887 3.739C11.713 3.525 11.399 3.493 11.185 3.668L5.889 8H2C1.448 8 1 8.448 1 9V15C1 15.552 1.448 16 2 16ZM23 12C23 15.292 21.554 18.246 19.262 20.262L17.845 18.844C19.776 17.194 21 14.74 21 12C21 9.26 19.776 6.806 17.845 5.156L19.262 3.738C21.554 5.754 23 8.708 23 12Z" />
              </svg>
              Nghe
            </button>
          </div>
        )}

        {q.imageUrl && (
          <div className="toeic-q-image">
            <img src={q.imageUrl} alt="Question figure" />
          </div>
        )}
        {q.imageEmoji && !q.imageUrl && (
          <div className="toeic-visual-card">
            <div className="toeic-visual-emoji">{q.imageEmoji}</div>
            <div className="toeic-visual-copy">
              <strong>{q.imageTitle}</strong>
              <p>{q.imageDetail}</p>
            </div>
          </div>
        )}

        <p className="toeic-qcard-stem">{getInstruction()}</p>
        {q.passage && <div className="toeic-reading-passage">{q.passage}</div>}
        {(isPart3 || isPart4 || isPart6 || isPart7) && q.question && (
          <p className="toeic-qcard-stem">
            <strong>{q.question}</strong>
          </p>
        )}
        {isPart5 && q.text && (
          <p className="toeic-qcard-stem">
            <strong>{q.text}</strong>
          </p>
        )}

        <div className="toeic-options-grid">
          {q.options.map((opt, idx) => {
            let cls = "toeic-option";
            if (showRes) {
              if (idx === q.correct) cls += " correct";
              else if (idx === sel) cls += " wrong";
            } else if (idx === sel) {
              cls += " selected";
            }

            return (
              <button key={idx} className={cls} onClick={() => answer(idx)}>
                <span className="toeic-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                {renderOptionLabel(opt, idx)}
              </button>
            );
          })}
        </div>

        {showRes && sel !== q.correct && (
          <div className="toeic-feedback feedback-wrong">
            <strong>✗ Sai rồi</strong>
            <p>
              Đáp án đúng:{" "}
              <strong>
                {String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}
              </strong>
            </p>
            <div className="toeic-practice-nav">
              {qi > 0 && (
                <button
                  className="toeic-practice-btn toeic-practice-prev"
                  onClick={prev}
                >
                  ← Câu trước
                </button>
              )}
              <button
                className="toeic-practice-btn toeic-practice-next"
                onClick={next}
              >
                {qi < part.questions.length - 1
                  ? "Câu tiếp theo →"
                  : "Xem kết quả →"}
              </button>
            </div>
          </div>
        )}

        {showRes && sel === q.correct && (
          <div className="toeic-practice-nav">
            {qi > 0 && (
              <button
                className="toeic-practice-btn toeic-practice-prev"
                onClick={prev}
              >
                ← Câu trước
              </button>
            )}
            <button
              className="toeic-practice-btn toeic-practice-next"
              onClick={next}
            >
              {qi < part.questions.length - 1
                ? "Câu tiếp theo →"
                : "Xem kết quả →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FullTestMode({ onBack, variants }) {
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [activeQuestions, setActiveQuestions] = useState([]);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) || variants[0];
  const allQs = activeQuestions || [];
  const partGroups = buildFullTestPartGroups(allQs);

  const [phase, setPhase] = useState("intro"); // intro, running, submitting, result
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [testResult, setTestResult] = useState(null);
  const [activeReviewPartKey, setActiveReviewPartKey] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);
  const xpAwardedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("toeic_fulltest_state");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.timeLeft > 0 && parsed.phase === "running") {
        setSelectedVariantId(parsed.variantId || "fulltest-a");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setActiveReviewPartKey(partGroups[0]?.partKey || "");
  }, [selectedVariantId]);

  useEffect(() => {
    if (phase !== "running") {
      setShowSubmitConfirm(false);
    }
  }, [phase, selectedVariantId]);

  useEffect(() => {
    if (phase === "running") {
      localStorage.setItem(
        "toeic_fulltest_state",
        JSON.stringify({
          phase,
          qi,
          answers,
          timeLeft,
          variantId: selectedVariantId,
        }),
      );
    }
  }, [phase, qi, answers, timeLeft, selectedVariantId]);

  useEffect(() => {
    if (phase === "result" && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      localStorage.removeItem("toeic_fulltest_state");
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const activePartGroup =
    partGroups.find(
      (group) => qi >= group.startIndex && qi <= group.endIndex,
    ) ||
    partGroups[0] ||
    null;
  const visibleQuestions = activePartGroup?.questions || allQs;

    const submit = async () => {
      clearInterval(timerRef.current);
      setPhase("submitting");
      setShowSubmitConfirm(false);

      try {
        const payload = {
          test_id: selectedVariant.apiId,
          answers: Object.keys(answers)
            .map((k) => {
              const selectedIndex = answers[k];
              let selectedLetter = null;
              if (selectedIndex >= 0) {
                selectedLetter = String.fromCharCode(65 + selectedIndex);
              }
              return {
                question_id: isGuestToeicMode()
                  ? k
                  : parseInt(k.replace("ft-", ""), 10),
                selected: selectedLetter,
              };
            })
            .filter((a) => a.selected !== null),
        };

        const data = isGuestToeicTestId(selectedVariant.apiId)
          ? submitGuestToeicAnswers(payload)
          : await axiosClient.post("/toeic/submit", payload);

        if (data.correctAnswersMap) {
          allQs.forEach((q) => {
            const answerKey = isGuestToeicTestId(selectedVariant.apiId)
              ? q.id
              : parseInt(q.id.replace("ft-", ""), 10);
            const correctKey = data.correctAnswersMap[answerKey];
            q.correctKey = correctKey;
            if (correctKey) {
              q.correct = correctKey.charCodeAt(0) - 65;
          }
        });
      }

      setTestResult(data);
      recordToeicFullTestProgress(data?.totalScore);
      setPhase("result");
    } catch (err) {
      console.error("Submit failed", err);
      alert("Nộp bài thất bại. Vui lòng thử lại!");
      setPhase("running");
    }
  };

  const requestSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const jumpToPartGroup = (group) => {
    if (!group) return;
    setQi(group.startIndex);
  };

  const getFullTestInstruction = (q) => {
    const partKey = getFullTestPartKey(q.partLabel);
    if (partKey === "PART 1")
      return "Quan sát hình và chọn câu mô tả đúng nhất.";
    if (partKey === "PART 2")
      return "Nghe câu hỏi hoặc câu nói và chọn phản hồi phù hợp nhất.";
    if (partKey === "PART 3")
      return "Nghe đoạn hội thoại và chọn đáp án đúng cho câu hỏi.";
    if (partKey === "PART 4")
      return "Nghe bài nói ngắn và chọn đáp án đúng cho câu hỏi.";
    if (partKey === "PART 5")
      return "Đọc câu chưa hoàn chỉnh và chọn đáp án đúng nhất để điền vào chỗ trống.";
    if (partKey === "PART 6")
      return "Đọc đoạn văn và chọn đáp án phù hợp nhất để hoàn thành nội dung.";
    if (partKey === "PART 7")
      return "Đọc bài đọc và chọn đáp án đúng cho câu hỏi.";
    return "";
  };

  const getFullTestPrompt = (q) => {
    return q.prompt || "";
  };

  const getFullTestPassage = (q) => {
    return q.passage || "";
  };

  const renderFullTestOptionLabel = (q, opt, idx) => {
    const partKey = getFullTestPartKey(q.partLabel);
    if (partKey === "PART 1" || partKey === "PART 2") {
      return (
        <span className="toeic-option-code-only">
          Đáp án {String.fromCharCode(65 + idx)}
        </span>
      );
    }
    return opt;
  };

  if (phase === "intro") {
    return (
      <div className="toeic-test-select">
        <button className="toeic-back-link" onClick={onBack}>
          ← Quay lại
        </button>
        <div className="toeic-test-hero">
          <div className="toeic-test-hero-icon">📋</div>
          <h2>Thi thử TOEIC</h2>
          <p>
            {allQs.length} câu hỏi · 120 phút · Mô phỏng bài thi TOEIC theo
            chuẩn ETS
          </p>
        </div>
        <div className="toeic-test-cards">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`toeic-test-card${selectedVariantId === variant.id ? " toeic-test-card-full" : ""}`}
            >
              <div className="toeic-test-card-icon">📝</div>
              <h3>{variant.name}</h3>
              <p>{variant.desc}</p>
              <ul className="toeic-test-features">
                <li>120 phút</li>
                <li>Listening + Reading</li>
              </ul>
              <button
                className="toeic-start-btn toeic-start-btn-full"
                onClick={async () => {
                  try {
                    if (isGuestToeicTestId(variant.apiId)) {
                      setActiveQuestions(variant.questions || []);
                    } else {
                      const res = await axiosClient.get(
                        `/toeic/tests/${variant.apiId}`,
                      );
                      const { normalizedQs } = mapApiTestToFrontendFormat(res);
                      setActiveQuestions(normalizedQs);
                    }
                    localStorage.removeItem("toeic_fulltest_state");
                    setSelectedVariantId(variant.id);
                    setPhase("running");
                    setQi(0);
                    setAnswers({});
                    setTimeLeft(120 * 60);
                    setShowSubmitConfirm(false);
                    xpAwardedRef.current = false;
                  } catch (e) {
                    console.error("Failed to load test", e);
                  }
                }}
              >
                Bắt đầu {variant.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "running") {
    const q = allQs[qi];
    const currentAudioUrl = q?.audioUrl || "";
    const answered = Object.keys(answers).length;
    const isUrgent = timeLeft < 120;
    return (
      <div className="toeic-test-running">
        <div className="toeic-test-topbar">
          <div className="toeic-test-info">
            <span className="toeic-test-badge">Full Test</span>
            <span className="toeic-test-badge">{selectedVariant.name}</span>
            <span className="toeic-test-badge toeic-test-progress-badge">
              Đã làm {answered} / {allQs.length}
            </span>
            <span className="toeic-answered-count">{answered} đã trả lời</span>
          </div>
          <div className={`toeic-timer${isUrgent ? " urgent" : ""}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm1-10V7h-2v7h6v-2h-4Z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
          <button className="toeic-submit-early-btn" onClick={requestSubmit}>
            Nộp bài
          </button>
        </div>
        <div className="toeic-timer-bar">
          <div
            className="toeic-timer-fill"
            style={{
              width: `${(timeLeft / (120 * 60)) * 100}%`,
              background: isUrgent
                ? "var(--red,#ef4444)"
                : "var(--blue,#3b82f6)",
            }}
          />
        </div>
        <div className="toeic-question-nav toeic-part-switch-nav">
          <div className="toeic-nav-grid toeic-part-switch-grid">
            {partGroups.map((group) => {
              const answeredInPart = group.questions.filter(
                (item) => answers[item.id] !== undefined,
              ).length;
              return (
                <button
                  key={`${group.skill}-${group.partKey}`}
                  className={`toeic-nav-cell toeic-part-switch-cell${activePartGroup?.partKey === group.partKey ? " active" : ""}`}
                  onClick={() => jumpToPartGroup(group)}
                  title={
                    FULL_TEST_PART_META[group.partKey]?.title || group.partLabel
                  }
                >
                  <span className="toeic-part-switch-name">
                    {group.partLabel}
                  </span>
                  <span className="toeic-part-switch-progress">
                    Đã làm {answeredInPart}/{group.questions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="toeic-question-nav">
          <div className="toeic-nav-grid">
            {visibleQuestions.map((qq) => {
              const absoluteIndex = allQs.findIndex(
                (item) => item.id === qq.id,
              );
              return (
                <button
                  key={qq.id}
                  className={`toeic-nav-cell${absoluteIndex === qi ? " active" : ""}${answers[qq.id] !== undefined ? " answered" : ""}`}
                  onClick={() => setQi(absoluteIndex)}
                >
                  {qq.displayNumber}
                </button>
              );
            })}
          </div>
        </div>
        <div className="toeic-test-question-area">
          <div className="toeic-test-part-label">
            {q.partLabel} · {q.skill}
          </div>
          {q.imageUrl && (
            <div className="toeic-q-image">
              <img src={q.imageUrl} alt={`Question ${q.displayNumber}`} />
            </div>
          )}
          {q.skill === "Listening" && currentAudioUrl && (
            <div className="toeic-audio-shell">
              <audio
                key={currentAudioUrl}
                className="toeic-audio-player"
                controls
                preload="none"
                src={currentAudioUrl}
              >
                Trinh duyet nay khong ho tro audio.
              </audio>
            </div>
          )}
          <div className="toeic-test-q-text">{getFullTestInstruction(q)}</div>
          {getFullTestPassage(q) &&
            !shouldHideListeningTranscriptInFullTest(q) && (
              <div className="toeic-reading-passage">
                {q.skill === "Reading"
                  ? renderReadingPassageBlock(getFullTestPassage(q))
                  : getFullTestPassage(q)}
              </div>
            )}
          {getFullTestPrompt(q) && (
            <div className="toeic-test-q-text">
              <strong>{getFullTestPrompt(q)}</strong>
            </div>
          )}
          <div className="toeic-options-grid">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`toeic-option${answers[q.id] === idx ? " selected" : ""}`}
                onClick={() => setAnswers({ ...answers, [q.id]: idx })}
              >
                <span className="toeic-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                {renderFullTestOptionLabel(q, opt, idx)}
              </button>
            ))}
          </div>
          <div className="toeic-test-nav">
            <button
              disabled={qi === 0}
              onClick={() => setQi(qi - 1)}
              className="toeic-nav-btn"
            >
              ← Trước
            </button>
            {qi < allQs.length - 1 ? (
              <button
                onClick={() => setQi(qi + 1)}
                className="toeic-nav-btn toeic-nav-next"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={requestSubmit}
                className="toeic-nav-btn toeic-nav-submit"
              >
                Nộp bài ✓
              </button>
            )}
          </div>
        </div>
        {showSubmitConfirm && (
          <div
            className="toeic-confirm-overlay"
            role="presentation"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <div
              className="toeic-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="toeic-submit-fulltest-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="toeic-submit-fulltest-confirm-title">Xác nhận nộp bài</h3>
              <p>
                Bạn đã trả lời {answered}/{allQs.length} câu.
                {answered < allQs.length
                  ? ` Vẫn còn ${allQs.length - answered} câu chưa chọn.`
                  : ""}
              </p>
              <div className="toeic-confirm-actions">
                <button
                  className="toeic-nav-btn"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Làm tiếp
                </button>
                <button
                  className="toeic-nav-btn toeic-nav-next"
                  onClick={submit}
                >
                  Xác nhận nộp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="toeic-result">
        <h2>Đang nộp bài...</h2>
      </div>
    );
  }

  const lQs = allQs.filter((q) => q.skill === "Listening");
  const rQs = allQs.filter((q) => q.skill === "Reading");

  const score = testResult
    ? {
        listening: testResult.listeningScore,
        reading: testResult.readingScore,
        total: testResult.totalScore,
      }
    : { listening: 0, reading: 0, total: 0 };

  const totalCorrect = testResult
    ? testResult.listeningCorrect + testResult.readingCorrect
    : 0;
  const pct = Math.round((totalCorrect / allQs.length) * 100) || 0;

  const byPart = {};

  allQs.forEach((q) => {
    if (!byPart[q.partLabel]) byPart[q.partLabel] = { correct: 0, total: 0 };
    byPart[q.partLabel].total += 1;
    if (answers[q.id] === q.correct) byPart[q.partLabel].correct += 1;
  });

  const reviewQuestions = activeReviewPartKey
    ? allQs.filter(
        (question) =>
          getFullTestPartKey(question.partLabel) === activeReviewPartKey,
      )
    : allQs;

  return (
    <div className="toeic-result">
      <div className="toeic-result-header">
        {timeLeft === 0 && (
          <div className="toeic-timeout-badge">
            Hết giờ - Bài đã được nộp tự động
          </div>
        )}
        <div className="toeic-result-score-circle">
          <div className="toeic-score-inner">
            <span className="toeic-score-num">{score.total}</span>
            <span className="toeic-score-label">điểm TOEIC</span>
          </div>
        </div>
        <h2>
          {pct >= 80 ? "Excellent" : pct >= 60 ? "Good job" : "Keep practicing"}
        </h2>
        <div className="toeic-fulltest-summary">
          <div className="toeic-fulltest-summary-card">
            <span className="toeic-fulltest-summary-label">Listening</span>
            <strong className="toeic-fulltest-summary-value">
              {score.listening}
            </strong>
          </div>
          <div className="toeic-fulltest-summary-card">
            <span className="toeic-fulltest-summary-label">Reading</span>
            <strong className="toeic-fulltest-summary-value">
              {score.reading}
            </strong>
          </div>
          <div className="toeic-fulltest-summary-card toeic-fulltest-summary-card-accent">
            <span className="toeic-fulltest-summary-label">Tổng điểm</span>
            <strong className="toeic-fulltest-summary-value">
              {score.total}/990
            </strong>
          </div>
          <div className="toeic-fulltest-summary-card">
            <span className="toeic-fulltest-summary-label">Độ chính xác</span>
            <strong className="toeic-fulltest-summary-value">
              {totalCorrect}/{allQs.length} câu ({pct}%)
            </strong>
          </div>
          <div className="toeic-fulltest-summary-card">
            <span className="toeic-fulltest-summary-label">
              Thời gian làm bài
            </span>
            <strong className="toeic-fulltest-summary-value">
              {formatTime(120 * 60 - timeLeft)}
            </strong>
          </div>
        </div>
      </div>

      <div className="toeic-result-stats">
        <h3>Điểm theo part</h3>
        <div className="toeic-part-scores">
          {Object.entries(byPart).map(([partName, detail]) => {
            const pp = Math.round((detail.correct / detail.total) * 100);
            return (
              <div key={partName} className="toeic-part-score-card">
                <div className="toeic-part-score-header">
                  <span className="toeic-part-score-name">{partName}</span>
                  <span className="toeic-part-score-pct">{pp}%</span>
                </div>
                <div className="toeic-part-score-bar">
                  <div
                    className="toeic-part-score-fill"
                    style={{ width: `${pp}%` }}
                  />
                </div>
                <span className="toeic-part-score-detail">
                  {detail.correct}/{detail.total} câu
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="toeic-result-review">
        <h3>
          Xem giải thích{activeReviewPartKey ? ` · ${activeReviewPartKey}` : ""}
        </h3>
        <div className="toeic-review-part-tabs">
          <div className="toeic-review-part-grid">
            {partGroups.map((group) => (
              <button
                key={`review-${group.partKey}`}
                type="button"
                className={`toeic-review-part-btn${activeReviewPartKey === group.partKey ? " active" : ""}`}
                onClick={() => setActiveReviewPartKey(group.partKey)}
                title={
                  FULL_TEST_PART_META[group.partKey]?.title || group.partLabel
                }
              >
                {group.partLabel}
              </button>
            ))}
          </div>
        </div>
        {reviewQuestions.map((q) => {
          const ua = answers[q.id];
          const ok = ua === q.correct;
          const skip = ua === undefined;
          return (
            <div
              key={q.id}
              className={`toeic-review-item ${ok ? "review-correct" : skip ? "review-unanswered" : "review-wrong"}`}
            >
              <div className="toeic-review-top">
                <span className="toeic-review-num">Câu {q.displayNumber}</span>
                <span className="toeic-review-part">{q.partLabel}</span>
                <span
                  className={`toeic-review-badge ${ok ? "badge-ok" : skip ? "badge-unanswered" : "badge-err"}`}
                >
                  {ok ? "✓ Đúng" : skip ? "○ Bỏ qua" : "✗ Sai"}
                </span>
              </div>
              {q.imageUrl && (
                <div className="toeic-q-image">
                  <img src={q.imageUrl} alt={`Review ${q.displayNumber}`} />
                </div>
              )}
              {q.passage && !shouldHideListeningTranscriptInFullTest(q) && (
                <p className="toeic-review-q">
                  {q.skill === "Reading"
                    ? formatReadingPassage(q.passage)
                    : q.passage}
                </p>
              )}
              {q.prompt && (
                <p className="toeic-review-q">
                  <strong>{q.prompt}</strong>
                </p>
              )}
              <p className="toeic-review-ans">
                Đáp án:{" "}
                <strong>
                  {String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}
                </strong>
              </p>
              {!ok && ua !== undefined && (
                <p className="toeic-review-user">
                  Bạn chọn: {String.fromCharCode(65 + ua)}. {q.options[ua]}
                </p>
              )}
              {q.explanation && (
                <p className="toeic-review-explain">💡 {q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="toeic-result-actions">
        <button
          className="toeic-retry-btn"
          onClick={() => {
            setPhase("intro");
            setAnswers({});
            setQi(0);
            setTimeLeft(120 * 60);
            xpAwardedRef.current = false;
          }}
        >
          ↻ Làm lại
        </button>
        <button className="toeic-back-btn" onClick={onBack}>
          Luyện part khác
        </button>
      </div>
    </div>
  );
}

function getToeicBand(score) {
  if (score >= 855) return { color: "#eab308", bg: "#fef9c3", text: "#854d0e", label: "Vàng (Cận bản xứ / Xuất sắc)", band: "Gold" };
  if (score >= 730) return { color: "#3b82f6", bg: "#dbeafe", text: "#1e40af", label: "Xanh dương (Chuyên nghiệp)", band: "Blue" };
  if (score >= 470) return { color: "#22c55e", bg: "#dcfce7", text: "#166534", label: "Xanh lá (Trung cấp)", band: "Green" };
  if (score >= 220) return { color: "#a16207", bg: "#fef3c7", text: "#78350f", label: "Nâu (Sơ cấp)", band: "Brown" };
  return { color: "#f97316", bg: "#ffedd5", text: "#9a3412", label: "Cam (Mất gốc / Bắt đầu)", band: "Orange" };
}

const getRecommendedResources = (score) => {
  if (score >= 850) {
    return [
      {
        title: "Hackers TOEIC 1000 Vol 3",
        desc: "Bộ đề thi thử TOEIC mức độ cực khó để cọ xát và rèn luyện tâm lý phòng thi.",
        tag: "Nâng cao (Target 850+)",
        icon: "🏆",
        link: "/dashboard/courses/toeic-hackers",
        fallbackLink: "/dashboard/courses",
        courseMatchers: ["toeic-hackers", "hackers toeic 1000 vol 3", "hackers toeic vocabulary"],
        linkLabel: "Học từ vựng Hackers"
      },
      {
        title: "ETS 2024 Advanced Tests",
        desc: "Bộ đề nâng cao mới nhất được cập nhật bám sát đề thi thực tế năm 2024.",
        tag: "Chuyên sâu (Target 900+)",
        icon: "🔥",
        link: "/dashboard/toeic",
        linkLabel: "Luyện đề Full Test"
      }
    ];
  }
  if (score >= 650) {
    return [
      {
        title: "Hackers TOEIC Vocabulary",
        desc: "Từ vựng nâng cao chuyên sâu thường xuất hiện trong các bài đọc Part 7 dài.",
        tag: "Phù hợp với bạn",
        icon: "📖",
        link: "/dashboard/courses/toeic-hackers",
        fallbackLink: "/dashboard/courses",
        courseMatchers: ["toeic-hackers", "hackers toeic vocabulary", "hackers toeic 1000 vol 3"],
        linkLabel: "Học từ vựng Hackers"
      },
      {
        title: "ETS 2023 Practice Tests",
        desc: "Luyện đề thi thử có độ khó tương đương 99% đề thi thật tại IIG.",
        tag: "Thực chiến",
        icon: "⚡",
        link: "/dashboard/toeic",
        linkLabel: "Luyện đề Full Test"
      }
    ];
  }
  if (score >= 450) {
    return [
      {
        title: "Starter TOEIC Vocabulary",
        desc: "Bộ từ vựng khởi động nâng cao khả năng nghe hiểu Part 3 & đọc hiểu Part 6.",
        tag: "Phù hợp với bạn",
        icon: "🌱",
        link: "/dashboard/courses/toeic-starter",
        fallbackLink: "/dashboard/courses",
        courseMatchers: ["toeic-starter", "starter toeic vocabulary"],
        linkLabel: "Học từ vựng Starter"
      },
      {
        title: "600 Essential Words",
        desc: "Bộ 50 chủ đề từ vựng cốt lõi bắt buộc phải biết của kỳ thi TOEIC.",
        tag: "Khuyên dùng",
        icon: "📕",
        link: "/dashboard/courses/toeic-basic",
        fallbackLink: "/dashboard/courses/toeic-basic",
        courseMatchers: ["toeic-basic", "600 essential words", "600 essential words for the toeic"],
        linkLabel: "Xem 50 bài học"
      }
    ];
  }
  return [
    {
      title: "Very Easy TOEIC Vocabulary",
      desc: "Từ vựng căn bản cực kỳ dễ học, dễ nhớ dành cho người mất gốc tiếng Anh.",
      tag: "Phù hợp với bạn",
      icon: "🐣",
      link: "/dashboard/courses/toeic-very-easy",
      fallbackLink: "/dashboard/courses/very-easy-toeic",
      courseMatchers: ["toeic-very-easy", "very easy toeic vocabulary"],
      linkLabel: "Học từ vựng cơ bản"
    },
    {
      title: "600 Essential Words",
      desc: "Bộ từ vựng nền tảng giúp bạn làm quen ngữ cảnh làm việc văn phòng.",
      tag: "Nền tảng",
      icon: "📕",
      link: "/dashboard/courses/toeic-basic",
      fallbackLink: "/dashboard/courses/toeic-basic",
      courseMatchers: ["toeic-basic", "600 essential words", "600 essential words for the toeic"],
      linkLabel: "Xem 50 bài học"
    }
  ];
};

function ToeicDashboard({ onStartTest, onStartPractice }) {
  const { user } = useAuth();
  const shouldUseGuestOnly = user?.role === "guest" || !isAuthenticatedUser(user);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [targetScore, setTargetScore] = useState(() => {
    return parseInt(localStorage.getItem("toeic_target_score") || "650", 10);
  });
  const [showEditTarget, setShowEditTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(targetScore);

  useEffect(() => {
    if (shouldUseGuestOnly) {
      setHistory(readGuestToeicHistory());
      setLoading(false);
    } else {
    axiosClient.get("/toeic/history")
      .then((res) => {
        const serverHistory = Array.isArray(res) ? res : [];
        const guestHistory = readGuestToeicHistory();
        setHistory([...guestHistory, ...serverHistory]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHistory(readGuestToeicHistory());
        setLoading(false);
      });
    }

    axiosClient.get("/courses")
      .then((res) => {
        const data = res.data || res;
        const nextCourses = Array.isArray(data) ? data : [];
        setCourses(mergeGuestReadyCourses(nextCourses));
      })
      .catch((err) => {
        console.error("Fetch courses for TOEIC recommendations error:", err);
        setCourses(mergeGuestReadyCourses([]));
      });
    }, [shouldUseGuestOnly, user]);

  const handleSaveTarget = () => {
    const val = Math.max(10, Math.min(990, tempTarget));
    setTargetScore(val);
    localStorage.setItem("toeic_target_score", val.toString());
    setShowEditTarget(false);
  };

  const latestRecord = history[0] || null;
  const currentScore = latestRecord ? latestRecord.total_score : 0;
  const recommendedResources = useMemo(
    () => getRecommendedResources(currentScore).map((resource) => ({
      ...resource,
      resolvedLink: resolveRecommendedResourceLink(resource, courses),
    })),
    [currentScore, courses],
  );
  const currentBand = getToeicBand(currentScore);
  const targetBand = getToeicBand(targetScore);
  const percent = Math.min(100, Math.round((currentScore / targetScore) * 100));

  let readingAvg = 0;
  let listeningAvg = 0;
  if (history.length > 0) {
    const sumR = history.reduce((acc, r) => acc + r.reading_score, 0);
    const sumL = history.reduce((acc, r) => acc + r.listening_score, 0);
    readingAvg = Math.round(sumR / history.length);
    listeningAvg = Math.round(sumL / history.length);
  }

  return (
    <div className="toeic-dashboard-view">
      <div className="toeic-db-grid">
        {/* Left Column: Stats & Target */}
        <div className="toeic-db-card toeic-target-card">
          <div className="toeic-card-header">
            <h3>Mục Tiêu & Tiến Độ</h3>
            <button className="toeic-edit-btn" onClick={() => { setTempTarget(targetScore); setShowEditTarget(true); }}>
              ✏️ Sửa mục tiêu
            </button>
          </div>

          {showEditTarget ? (
            <div className="toeic-target-edit-box">
              <label>Nhập điểm mục tiêu (10 - 990):</label>
              <div className="toeic-target-input-row">
                <input
                  type="number"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(parseInt(e.target.value, 10) || 0)}
                  min="10"
                  max="990"
                />
                <button className="toeic-save-btn" onClick={handleSaveTarget}>Lưu</button>
                <button className="toeic-cancel-btn" onClick={() => setShowEditTarget(false)}>Hủy</button>
              </div>
            </div>
          ) : null}

          <div className="toeic-progress-circle-area">
            <div className="toeic-progress-info">
              <div className="toeic-current-score-label">Điểm hiện tại</div>
              <div className="toeic-current-score-val" style={{ color: currentBand.color }}>
                {currentScore} <span className="toeic-score-slash">/ 990</span>
              </div>
              <div className="toeic-percent-label">Hoàn thành {percent}% mục tiêu</div>
            </div>
            
            <div className="toeic-progress-bar-container">
              <div className="toeic-progress-bar-track">
                <div 
                  className="toeic-progress-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, Math.round((currentScore / 990) * 100))}%`,
                    background: `linear-gradient(90deg, ${currentBand.color}, #3b82f6)` 
                  }} 
                />
                <div 
                  className="toeic-target-marker-pin"
                  style={{ left: `${Math.min(100, Math.round((targetScore / 990) * 100))}%` }}
                  title={`Mục tiêu: ${targetScore}`}
                />
              </div>
              <div className="toeic-progress-bar-markers">
                <span className="toeic-marker-start">0</span>
                <span 
                  className="toeic-target-marker-label"
                  style={{ left: `${Math.min(100, Math.round((targetScore / 990) * 100))}%` }}
                >
                  🎯 {targetScore}
                </span>
                <span className="toeic-marker-end">990</span>
              </div>
            </div>
          </div>

          <div className="toeic-level-details">
            <div className="toeic-level-row">
              <span className="toeic-level-label">Trình độ hiện tại:</span>
              <span className="toeic-level-badge" style={{ backgroundColor: currentBand.bg, color: currentBand.text }}>
                {currentBand.label}
              </span>
            </div>
            <div className="toeic-level-row">
              <span className="toeic-level-label">Mục tiêu hướng tới:</span>
              <span className="toeic-level-badge" style={{ backgroundColor: targetBand.bg, color: targetBand.text }}>
                {targetBand.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recommendations & Strength */}
        <div className="toeic-db-card toeic-analysis-card">
          <h3>Phân Tích Kỹ Năng</h3>
          {history.length === 0 ? (
            <div className="toeic-empty-analysis">
              <p>Bạn chưa hoàn thành bài thi thử Full Test nào để hệ thống phân tích.</p>
              <button className="toeic-action-btn" onClick={onStartTest}>Làm đề thi thử ngay</button>
            </div>
          ) : (
            <div className="toeic-analysis-content">
              <div className="toeic-skill-split">
                <div className="toeic-skill-progress">
                  <div className="toeic-skill-header">
                    <span>🎧 Listening (Trung bình: {listeningAvg})</span>
                    <span>{Math.round(listeningAvg / 4.95)}%</span>
                  </div>
                  <div className="toeic-skill-track">
                    <div className="toeic-skill-fill listening" style={{ width: `${(listeningAvg / 495) * 100}%` }} />
                  </div>
                </div>

                <div className="toeic-skill-progress">
                  <div className="toeic-skill-header">
                    <span>📖 Reading (Trung bình: {readingAvg})</span>
                    <span>{Math.round(readingAvg / 4.95)}%</span>
                  </div>
                  <div className="toeic-skill-track">
                    <div className="toeic-skill-fill reading" style={{ width: `${(readingAvg / 495) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="toeic-tip-box">
                <h4>💡 Lời khuyên cho lộ trình học:</h4>
                {listeningAvg < readingAvg ? (
                  <p>Điểm Listening của bạn đang thấp hơn Reading. Hãy luyện nghe nhiều hơn ở các phần dễ lấy điểm như <strong>Part 1 & Part 2</strong> để bứt phá điểm số nhanh chóng.</p>
                ) : (
                  <p>Điểm Reading của bạn đang thấp hơn Listening. Bạn nên chú ý cải thiện từ vựng và quản lý thời gian tốt hơn ở <strong>Part 5 & Part 6</strong>, và cố gắng đọc lướt nhanh hơn ở Part 7.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Resources */}
      <div className="toeic-db-card toeic-resources-card">
        <h3>📚 Giáo Trình & Tài Liệu Khuyên Dùng</h3>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "-8px 0 16px 0" }}>
          Được cá nhân hóa dựa trên điểm số hiện tại của bạn (<strong>{currentScore} điểm</strong>)
        </p>
        <div className="toeic-resources-grid">
          {recommendedResources.map((res, idx) => (
            <Link key={idx} to={res.resolvedLink} className="toeic-resource-item-card">
              <span className="toeic-resource-item-icon">{res.icon}</span>
              <div className="toeic-resource-item-body">
                <div className="toeic-resource-item-header">
                  <h4>{res.title}</h4>
                  <span className="toeic-resource-item-badge">{res.tag}</span>
                </div>
                <p>{res.desc}</p>
                <span className="toeic-resource-item-link">
                  {res.linkLabel} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Score History Section */}
      <div className="toeic-db-card toeic-history-card">
        <h3>Lịch Sử Thi Thử</h3>
        {loading ? (
          <div className="toeic-loading-text">Đang tải lịch sử...</div>
        ) : history.length === 0 ? (
          <div className="toeic-empty-history">
            <p>Lịch sử thi của bạn hiện tại đang trống.</p>
            <button className="toeic-action-btn" onClick={onStartTest}>Làm bài thi thử</button>
          </div>
        ) : (
          <div className="toeic-table-wrapper">
            <table className="toeic-history-table">
              <thead>
                <tr>
                  <th>Đề thi</th>
                  <th>Ngày làm bài</th>
                  <th>Điểm Nghe</th>
                  <th>Điểm Đọc</th>
                  <th>Tổng Điểm</th>
                  <th>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const band = getToeicBand(record.total_score);
                  const dateStr = new Date(record.created_at).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  return (
                    <tr key={record.id}>
                      <td><strong>{record.test_title}</strong></td>
                      <td>{dateStr}</td>
                      <td className="toeic-cell-listening">{record.listening_score}</td>
                      <td className="toeic-cell-reading">{record.reading_score}</td>
                      <td className="toeic-cell-total"><strong>{record.total_score}</strong></td>
                      <td>
                        <span className="toeic-table-badge" style={{ backgroundColor: band.bg, color: band.text }}>
                          {band.band}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveWordModal({ isOpen, onClose, defaultWord = "" }) {
  const { customCourses, loading, addWordToTopic } = useCustomCourses();
  const [word, setWord] = useState(defaultWord);
  const [wordtype, setWordtype] = useState("n.");
  const [mean, setMean] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setWord(defaultWord);
    setWordtype("n.");
    setMean("");
  }, [isOpen, defaultWord]);

  useEffect(() => {
    if (!isOpen) return;
    if (customCourses.length === 0) {
      setSelectedTopicId("");
      return;
    }

    setSelectedTopicId((current) => {
      if (
        current &&
        customCourses.some((topic) => String(topic.id) === String(current))
      ) {
        return current;
      }
      return String(customCourses[0].id);
    });
  }, [customCourses, isOpen]);

  if (!isOpen) return null;

  const selectedTopic = customCourses.find(
    (topic) => String(topic.id) === String(selectedTopicId),
  );

  const handleSave = async () => {
    if (!word.trim()) {
      alert("Vui lòng nhập từ vựng.");
      return;
    }
    if (!mean.trim()) {
      alert("Vui lòng nhập nghĩa của từ.");
      return;
    }

    if (!selectedTopicId) {
      alert("Vui lòng chọn bộ từ vựng cá nhân.");
      return;
    }

    setSaving(true);
    try {
      const result = await addWordToTopic(selectedTopicId, {
        word: word.trim(),
        mean: mean.trim(),
        wordtype: wordtype || "",
        language: "en",
      });

      if (result?.error) {
        alert(result.error);
        return;
      }

      alert(`Đã thêm "${word.trim()}" vào "${selectedTopic?.title || "bộ từ vựng"}".`);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Không thể thêm từ vào bộ từ vựng cá nhân. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="toeic-confirm-overlay" style={{ zIndex: 1000 }}>
      <div className="toeic-confirm-modal toeic-vocab-modal" style={{ width: "min(100%, 480px)" }}>
        <div className="toeic-card-header" style={{ marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Thêm vào bộ từ vựng cá nhân</h3>
          <button className="toeic-close-modal-btn" onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }}>×</button>
        </div>

        <div className="toeic-vocab-form">
          <div className="toeic-form-group">
            <label>Từ / Cụm từ <span style={{ color: "#ef4444" }}>*</span></label>
            <input 
              type="text" 
              placeholder="Ví dụ: contract, establish..." 
              value={word} 
              onChange={(e) => setWord(e.target.value)} 
            />
          </div>

          <div className="toeic-form-group">
            <label>Nghĩa <span style={{ color: "#ef4444" }}>*</span></label>
            <input 
              type="text" 
              placeholder="Ví dụ: hợp đồng, thành lập..." 
              value={mean} 
              onChange={(e) => setMean(e.target.value)} 
            />
          </div>

          <div className="toeic-form-group">
            <label>Loại từ</label>
            <select value={wordtype} onChange={(e) => setWordtype(e.target.value)}>
              <option value="n.">Danh từ (n.)</option>
              <option value="v.">Động từ (v.)</option>
              <option value="adj.">Tính từ (adj.)</option>
              <option value="adv.">Trạng từ (adv.)</option>
              <option value="prep.">Giới từ (prep.)</option>
              <option value="phrase">Cụm từ (phrase)</option>
            </select>
          </div>

          <div className="toeic-form-group">
            <label>Bộ từ vựng cá nhân <span style={{ color: "#ef4444" }}>*</span></label>
            {loading ? (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Đang tải danh sách bộ từ vựng...</div>
            ) : customCourses.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#f59e0b", fontWeight: "600" }}>
                Chưa có bộ từ vựng cá nhân nào. Hãy tạo bộ từ trong mục khóa học cá nhân trước rồi quay lại thêm từ.
              </div>
            ) : (
              <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)}>
                {customCourses.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title} ({topic.words?.length || topic.word_count || 0} từ)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="toeic-confirm-actions" style={{ marginTop: "24px" }}>
          <button className="toeic-nav-btn" onClick={onClose} disabled={saving}>Hủy</button>
          <button 
            className="toeic-nav-btn toeic-nav-next" 
            onClick={handleSave} 
            disabled={saving || loading || customCourses.length === 0}
          >
            {saving ? "Đang thêm..." : "Thêm vào bộ từ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TOEIC() {
  const { user } = useAuth();
  const isGuestMode = user?.role === "guest" || !isAuthenticatedUser(user);
  const [tab, setTab] = useState("dashboard");
  const [vocabModalOpen, setVocabModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const handleOpenVocabModal = () => {
    const selection = window.getSelection().toString().trim();
    if (selection && selection.length < 50) {
      setSelectedText(selection);
    } else {
      setSelectedText("");
    }
    setVocabModalOpen(true);
  };
  const [activeListeningMode, setActiveListeningMode] = useState(null);
  const [activeListeningTopic, setActiveListeningTopic] = useState(null);
  const [activeReadingMode, setActiveReadingMode] = useState(null);
  const [activeReadingTopic, setActiveReadingTopic] = useState(null);
  const [activeListeningTest, setActiveListeningTest] = useState(null);
  const [activeListeningTestPart, setActiveListeningTestPart] = useState(null);
  const [activeReadingTest, setActiveReadingTest] = useState(null);
  const [activeReadingTestPart, setActiveReadingTestPart] = useState(null);
  const [apiTests, setApiTests] = useState([]);
  const [listeningPracticeModes, setListeningPracticeModes] = useState([]);
  const [readingPracticeModes, setReadingPracticeModes] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const guestListeningTests = isGuestMode ? getGuestToeicListeningTests() : [];
  const guestReadingTests = isGuestMode ? getGuestToeicReadingTests() : [];
  const guestFullTestVariants = isGuestMode ? getGuestToeicFullTestVariants() : [];

  useEffect(() => {
    const guestTests = getGuestToeicTests();
    const guestModes = getGuestToeicPracticeModes();

    if (isGuestMode) {
      setApiTests(guestTests);
      setListeningPracticeModes(
        guestModes.filter((mode) => mode.type === "listening"),
      );
      setReadingPracticeModes(
        guestModes.filter((mode) => mode.type === "reading"),
      );
      setLoadingTests(false);
      return;
    }

    axiosClient
      .get("/toeic/tests")
      .then((res) => {
        const tests = Array.isArray(res) ? res : [];
        setApiTests(tests.length > 0 ? tests : guestTests);
        setLoadingTests(false);
      })
      .catch((err) => {
        console.error(err);
        setApiTests(guestTests);
        setLoadingTests(false);
      });

    axiosClient
      .get("/toeic/practice-modes")
      .then((res) => {
        const modes = Array.isArray(res) ? res : [];
        const resolvedModes = modes.length > 0 ? modes : guestModes;
        setListeningPracticeModes(
          resolvedModes.filter((m) => m.type === "listening"),
        );
        setReadingPracticeModes(
          resolvedModes.filter((m) => m.type === "reading"),
        );
      })
      .catch((err) => {
        console.error(err);
        setListeningPracticeModes(
          guestModes.filter((mode) => mode.type === "listening"),
        );
        setReadingPracticeModes(
          guestModes.filter((mode) => mode.type === "reading"),
        );
      });
  }, [isGuestMode]);

  const handleSelectPracticeTopic = async (topic, setTopicState) => {
    if (isGuestMode) {
      setTopicState({
        ...topic,
        questions: (topic.questions || []).map((question) => ({
          ...question,
          question: question.prompt,
          text: question.prompt,
        })),
      });
      return;
    }

    try {
      const res = await axiosClient.get(`/toeic/tests/${topic.testId}`);
      const { normalizedQs } = mapApiTestToFrontendFormat(res);
      const questions = normalizedQs
        .filter((q) => getFullTestPartKey(q.partLabel) === topic.partKey)
        .map((q) => ({ ...q, question: q.prompt, text: q.prompt }));
      setTopicState({ ...topic, questions });
    } catch (err) {
      console.error(err);
      alert("Không thể tải bài tập. Vui lòng thử lại!");
    }
  };

  const cleanTitle = (title) => {
    if (!title) return "";
    return title.replace(/^(đề|de)\s+/i, "").trim();
  };

  const getDisplayTestIndex = (title, fallbackId) => {
    const source = `${title || ""} ${fallbackId || ""}`;
    const match = source.match(/\d+/);
    return match ? match[0] : "";
  };

  const LISTENING_TEST_SETS = apiTests.map((t) => {
    return {
      id: `listening-test-${t.id}`,
      apiId: t.id,
      name: `Listening Test ${getDisplayTestIndex(cleanTitle(t.title), t.id)}`,
      desc: "Luyện nghe theo cấu trúc TOEIC với các part bám sát định dạng bài thi.",
      sections: [], // Will be populated on select
    };
  });
  const RESOLVED_LISTENING_TEST_SETS = isGuestMode
    ? guestListeningTests
    : LISTENING_TEST_SETS;

  const READING_TEST_SETS = apiTests.map((t) => {
    return {
      id: `reading-test-${t.id}`,
      apiId: t.id,
      name: `Reading Test ${getDisplayTestIndex(cleanTitle(t.title), t.id)}`,
      desc: "Luyện đọc theo cấu trúc TOEIC để rèn tốc độ xử lý câu hỏi và quản lý thời gian.",
      sections: [], // Will be populated on select
    };
  });
  const RESOLVED_READING_TEST_SETS = isGuestMode
    ? guestReadingTests
    : READING_TEST_SETS;

  const FULL_TEST_VARIANTS = apiTests.map((t) => {
    return {
      id: `fulltest-${t.id}`,
      apiId: t.id,
      name: `TOEIC Test ${getDisplayTestIndex(cleanTitle(t.title), t.id)}`,
      desc: "Mô phỏng bài thi TOEIC đầy đủ phần Listening và Reading để luyện chiến lược làm bài toàn diện.",
      questions: [], // Will be populated on select
    };
  });
  const RESOLVED_FULL_TEST_VARIANTS = isGuestMode
    ? guestFullTestVariants
    : FULL_TEST_VARIANTS;

  const handleSelectListeningTest = async (testInfo) => {
    if (isGuestMode) {
      setActiveListeningTest(testInfo);
      return;
    }

    try {
      const res = await axiosClient.get(`/toeic/tests/${testInfo.apiId}`);
      const { listeningSections } = mapApiTestToFrontendFormat(res);
      setActiveListeningTest({ ...testInfo, sections: listeningSections });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectReadingTest = async (testInfo) => {
    if (isGuestMode) {
      setActiveReadingTest(testInfo);
      return;
    }

    try {
      const res = await axiosClient.get(`/toeic/tests/${testInfo.apiId}`);
      const { readingSections } = mapApiTestToFrontendFormat(res);
      setActiveReadingTest({ ...testInfo, sections: readingSections });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    if (nextTab !== "listening") {
      setActiveListeningMode(null);
      setActiveListeningTopic(null);
    }
    if (nextTab !== "reading") {
      setActiveReadingMode(null);
      setActiveReadingTopic(null);
    }
    if (nextTab !== "listening-test") {
      setActiveListeningTest(null);
      setActiveListeningTestPart(null);
    }
    if (nextTab !== "reading-test") {
      setActiveReadingTest(null);
      setActiveReadingTestPart(null);
    }
  };

  if (tab === "fulltest") {
    return (
      <main className="dash-main toeic-page" id="page-toeic">
        <FullTestMode
          variants={RESOLVED_FULL_TEST_VARIANTS}
          onBack={() => handleTabChange("dashboard")}
        />
        {renderFloatingVocabControls()}
      </main>
    );
  }

  if (tab === "listening" && activeListeningTopic) {
    return (
      <main className="dash-main toeic-page" id="page-toeic">
        <PracticeSession
          part={activeListeningTopic}
          onBack={() => setActiveListeningTopic(null)}
          backLabel="← Quay lại chọn topic"
        />
        {renderFloatingVocabControls()}
      </main>
    );
  }

  if (tab === "reading" && activeReadingTopic) {
    return (
      <main className="dash-main toeic-page" id="page-toeic">
        <PracticeSession
          part={activeReadingTopic}
          onBack={() => setActiveReadingTopic(null)}
          backLabel="← Quay lại chọn topic"
        />
        {renderFloatingVocabControls()}
      </main>
    );
  }

  function renderFloatingVocabControls() {
    return (
      <>
        <button
          className="toeic-floating-vocab-btn"
          onClick={handleOpenVocabModal}
          title="Lưu từ mới vào bộ từ vựng cá nhân"
        >
          📖
        </button>

        <SaveWordModal
          isOpen={vocabModalOpen}
          onClose={() => setVocabModalOpen(false)}
          defaultWord={selectedText}
        />
      </>
    );
  }

  const shouldHideToeicHero =
    (tab === "listening-test" &&
      activeListeningTestPart &&
      (activeListeningTestPart.questions || []).length > 0) ||
    (tab === "reading-test" &&
      activeReadingTestPart &&
      (activeReadingTestPart.questions || []).length > 0);

  return (
    <main className="dash-main toeic-page" id="page-toeic">
      {!shouldHideToeicHero && (
        <section className="toeic-hero">
          <div className="toeic-hero-copy">
            <div className="toeic-eyebrow">TOEIC</div>
            <h1>Luyện tập và thi thử TOEIC</h1>
            <p>
              Chọn kỹ năng và dạng bài để luyện tập. Listening và Reading hiện
              được chia theo đúng từng part để bám sát cấu trúc đề TOEIC hơn.
            </p>
          </div>
          <div className="toeic-tab-switch">
            <button
              className={`toeic-tab-btn${tab === "dashboard" ? " active" : ""}`}
              onClick={() => handleTabChange("dashboard")}
            >
              Mục tiêu & Điểm số
            </button>
            <button
              className={`toeic-tab-btn${tab === "listening-test" ? " active" : ""}`}
              onClick={() => handleTabChange("listening-test")}
            >
              Listening Test
            </button>
            <button
              className={`toeic-tab-btn${tab === "reading-test" ? " active" : ""}`}
              onClick={() => handleTabChange("reading-test")}
            >
              Reading Test
            </button>
            <button
              className={`toeic-tab-btn${tab === "fulltest" ? " active" : ""}`}
              onClick={() => handleTabChange("fulltest")}
            >
              Full Test
            </button>
            <button
              className={`toeic-tab-btn${tab === "listening" ? " active" : ""}`}
              onClick={() => handleTabChange("listening")}
            >
              Listening
            </button>
            <button
              className={`toeic-tab-btn${tab === "reading" ? " active" : ""}`}
              onClick={() => handleTabChange("reading")}
            >
              Reading
            </button>
          </div>
        </section>
      )}

      <div className="toeic-content">
        {tab === "dashboard" ? (
          <ToeicDashboard
            onStartTest={() => handleTabChange("fulltest")}
            onStartPractice={() => handleTabChange("listening-test")}
          />
        ) : tab === "listening" ? (
          activeListeningMode ? (
            <TopicGrid
              mode={activeListeningMode}
              onSelect={(topic) =>
                handleSelectPracticeTopic(topic, setActiveListeningTopic)
              }
              onBack={() => {
                setActiveListeningMode(null);
                setActiveListeningTopic(null);
              }}
              backLabel="← Quay lại chọn loại listening"
            />
          ) : (
            <ModeGrid
              modes={listeningPracticeModes}
              onSelect={setActiveListeningMode}
            />
          )
        ) : tab === "listening-test" ? (
          activeListeningTest ? (
            activeListeningTestPart ? (
              (activeListeningTestPart.questions || []).length > 0 ? (
                <ListeningTestSession
                  test={activeListeningTest}
                  section={activeListeningTestPart}
                  onBack={() => setActiveListeningTestPart(null)}
                />
              ) : (
                <ListeningTestPlaceholder
                  test={activeListeningTest}
                  part={activeListeningTestPart}
                  onBack={() => setActiveListeningTestPart(null)}
                />
              )
            ) : (
              <ListeningTestParts
                test={activeListeningTest}
                onSelectPart={setActiveListeningTestPart}
                onBack={() => {
                  setActiveListeningTest(null);
                  setActiveListeningTestPart(null);
                }}
              />
            )
          ) : (
            <ListeningTestGrid
              tests={RESOLVED_LISTENING_TEST_SETS}
              onSelect={handleSelectListeningTest}
            />
          )
        ) : tab === "reading-test" ? (
          activeReadingTest ? (
            activeReadingTestPart ? (
              (activeReadingTestPart.questions || []).length > 0 ? (
                <ReadingTestSession
                  test={activeReadingTest}
                  section={activeReadingTestPart}
                  onBack={() => setActiveReadingTestPart(null)}
                />
              ) : (
                <ReadingTestPlaceholder
                  test={activeReadingTest}
                  part={activeReadingTestPart}
                  onBack={() => setActiveReadingTestPart(null)}
                />
              )
            ) : (
              <ReadingTestParts
                test={activeReadingTest}
                onSelectPart={setActiveReadingTestPart}
                onBack={() => {
                  setActiveReadingTest(null);
                  setActiveReadingTestPart(null);
                }}
              />
            )
          ) : (
            <ReadingTestGrid
              tests={RESOLVED_READING_TEST_SETS}
              onSelect={handleSelectReadingTest}
            />
          )
        ) : activeReadingMode ? (
          <TopicGrid
            mode={activeReadingMode}
            onSelect={(topic) =>
              handleSelectPracticeTopic(topic, setActiveReadingTopic)
            }
            onBack={() => {
              setActiveReadingMode(null);
              setActiveReadingTopic(null);
            }}
            backLabel="← Quay lại chọn loại reading"
          />
        ) : (
          <ModeGrid
            modes={readingPracticeModes}
            onSelect={setActiveReadingMode}
          />
        )}
      </div>

      {renderFloatingVocabControls()}
    </main>
  );
}
