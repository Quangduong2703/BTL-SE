import { useEffect, useRef, useState } from 'react';
import { downloadCustomTopicSampleFile, parseCustomTopicImportFile } from '../../utils/customTopicExcel';

export default function CustomTopicExcelImportModal({ isOpen, onClose, onImport }) {
  const fileInputRef = useRef(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setIsBusy(false);
      setErrorMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const closeModal = () => {
    if (isBusy) return;
    onClose();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isBusy) return;

    setIsBusy(true);
    setErrorMessage('');

    try {
      const rows = await parseCustomTopicImportFile(file);
      const result = await onImport(rows, file);
      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }
      onClose();
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể import file Excel.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="cv-modal-overlay cv-modal-active" onClick={(event) => event.target === event.currentTarget && closeModal()}>
      <div className="cv-modal-box cv-excel-import-modal">
        <div className="cv-modal-header">
          <h3 className="cv-modal-title-with-icon">
            <span aria-hidden="true">📥</span>
            Import từ file Excel
          </h3>
          <button type="button" className="cv-modal-close" onClick={closeModal} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="cv-modal-body cv-excel-import-body">
          <div className="cv-excel-import-copy">
            <p>Chọn file Excel để thêm hàng loạt từ vựng vào topic hiện tại.</p>
            <p>
              Hệ thống đọc các cột: <strong>word</strong>, <strong>transcription</strong>, <strong>mean</strong>,{' '}
              <strong>wordtype</strong>, <strong>example</strong>, <strong>example_vi</strong>.
            </p>
          </div>

          <input
            ref={fileInputRef}
            className="cv-excel-import-file"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
          />

          {errorMessage ? <div className="cv-excel-import-error">{errorMessage}</div> : null}

          <div className="cv-excel-import-actions">
            <button
              type="button"
              className="cv-excel-import-choice cv-excel-import-choice-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              <span className="cv-excel-import-choice-title">{isBusy ? 'Đang xử lý...' : 'Chọn file Excel'}</span>
              <span className="cv-excel-import-choice-desc">Tải dữ liệu từ file .xlsx hoặc .xls</span>
            </button>

            <button
              type="button"
              className="cv-excel-import-choice"
              onClick={downloadCustomTopicSampleFile}
              disabled={isBusy}
            >
              <span className="cv-excel-import-choice-title">Tải file Excel mẫu</span>
              <span className="cv-excel-import-choice-desc">Có sẵn header và dữ liệu ví dụ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
