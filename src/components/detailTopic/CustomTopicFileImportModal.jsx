import { useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;

if (pdfjsLib?.GlobalWorkerOptions && pdfjsLib.GlobalWorkerOptions.workerSrc !== pdfWorkerUrl) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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

async function extractTextFromPdf(file, maxPages = MAX_PDF_PAGES) {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];
  const totalPages = Number(pdf.numPages) || 0;
  const pagesToRead = Math.max(0, Math.min(totalPages, maxPages));

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str || '').join(' ');
    if (cleanText(pageText)) {
      pages.push(pageText);
    }
  }

  return {
    text: cleanText(pages.join(' ')),
    totalPages,
    pagesRead: pagesToRead,
    truncated: totalPages > pagesToRead,
  };
}

async function extractTextFromDocx(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('File Word không hợp lệ hoặc bị lỗi.');
  }

  const xmlText = await documentXmlFile.async('string');
  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const textNodes = Array.from(xmlDoc.getElementsByTagName('w:t')).map((node) => node.textContent || '');
  return cleanText(textNodes.join(' '));
}

function getFileExtension(fileName = '') {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.slice(lastDot + 1).toLowerCase();
}

function isAllowedFile(file) {
  if (!file) return false;
  const extension = getFileExtension(file.name);
  const mimeType = file.type;

  return (
    mimeType === 'application/pdf' ||
    extension === 'pdf' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  );
}

export default function CustomTopicFileImportModal({ isOpen, onClose, onImport, existingWords = [], topicLang = 'en' }) {
  const fileInputRef = useRef(null);
  const languageMeta = getTopicLanguageMeta(topicLang);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewWords, setPreviewWords] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());

  const existingWordSet = useMemo(() => new Set(existingWords.map((word) => normalizeWord(word?.word)).filter(Boolean)), [existingWords]);
  const selectablePreviewCount = Math.min(MAX_SELECTABLE_WORDS, previewWords.length);
  const hasSelectedAllSelectable =
    selectablePreviewCount > 0 && Array.from({ length: selectablePreviewCount }).every((_, index) => selectedIndexes.has(index));

  const resetState = () => {
    setSelectedFile(null);
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!isAllowedFile(file)) {
      setErrorMsg('Chỉ hỗ trợ file PDF và Word (.docx).');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('File quá lớn. Vui lòng chọn file nhỏ hơn hoặc bằng 5MB.');
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    setPreviewWords([]);
    setSelectedIndexes(new Set());
    setStatus('input');
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const analyzeSelectedFile = async () => {
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn file PDF/Word trước khi phân tích.');
      return;
    }

    setErrorMsg('');
    setStatus('loading');

    try {
      const extension = getFileExtension(selectedFile.name);
      const extractedResult =
        extension === 'pdf'
          ? await extractTextFromPdf(selectedFile, MAX_PDF_PAGES)
          : { text: await extractTextFromDocx(selectedFile), truncated: false };
      const extracted = extractedResult.text;

      if (!cleanText(extracted)) {
        throw new Error('Không trích xuất được text hợp lệ từ file này.');
      }

      if (extractedResult.truncated) {
        setToastMessage(`File PDF có ${extractedResult.totalPages} trang. Hệ thống chỉ xử lý tối đa ${MAX_PDF_PAGES} trang đầu để giữ tốc độ ổn định.`);
      }

      const candidates = collectVocabularyCandidatesFromText(extracted, topicLang, 260);
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
              content: `You extract important ${languageMeta.scriptHint} vocabulary from uploaded PDF/Word text and return only JSON.`,
            },
            {
              role: 'user',
              content: buildSmartVocabularyPrompt({
                topicLang,
                sourceLabel: `text extracted from a ${languageMeta.scriptHint} PDF or Word document uploaded by the user`,
                rawText: extracted,
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
        throw new Error('AI chưa tìm được từ nào phù hợp trong file này.');
      }

      setPreviewWords(normalizedWords);
      setSelectedIndexes(new Set(Array.from({ length: Math.min(MAX_SELECTABLE_WORDS, normalizedWords.length) }, (_, index) => index)));
      setStatus('preview');
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể phân tích file lúc này.');
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
      setErrorMsg(error?.message || 'Không thể thêm từ từ file lúc này.');
      setStatus('preview');
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      boxClassName="cv-file-import-modal"
      title="Thêm từ file PDF/Word"
    >
      <ToastNotice message={toastMessage} onHide={() => setToastMessage('')} />

      {status === 'input' && (
        <>
          <div className="cv-modal-body cv-file-import-body">
            <div className="cv-file-import-copy">
              <p>Tải lên file PDF hoặc Word (.docx) dung lượng tối đa 5MB.</p>
              <p>File lớn có thể xử lý lâu hơn. Nếu là PDF, hệ thống chỉ scan tối đa {MAX_PDF_PAGES} trang đầu để giữ tốc độ ổn định.</p>
              <p>AI sẽ trích text quan trọng, lọc tối đa {MAX_PREVIEW_WORDS} từ để preview. Mỗi lần chỉ được chọn tối đa {MAX_SELECTABLE_WORDS} từ để thêm.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="cv-file-import-file"
              onChange={handleFileChange}
            />

            <div className="cv-file-import-actions">
              <button type="button" className="cv-excel-import-choice cv-excel-import-choice-primary" onClick={handlePickFile}>
                <span className="cv-excel-import-choice-title">Chọn file PDF/Word</span>
                <span className="cv-excel-import-choice-desc">Chọn file để AI trích và phân tích từ vựng quan trọng.</span>
              </button>

              <button type="button" className="cv-excel-import-choice" onClick={analyzeSelectedFile} disabled={!selectedFile}>
                <span className="cv-excel-import-choice-title">Phân tích file</span>
                <span className="cv-excel-import-choice-desc">AI sẽ tạo preview tối đa {MAX_PREVIEW_WORDS} từ.</span>
              </button>
            </div>

            {selectedFile ? (
              <div className="cv-file-import-selected">
                <strong>Đã chọn:</strong> {selectedFile.name} <span>({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            ) : null}

            {errorMsg ? <div className="cv-excel-import-error">{errorMsg}</div> : null}
          </div>

          <div className="cv-modal-footer cv-modal-footer-split">
            <button className="btn btn-secondary" onClick={handleClose}>Hủy</button>
            <button className="cv-btn-ai cv-btn-ai-large" onClick={analyzeSelectedFile} disabled={!selectedFile}>
              Phân tích file
            </button>
          </div>
        </>
      )}

      {status === 'loading' && (
        <div className="cv-modal-body">
          <div className="cv-ai-loading">
            <div className="cv-ai-spinner"></div>
            <p>AI đang đọc file và nhận diện tối đa {MAX_PREVIEW_WORDS} từ...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="cv-modal-body">
          <div className="cv-ai-error">
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>?</div>
            <p>
              Cần kiểm tra lại file hoặc thử file khác.
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
                AI tìm được <strong>{previewWords.length} từ</strong> từ file đã tải lên.
              </p>
              <label className="cv-ai-select-all-wrap">
                <input type="checkbox" checked={hasSelectedAllSelectable} onChange={handleToggleAll} />
                <span>Chọn tất cả</span>
              </label>
            </div>

            <div className="cv-ai-preview-table cv-file-preview-table">
              <div className="cv-ai-preview-head cv-file-preview-head">
                <span></span>
                <span>Word</span>
                <span>Mean</span>
                <span>Loại từ</span>
              </div>

              {previewWords.map((word, index) => (
                <div key={`${word.word}-${index}`} className="cv-ai-preview-row cv-file-preview-row" onClick={() => handleToggleCheck(index)}>
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
