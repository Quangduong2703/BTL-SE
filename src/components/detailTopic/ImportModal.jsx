import { useState, useRef } from 'react';

// ─── CSV Parser ────────────────────────────────────────────────────────────────
const HEADER_ALIASES = {
    word: ['word', 'từ', 'vocabulary', 'term', 'từ vựng'],
    transcription: ['transcription', 'phiên âm', 'phonetic', 'pronunciation'],
    mean: ['mean', 'meaning', 'nghĩa', 'definition', 'translation', 'dịch'],
    wordtype: ['wordtype', 'type', 'loại từ', 'pos', 'part of speech', 'loai tu'],
    example: ['example', 'ví dụ', 'sentence', 'sample', 'vi du'],
};

function detectDelimiter(text) {
    const first = text.split('\n')[0] || '';
    if (first.includes('\t')) return '\t';
    if (first.includes(';')) return ';';
    return ',';
}

function parseCSV(rawText) {
    const text = rawText.replace(/\r/g, '');
    const delimiter = detectDelimiter(text);
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return { rows: [], error: 'File quá ngắn hoặc trống.' };

    const rawHeaders = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    // Map header index to field name
    const fieldMap = {};
    rawHeaders.forEach((h, i) => {
        for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.includes(h) && !(field in fieldMap)) {
                fieldMap[field] = i;
            }
        }
    });

    if (!('word' in fieldMap) && !('mean' in fieldMap)) {
        return {
            rows: [],
            error: 'Không tìm thấy cột "word" hoặc "mean". Kiểm tra lại header của file. Cần ít nhất cột "word" và "mean".',
        };
    }

    const rows = lines
        .slice(1)
        .map((line, i) => {
            const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
            const get = (field) => (fieldMap[field] !== undefined ? cols[fieldMap[field]] || '' : '');
            return {
                _idx: i,
                _valid: !!get('word'),
                word: get('word'),
                transcription: get('transcription'),
                mean: get('mean'),
                wordtype: get('wordtype'),
                example: get('example'),
            };
        })
        .filter((r) => r.word || r.mean);

    return { rows, error: null };
}

const TEMPLATE_CSV =
    'data:text/csv;charset=utf-8,word,transcription,mean,wordtype,example\napple,%2F%CB%88%C3%A6p.%C9%99l%2F,qu%E1%BA%A3+t%C3%A1o,noun,I+eat+an+apple+every+day.\nrun,%2Fr%CA%8Cn%2F,ch%E1%BA%A1y,verb,She+runs+every+morning.';

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ImportModal({ isOpen, onClose, onSave }) {
    const [parsed, setParsed] = useState(null);
    const [fileName, setFileName] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const reset = () => {
        setParsed(null);
        setFileName('');
        setSelected(new Set());
        setError('');
    };

    const handleFile = (file) => {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'txt', 'tsv'].includes(ext)) {
            setError('Chỉ hỗ trợ file .csv, .txt hoặc .tsv');
            return;
        }
        setFileName(file.name);
        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = parseCSV(e.target.result);
            setParsed(result);
            if (result.error) {
                setError(result.error);
            } else {
                setSelected(new Set(result.rows.filter((r) => r._valid).map((r) => r._idx)));
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const toggleRow = (idx) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleAll = () => {
        if (!parsed?.rows) return;
        if (selected.size === parsed.rows.length) setSelected(new Set());
        else setSelected(new Set(parsed.rows.map((r) => r._idx)));
    };

    const handleSave = () => {
        if (!parsed) return;
        const toImport = parsed.rows
            .filter((r) => selected.has(r._idx))
            // eslint-disable-next-line no-unused-vars
            .map(({ _idx, _valid, ...word }) => word);
        onSave(toImport);
        reset();
        onClose();
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    if (!isOpen) return null;

    const selectedCount = selected.size;

    return (
        <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="import-modal">
                {/* Header */}
                <div className="import-modal-hd">
                    <h2 className="import-modal-title">📥 Import từ vựng</h2>
                    <button className="import-modal-x" onClick={handleClose} aria-label="Đóng">✕</button>
                </div>

                {/* Step 1: Upload */}
                {!parsed && (
                    <div className="import-step-upload">
                        <div className="import-hint-box">
                            <p>Upload file <strong>CSV</strong> với các cột:</p>
                            <code className="import-hint-code">word, transcription, mean, wordtype, example</code>
                            <p className="import-hint-sub">Hàng đầu tiên là header. Cột <strong>word</strong> và <strong>mean</strong> là bắt buộc.</p>
                        </div>

                        <div
                            className={`import-dropzone${dragOver ? ' drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                        >
                            <div className="import-dz-icon">📁</div>
                            <p className="import-dz-main">Kéo thả file vào đây</p>
                            <p className="import-dz-sub">hoặc <span className="import-dz-link">nhấn để chọn file</span></p>
                            <p className="import-dz-types">Hỗ trợ: .csv · .txt · .tsv</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,.tsv"
                                className="import-file-hidden"
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                        </div>

                        {error && <div className="import-err-msg">⚠️ {error}</div>}

                        <div className="import-template-row">
                            <span>Chưa có file?</span>
                            <a className="import-template-link" href={TEMPLATE_CSV} download="template.csv">
                                ⬇ Tải template mẫu
                            </a>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview & Select */}
                {parsed && !parsed.error && (
                    <div className="import-step-preview">
                        <div className="import-file-bar">
                            <span className="import-file-name">📄 {fileName}</span>
                            <span className="import-file-count">{parsed.rows.length} từ phát hiện</span>
                            <button className="import-change-btn" onClick={reset}>Đổi file</button>
                        </div>

                        <div className="import-preview-ctrl">
                            <label className="import-select-all-label">
                                <input
                                    type="checkbox"
                                    checked={selectedCount === parsed.rows.length && parsed.rows.length > 0}
                                    onChange={toggleAll}
                                />
                                Chọn tất cả ({selectedCount}/{parsed.rows.length})
                            </label>
                        </div>

                        <div className="import-table-wrap">
                            <table className="import-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Từ vựng</th>
                                        <th>Phiên âm</th>
                                        <th>Nghĩa</th>
                                        <th>Loại từ</th>
                                        <th>Ví dụ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsed.rows.map((row) => (
                                        <tr
                                            key={row._idx}
                                            className={`import-row${selected.has(row._idx) ? ' import-row-sel' : ''}${!row._valid ? ' import-row-invalid' : ''}`}
                                            onClick={() => row._valid && toggleRow(row._idx)}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(row._idx)}
                                                    disabled={!row._valid}
                                                    onChange={() => toggleRow(row._idx)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td><strong>{row.word || <span className="import-cell-empty">—</span>}</strong></td>
                                            <td>{row.transcription || '—'}</td>
                                            <td>{row.mean || <span className="import-cell-empty">—</span>}</td>
                                            <td>{row.wordtype || '—'}</td>
                                            <td className="import-cell-example">{row.example || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="import-modal-ft">
                            <span className="import-ft-count">{selectedCount} từ được chọn</span>
                            <button className="btn btn-secondary btn-small" onClick={handleClose}>Hủy</button>
                            <button
                                className="btn btn-primary btn-small"
                                disabled={selectedCount === 0}
                                onClick={handleSave}
                                id="import-confirm-btn"
                            >
                                Import {selectedCount} từ
                            </button>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {parsed?.error && (
                    <div className="import-err-state">
                        <div className="import-err-icon">⚠️</div>
                        <p>{parsed.error}</p>
                        <button className="btn btn-secondary btn-small" onClick={reset}>Thử lại</button>
                    </div>
                )}
            </div>
        </div>
    );
}
