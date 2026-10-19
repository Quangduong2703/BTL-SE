import { useEffect, useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import ToastNotice from '../common/ToastNotice';
import CustomModal from '../customDocs/CustomModal';
import { AI_API_URL, AI_MODEL } from '../../utils/aiConfig';
import {
  buildSmartVocabularyPrompt,
  collectVocabularyCandidatesFromText,
  getTopicLanguageMeta,
  MAX_PREVIEW_WORDS,
  MAX_SELECTABLE_WORDS,
  normalizePreviewItem,
  normalizeWord,
  parseJsonList,
} from '../../utils/customTopicAi';

const OCR_LANG_MAP = {
  en: ['eng'],
  ja: ['jpn', 'eng'],
  zh: ['chi_sim', 'eng'],
};
const OCR_WORKER_CACHE = new Map();
const OSD_WORKER_CACHE = new Map();
const PREPROCESS_SETTINGS = {
  en: {
    targetLongSide: 1800,
    contrast: 1.35,
    threshold: null,
  },
  ja: {
    targetLongSide: 2400,
    contrast: 1.55,
    threshold: 168,
  },
  zh: {
    targetLongSide: 2200,
    contrast: 1.45,
    threshold: 175,
  },
};
const JAPANESE_OCR_MIN_SCORE = 3;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function getOcrLanguages(topicLang = 'en') {
  return OCR_LANG_MAP[topicLang] || OCR_LANG_MAP.en;
}

async function getOcrWorker(topicLang = 'en') {
  const languages = getOcrLanguages(topicLang);
  const cacheKey = languages.join('+');
  if (!OCR_WORKER_CACHE.has(cacheKey)) {
    OCR_WORKER_CACHE.set(
      cacheKey,
      createWorker(languages, 1, {
        logger: () => {},
      })
    );
  }
  return OCR_WORKER_CACHE.get(cacheKey);
}

async function getOsdWorker() {
  const cacheKey = 'osd';
  if (!OSD_WORKER_CACHE.has(cacheKey)) {
    OSD_WORKER_CACHE.set(
      cacheKey,
      createWorker('osd', 0, {
        legacyCore: true,
        legacyLang: true,
        logger: () => {},
      })
    );
  }
  return OSD_WORKER_CACHE.get(cacheKey);
}

function getPreprocessConfig(topicLang = 'en') {
  return PREPROCESS_SETTINGS[topicLang] || PREPROCESS_SETTINGS.en;
}

function loadImageElement(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể tải ảnh để tiền xử lý OCR.'));
    image.src = imageDataUrl;
  });
}

async function preprocessImageForOcr(imageDataUrl, topicLang = 'en') {
  const sourceImage = await loadImageElement(imageDataUrl);
  const config = getPreprocessConfig(topicLang);
  const longestSide = Math.max(sourceImage.naturalWidth || sourceImage.width, sourceImage.naturalHeight || sourceImage.height);
  const scale = Math.min(3, Math.max(1, config.targetLongSide / Math.max(1, longestSide)));
  const targetWidth = Math.max(1, Math.round((sourceImage.naturalWidth || sourceImage.width) * scale));
  const targetHeight = Math.max(1, Math.round((sourceImage.naturalHeight || sourceImage.height) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Không thể tạo canvas để tiền xử lý ảnh.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

  const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data;
  const contrastFactor = config.contrast;
  const threshold = config.threshold;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (alpha === 0) continue;

    const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
    let adjusted = luminance;

    if (threshold !== null) {
      adjusted = luminance >= threshold ? 255 : 0;
    } else {
      adjusted = Math.max(0, Math.min(255, Math.round((luminance - 128) * contrastFactor + 128)));
    }

    pixels[index] = adjusted;
    pixels[index + 1] = adjusted;
    pixels[index + 2] = adjusted;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}

function cloneCanvas(canvas) {
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d');
  if (!context) {
    throw new Error('Không thể sao chép canvas để OCR.');
  }
  context.drawImage(canvas, 0, 0);
  return copy;
}

function rotateCanvas(canvas, clockwise = true) {
  const rotated = document.createElement('canvas');
  rotated.width = canvas.height;
  rotated.height = canvas.width;

  const context = rotated.getContext('2d');
  if (!context) {
    throw new Error('Không thể xoay canvas để OCR.');
  }

  context.save();
  if (clockwise) {
    context.translate(rotated.width, 0);
    context.rotate(Math.PI / 2);
  } else {
    context.translate(0, rotated.height);
    context.rotate(-Math.PI / 2);
  }
  context.drawImage(canvas, 0, 0);
  context.restore();
  return rotated;
}

function sliceCanvas(canvas, parts = 2, direction = 'vertical') {
  const slices = [];
  const isVertical = direction === 'vertical';
  const sliceSize = isVertical ? Math.ceil(canvas.width / parts) : Math.ceil(canvas.height / parts);

  for (let index = 0; index < parts; index += 1) {
    const slice = document.createElement('canvas');
    slice.width = isVertical ? Math.max(1, Math.min(sliceSize, canvas.width - index * sliceSize)) : canvas.width;
    slice.height = isVertical ? canvas.height : Math.max(1, Math.min(sliceSize, canvas.height - index * sliceSize));

    const context = slice.getContext('2d');
    if (!context) {
      throw new Error('Không thể tách vùng OCR.');
    }

    if (isVertical) {
      context.drawImage(
        canvas,
        index * sliceSize,
        0,
        slice.width,
        canvas.height,
        0,
        0,
        slice.width,
        slice.height
      );
    } else {
      context.drawImage(
        canvas,
        0,
        index * sliceSize,
        canvas.width,
        slice.height,
        0,
        0,
        slice.width,
        slice.height
      );
    }

    slices.push(slice);
  }

  return slices.filter((slice) => slice.width > 0 && slice.height > 0);
}

async function recognizeCanvasWithOcr(canvas, topicLang = 'en') {
  const worker = await getOcrWorker(topicLang);
  const result = await worker.recognize(canvasToDataUrl(canvas));
  return cleanText(result?.data?.text || '');
}

async function detectCanvasOrientation(canvas) {
  try {
    const worker = await getOsdWorker();
    const result = await worker.detect(canvasToDataUrl(canvas));
    const data = result?.data || {};
    return {
      degrees: Number(data.orientation_degrees ?? 0) || 0,
      confidence: Number(data.orientation_confidence ?? 0) || 0,
    };
  } catch {
    return {
      degrees: 0,
      confidence: 0,
    };
  }
}

function rotateCanvasByDegrees(canvas, degrees) {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  if (normalizedDegrees === 0) return cloneCanvas(canvas);
  if (normalizedDegrees === 90) return rotateCanvas(canvas, true);
  if (normalizedDegrees === 270) return rotateCanvas(canvas, false);
  if (normalizedDegrees === 180) {
    const flipped = document.createElement('canvas');
    flipped.width = canvas.width;
    flipped.height = canvas.height;
    const context = flipped.getContext('2d');
    if (!context) {
      throw new Error('Không thể xoay canvas để OCR.');
    }
    context.translate(flipped.width, flipped.height);
    context.rotate(Math.PI);
    context.drawImage(canvas, 0, 0);
    return flipped;
  }
  return cloneCanvas(canvas);
}

function scoreJapaneseOcrText(text) {
  const value = cleanText(text);
  if (!value) return 0;
  const japaneseCharCount = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  const latinCount = (value.match(/[A-Za-z]/g) || []).length;
  const digitCount = (value.match(/[0-9]/g) || []).length;
  const lineCount = value.split(/\n+/).filter(Boolean).length;
  return japaneseCharCount * 3 + latinCount + digitCount * 0.2 + lineCount * 0.5 + Math.min(value.length, 120) * 0.1;
}

async function extractJapaneseTextVariants(imageDataUrl) {
  const processedCanvas = await preprocessImageForOcr(imageDataUrl, 'ja');
  const orientation = await detectCanvasOrientation(processedCanvas);
  const orientedCanvas = orientation.confidence >= 5
    ? rotateCanvasByDegrees(processedCanvas, orientation.degrees)
    : processedCanvas;
  const variants = [
    { label: 'original', canvas: orientedCanvas },
    { label: 'rotated-cw', canvas: rotateCanvas(orientedCanvas, true) },
    { label: 'rotated-ccw', canvas: rotateCanvas(orientedCanvas, false) },
  ];

  const isPortrait = orientedCanvas.height > orientedCanvas.width * 1.08;
  if (isPortrait) {
    const columns = sliceCanvas(orientedCanvas, 2, 'vertical');
    columns.forEach((slice, index) => {
      variants.push({ label: `column-${index + 1}`, canvas: slice });
      variants.push({ label: `column-${index + 1}-rotated-cw`, canvas: rotateCanvas(slice, true) });
    });
  } else {
    const rows = sliceCanvas(orientedCanvas, 2, 'horizontal');
    rows.forEach((slice, index) => {
      variants.push({ label: `row-${index + 1}`, canvas: slice });
    });
  }

  const results = [];
  for (const variant of variants) {
    try {
      const text = await recognizeCanvasWithOcr(variant.canvas, 'ja');
      results.push({
        label: variant.label,
        text,
        score: scoreJapaneseOcrText(text),
      });
    } catch {
      results.push({ label: variant.label, text: '', score: 0 });
    }
  }

  const best = results.sort((left, right) => right.score - left.score)[0];
  if (!best || best.score < JAPANESE_OCR_MIN_SCORE) {
    return '';
  }

  const combined = results
    .filter((item) => item.text)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.text)
    .join('\n');

  return cleanText(combined || best.text || '');
}

async function extractTextFromImageWithOcr(imageDataUrl, topicLang = 'en') {
  if (topicLang === 'ja') {
    return extractJapaneseTextVariants(imageDataUrl);
  }

  const processedCanvas = await preprocessImageForOcr(imageDataUrl, topicLang);
  return recognizeCanvasWithOcr(processedCanvas, topicLang);
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
    reader.readAsDataURL(file);
  });
}

export default function CustomTopicImageImportModal({ isOpen, onClose, onImport, existingWords = [], topicLang = 'en' }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [status, setStatus] = useState('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewWords, setPreviewWords] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());

  const existingWordSet = useMemo(() => new Set(existingWords.map((word) => normalizeWord(word?.word)).filter(Boolean)), [existingWords]);

  const resetState = () => {
    setSelectedFile(null);
    setImageDataUrl('');
    setStatus('input');
    setErrorMsg('');
    setToastMessage('');
    setPreviewWords([]);
    setSelectedIndexes(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn một file ảnh hợp lệ.');
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    setPreviewWords([]);
    setSelectedIndexes(new Set());
    setStatus('input');

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể xử lý file ảnh này.');
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageDataUrl) {
      setErrorMsg('Vui lòng chọn một file ảnh trước khi phân tích.');
      return;
    }

    setErrorMsg('');
    setStatus('loading');

    try {
      const ocrText = await extractTextFromImageWithOcr(imageDataUrl, topicLang);
      const normalizedText = normalizeOcrText(ocrText);

      if (!normalizedText) {
        throw new Error('Không đọc được text rõ ràng trong ảnh này.');
      }

      const candidates = collectVocabularyCandidatesFromText(normalizedText, topicLang, MAX_PREVIEW_WORDS);
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
              content: `You extract important ${getTopicLanguageMeta(topicLang).scriptHint} vocabulary from OCR text and return only JSON.`,
            },
            {
              role: 'user',
              content: buildSmartVocabularyPrompt({
                topicLang,
                sourceLabel: `OCR text extracted from an image containing ${getTopicLanguageMeta(topicLang).scriptHint} vocabulary`,
                rawText: normalizedText,
                candidates,
                existingWords,
                maxPreviewWords: MAX_PREVIEW_WORDS,
              }),
            },
          ],
          max_tokens: 3200,
          temperature: 0.1,
          stream: false,
        }),
      });

      if (!resp.ok) {
        throw new Error(await buildAiError(resp));
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const parsedList = parseJsonList(text);

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
        throw new Error('AI chưa lọc được từ nào phù hợp từ text OCR trong ảnh này.');
      }

      setPreviewWords(normalizedWords);
      setSelectedIndexes(new Set(normalizedWords.map((_, index) => index)));
      setStatus('preview');
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể phân tích ảnh lúc này.');
      setStatus('error');
    }
  };

  const handleToggleCheck = (idx) => {
    const nextSet = new Set(selectedIndexes);
    if (nextSet.has(idx)) {
      nextSet.delete(idx);
      setSelectedIndexes(nextSet);
      return;
    }

    if (nextSet.size >= MAX_SELECTABLE_WORDS) {
      setToastMessage(`Chỉ được chọn tối đa ${MAX_SELECTABLE_WORDS} từ.`);
      return;
    }

    nextSet.add(idx);
    setSelectedIndexes(nextSet);
  };

  const handleToggleAll = () => {
    if (selectedIndexes.size === previewWords.length) {
      setSelectedIndexes(new Set());
      return;
    }

    setSelectedIndexes(new Set(previewWords.slice(0, MAX_SELECTABLE_WORDS).map((_, index) => index)));
  };

  const handleAddSelected = async () => {
    const selected = Array.from(selectedIndexes).map((idx) => previewWords[idx]).filter(Boolean);

    if (selected.length === 0) {
      setToastMessage('Vui lòng chọn ít nhất 1 từ.');
      return;
    }

    if (selected.length > MAX_SELECTABLE_WORDS) {
      setToastMessage(`Chỉ được chọn tối đa ${MAX_SELECTABLE_WORDS} từ.`);
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
      setErrorMsg(error?.message || 'Không thể thêm từ từ ảnh lúc này.');
      setStatus('preview');
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      boxClassName="cv-image-import-modal"
      title="Thêm từ hình ảnh"
    >
      <ToastNotice message={toastMessage} onHide={() => setToastMessage('')} />

      {status === 'input' && (
        <>
          <div className="cv-modal-body cv-image-import-body">
            <div className="cv-image-import-copy">
              <p>Tải lên một ảnh có chứa từ tiếng Anh.</p>
              <p>Hệ thống sẽ resize, tăng tương phản và scan OCR trước, rồi AI chỉ lọc tối đa {MAX_PREVIEW_WORDS} từ để tạo preview với các cột word, mean và loại từ. Bạn có thể chọn tối đa {MAX_SELECTABLE_WORDS} từ để thêm vào topic.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="cv-image-import-file"
              onChange={handleFileChange}
            />

            <div className="cv-image-import-actions">
              <button type="button" className="cv-excel-import-choice cv-excel-import-choice-primary" onClick={handlePickFile}>
                <span className="cv-excel-import-choice-title">Chọn ảnh</span>
                <span className="cv-excel-import-choice-desc">
                  Chọn file ảnh chứa danh sách từ để AI phân tích.
                </span>
              </button>

              <button
                type="button"
                className="cv-excel-import-choice"
                onClick={handleAnalyzeImage}
                disabled={!imageDataUrl}
              >
                <span className="cv-excel-import-choice-title">Phân tích ảnh</span>
                <span className="cv-excel-import-choice-desc">
                  Resize + contrast + OCR trước, rồi AI lọc tối đa {MAX_PREVIEW_WORDS} từ.
                </span>
              </button>
            </div>

            {selectedFile ? (
              <div className="cv-image-import-selected">
                <strong>Đã chọn:</strong> {selectedFile.name}
              </div>
            ) : null}

            {imageDataUrl ? (
              <div className="cv-image-import-preview">
                <img src={imageDataUrl} alt="Preview" />
              </div>
            ) : null}

            {errorMsg ? <div className="cv-excel-import-error">{errorMsg}</div> : null}
          </div>

          <div className="cv-modal-footer cv-modal-footer-split">
            <button className="btn btn-secondary" onClick={handleClose}>Hủy</button>
            <button className="cv-btn-ai cv-btn-ai-large" onClick={handleAnalyzeImage} disabled={!imageDataUrl}>
              Phân tích ảnh
            </button>
          </div>
        </>
      )}

      {status === 'loading' && (
        <div className="cv-modal-body">
          <div className="cv-ai-loading">
            <div className="cv-ai-spinner"></div>
            <p>Hệ thống đang tiền xử lý ảnh, scan OCR rồi lọc tối đa {MAX_PREVIEW_WORDS} từ...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="cv-modal-body">
          <div className="cv-ai-error">
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>?</div>
            <p>
              Cần kiểm tra lại ảnh hoặc thử một ảnh khác.
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
            <div className="cv-ai-preview-header" data-selected={`${selectedIndexes.size}/${MAX_SELECTABLE_WORDS}`}>
              <p>
                OCR + AI tìm được <strong>{previewWords.length} từ</strong> từ ảnh đã tải lên.
              </p>
              <label className="cv-ai-select-all-wrap">
                <input
                  type="checkbox"
                  checked={previewWords.length > 0 && selectedIndexes.size === Math.min(previewWords.length, MAX_SELECTABLE_WORDS)}
                  onChange={handleToggleAll}
                />
                <span>Chọn tất cả</span>
              </label>
            </div>

            <div className="cv-ai-preview-table cv-image-preview-table">
              <div className="cv-ai-preview-head cv-image-preview-head">
                <span></span>
                <span>Word</span>
                <span>Mean</span>
                <span>Loại từ</span>
              </div>

              {previewWords.map((word, index) => (
                <div key={`${word.word}-${index}`} className="cv-ai-preview-row cv-image-preview-row" onClick={() => handleToggleCheck(index)}>
                  <div className="cv-ai-check-wrap">
                    <label className="cv-ai-check-wrap" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="cv-ai-chk"
                        checked={selectedIndexes.has(index)}
                        disabled={!selectedIndexes.has(index) && selectedIndexes.size >= MAX_SELECTABLE_WORDS}
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
