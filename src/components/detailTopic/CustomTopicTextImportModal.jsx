import { useMemo, useState } from 'react';
import ToastNotice from '../common/ToastNotice';
import CustomModal from '../customDocs/CustomModal';
import { AI_API_URL, AI_MODEL } from '../../utils/aiConfig';
import {
  MAX_PREVIEW_WORDS,
  MAX_SELECTABLE_WORDS,
  buildSmartVocabularyPrompt,
  cleanText,
  collectVocabularyCandidatesFromText,
  normalizePreviewItem,
  normalizeWord,
  parseJsonList,
  getTopicLanguageMeta,
} from '../../utils/customTopicAi';

function prepareTextForAi(text = '') {
  return cleanText(
    String(text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/[•·]/g, ' ')
      .replace(/\t+/g, ' ')
  );
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
    return 'AI đang bận hoặc đã chạm giới hạn tạm thời. Vui lòng thử lại sau ít phút.';
  }

  if (resp.status === 401 || resp.status === 403) {
    return 'Cấu hình AI hiện tại không hợp lệ hoặc đã hết quyền truy cập.';
  }

  if (resp.status >= 500) {
    return 'Máy chủ AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }

  return detail || `HTTP ${resp.status}`;
}

export default function CustomTopicTextImportModal({ isOpen, onClose, onImport, existingWords = [], topicLang = 'en' }) {
  const languageMeta = getTopicLanguageMeta(topicLang);
  const [rawText, setRawText] = useState('');
  const [status, setStatus] = useState('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewWords, setPreviewWords] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());

  const existingWordSet = useMemo(() => new Set(existingWords.map((word) => normalizeWord(word?.word)).filter(Boolean)), [existingWords]);
  const selectablePreviewCount = Math.min(MAX_SELECTABLE_WORDS, previewWords.length);
  const hasSelectedAllSelectable =
    selectablePreviewCount > 0 && Array.from({ length: selectablePreviewCount }).every((_, index) => selectedIndexes.has(index));
  const textStats = useMemo(() => {
    const lines = rawText
      ? rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length
      : 0;
    const chars = rawText.length;
    const words = cleanText(rawText).split(/\s+/).filter(Boolean).length;

    return { lines, chars, words };
  }, [rawText]);
  const isLongInput = textStats.chars >= 3500 || textStats.lines >= 40;
  const loadingMessage = isLongInput
    ? 'Đoạn text khá dài, AI đang làm sạch và phân tích kỹ hơn...'
    : `AI đang đọc đoạn text và nhận diện tối đa ${MAX_PREVIEW_WORDS} từ...`;

  const resetState = () => {
    setRawText('');
    setStatus('input');
    setErrorMsg('');
    setToastMessage('');
    setPreviewWords([]);
    setSelectedIndexes(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyzeText = async () => {
    const text = prepareTextForAi(rawText);
    if (!text) {
      setErrorMsg('Vui lòng dán đoạn text trước khi phân tích.');
      return;
    }

    setErrorMsg('');
    setStatus('loading');

    try {
      const candidates = collectVocabularyCandidatesFromText(text, topicLang, 260);
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
              content: `You extract important ${languageMeta.scriptHint} vocabulary from user text and return only JSON.`,
            },
            {
              role: 'user',
              content: buildSmartVocabularyPrompt({
                topicLang,
                sourceLabel: `an unstructured ${languageMeta.scriptHint} text pasted by the user`,
                rawText: text,
                candidates,
                existingWords,
                maxPreviewWords: MAX_PREVIEW_WORDS,
              }),
            },
          ],
          max_tokens: 2400,
          temperature: 0.1,
          stream: false,
        }),
      });

      if (!resp.ok) {
        throw new Error(await buildAiError(resp));
      }

      const data = await resp.json();
      const textContent = data?.choices?.[0]?.message?.content || '';
      const parsedList = parseJsonList(textContent);
      const seen = new Set();
      const normalizedWords = parsedList
        .map((item) => normalizePreviewItem(item))
        .filter(Boolean)
        .filter((item) => {
          const normalized = normalizeWord(item.word);
          if (!normalized || seen.has(normalized) || existingWordSet.has(normalized)) {
            return false;
          }
          seen.add(normalized);
          return true;
        })
        .slice(0, MAX_PREVIEW_WORDS);

      if (normalizedWords.length === 0) {
        throw new Error('AI chưa tìm được từ nào phù hợp trong đoạn text này.');
      }

      setPreviewWords(normalizedWords);
      setSelectedIndexes(new Set(Array.from({ length: Math.min(MAX_SELECTABLE_WORDS, normalizedWords.length) }, (_, index) => index)));
      setStatus('preview');
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể phân tích đoạn text lúc này.');
      setStatus('error');
    }
  };

  const handleToggleCheck = (idx) => {
    const nextSet = new Set(selectedIndexes);
    if (nextSet.has(idx)) nextSet.delete(idx);
    else if (nextSet.size < MAX_SELECTABLE_WORDS) nextSet.add(idx);
    else {
      setToastMessage(`Mỗi lần chỉ được chọn tối đa ${MAX_SELECTABLE_WORDS} từ.`);
      return;
    }
    setSelectedIndexes(nextSet);
  };

  const handleToggleAll = () => {
    if (hasSelectedAllSelectable) {
      setSelectedIndexes(new Set());
      return;
    }

    setSelectedIndexes(new Set(Array.from({ length: selectablePreviewCount }, (_, index) => index)));
  };

  const handleAddSelected = async () => {
    const selected = Array.from(selectedIndexes).map((idx) => previewWords[idx]).filter(Boolean);
    if (selected.length === 0) {
      setToastMessage('Vui lòng chọn ít nhất 1 từ.');
      return;
    }

    if (selected.length > MAX_SELECTABLE_WORDS) {
      setToastMessage(`Mỗi lần chỉ được thêm tối đa ${MAX_SELECTABLE_WORDS} từ.`);
      return;
    }

    setStatus('importing');

    try {
      const result = await onImport(selected);
      if (result?.error) {
        throw new Error(result.error);
      }

      resetState();
      onClose();
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể thêm từ từ đoạn text lúc này.');
      setStatus('preview');
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      boxClassName="cv-text-import-modal"
      title="Thêm từ đoạn text"
    >
      <ToastNotice message={toastMessage} onHide={() => setToastMessage('')} />

      {status === 'input' && (
        <>
          <div className="cv-modal-body cv-text-import-body">
            <div className="cv-text-import-copy">
              <p>Dán một đoạn text bất kỳ từ web, mạng xã hội hoặc nội dung bạn copy ở đâu đó.</p>
              <p>AI sẽ lọc tối đa {MAX_PREVIEW_WORDS} từ phù hợp, tạo preview với các cột word, mean và loại từ. Mỗi lần chỉ được chọn tối đa {MAX_SELECTABLE_WORDS} từ để thêm.</p>
            </div>

            <textarea
              className="cv-form-input cv-text-import-input"
              rows={10}
              placeholder="Dán đoạn text ở đây..."
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
            />
            <div className="cv-text-import-stats">
              <span>{textStats.chars.toLocaleString('vi-VN')} ký tự</span>
              <span>{textStats.lines.toLocaleString('vi-VN')} dòng</span>
              <span>{textStats.words.toLocaleString('vi-VN')} từ</span>
            </div>

            {isLongInput ? (
              <div className="cv-text-import-warning">
                Text quá dài, hệ thống sẽ mất thêm thời gian để làm sạch và phân tích.
              </div>
            ) : null}

            {errorMsg ? <div className="cv-excel-import-error">{errorMsg}</div> : null}
          </div>

          <div className="cv-modal-footer cv-modal-footer-split">
            <button className="btn btn-secondary" onClick={handleClose}>Hủy</button>
            <button className="cv-btn-ai cv-btn-ai-large" onClick={handleAnalyzeText}>
              Phân tích text
            </button>
          </div>
        </>
      )}

      {status === 'loading' && (
        <div className="cv-modal-body">
          <div className="cv-ai-loading">
            <div className="cv-ai-spinner"></div>
            <p>{loadingMessage}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="cv-modal-body">
          <div className="cv-ai-error">
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>?</div>
            <p>
              Cần kiểm tra lại đoạn text hoặc thử đoạn khác.
              <br />
              <small style={{ color: 'var(--gray-light)' }}>{errorMsg}</small>
            </p>
            <button className="btn btn-primary" onClick={() => setStatus('input')}>Thử lại</button>
          </div>
        </div>
      )}

      {status === 'preview' && (
        <>
          <div className="cv-modal-body" style={{ padding: '10px' }}>
            <div className="cv-ai-preview-header">
              <p>
                AI tìm được <strong>{previewWords.length} từ</strong> từ đoạn text đã dán.
              </p>
              <label className="cv-ai-select-all-wrap">
                <input
                  type="checkbox"
                  checked={hasSelectedAllSelectable}
                  onChange={handleToggleAll}
                />
                <span>Chọn tất cả</span>
              </label>
            </div>

            <div className="cv-ai-preview-table cv-text-preview-table">
              <div className="cv-ai-preview-head cv-text-preview-head">
                <span></span>
                <span>Word</span>
                <span>Mean</span>
                <span>Loại từ</span>
              </div>

              {previewWords.map((word, index) => (
                <div key={`${word.word}-${index}`} className="cv-ai-preview-row cv-text-preview-row" onClick={() => handleToggleCheck(index)}>
                  <div className="cv-ai-check-wrap">
                    <label className="cv-ai-check-wrap" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="cv-ai-chk"
                        checked={selectedIndexes.has(index)}
                        onChange={() => handleToggleCheck(index)}
                      />
                      <span className="cv-ai-chk-box"></span>
                    </label>
                  </div>
                  <div className="cv-ai-preview-word">
                    <strong>{word.word}</strong>
                  </div>
                  <div className="cv-ai-preview-mean">{word.mean}</div>
                  <div className="cv-ai-preview-type" data-short={word.wordtype}>{word.wordtype}</div>
                </div>
              ))}
            </div>

            {errorMsg ? <div className="cv-excel-import-error" style={{ marginTop: '12px' }}>{errorMsg}</div> : null}
          </div>

          <div className="cv-modal-footer">
            <span className="cv-ai-selected-count">{selectedIndexes.size}/{MAX_SELECTABLE_WORDS} từ được chọn</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, width: '100%' }} onClick={() => setStatus('input')}>
                Phân tích lại
              </button>
              <button className="btn btn-primary" style={{ flex: 1, width: '100%' }} onClick={handleAddSelected} disabled={status === 'importing'}>
                {status === 'importing' ? 'Đang thêm...' : 'Thêm'}
              </button>
            </div>
          </div>
        </>
      )}

      {status === 'importing' && (
        <div className="cv-modal-body">
          <div className="cv-ai-loading">
            <div className="cv-ai-spinner"></div>
            <p>AI đang bổ sung dữ liệu và thêm các từ đã chọn...</p>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
