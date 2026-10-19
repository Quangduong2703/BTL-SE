import * as XLSX from 'xlsx';

const HEADER_ALIASES = {
  word: ['word', 'từ', 'tu', 'vocabulary', 'term', 'từ vựng', 'tu vung'],
  transcription: ['transcription', 'phiên âm', 'phonetic', 'pronunciation'],
  mean: ['mean', 'meaning', 'nghĩa', 'definition', 'translation', 'dịch'],
  wordtype: ['wordtype', 'type', 'loại từ', 'part of speech', 'pos', 'loai tu'],
  example: ['example', 'ví dụ', 'sentence', 'sample', 'vi du'],
  example_vi: ['example_vi', 'example vi', 'translated example', 'example vietnamese', 'ví dụ vi'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeCell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function downloadWorkbook(workbook, fileName) {
  XLSX.writeFile(workbook, fileName, { compression: true });
}

function buildSampleWorkbook() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    [
      {
        word: 'schedule',
        transcription: '/ˈskedʒuːl/',
        mean: 'lịch trình',
        wordtype: 'noun',
        example: 'Please check the schedule before the meeting.',
        example_vi: 'Vui lòng kiểm tra lịch trình trước buổi họp.',
      },
      {
        word: 'confirm',
        transcription: '/kənˈfɜːrm/',
        mean: 'xác nhận',
        wordtype: 'verb',
        example: 'Please confirm your attendance by email.',
        example_vi: 'Vui lòng xác nhận việc tham dự của bạn qua email.',
      },
    ],
    {
      header: ['word', 'transcription', 'mean', 'wordtype', 'example', 'example_vi'],
    }
  );

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Words');
  return workbook;
}

function parseWorkbookRows(workbook) {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel không có sheet nào.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error('File Excel trống hoặc không có dữ liệu hợp lệ.');
  }

  const normalizedAliasMap = new Map();
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      normalizedAliasMap.set(normalizeHeader(alias), field);
    });
  });

  const parsedRows = rows
    .map((row, index) => {
      const resolved = {};
      Object.entries(row).forEach(([key, value]) => {
        const field = normalizedAliasMap.get(normalizeHeader(key));
        if (field && resolved[field] === undefined) {
          resolved[field] = normalizeCell(value);
        }
      });

      const word = normalizeCell(resolved.word);
      const mean = normalizeCell(resolved.mean);

      return {
        _idx: index,
        _valid: Boolean(word && mean),
        word,
        transcription: normalizeCell(resolved.transcription),
        mean,
        wordtype: normalizeCell(resolved.wordtype),
        example: normalizeCell(resolved.example),
        example_vi: normalizeCell(resolved.example_vi),
      };
    })
    .filter((row) => row.word || row.mean || row.transcription || row.wordtype || row.example || row.example_vi);

  if (!parsedRows.length) {
    throw new Error('Không tìm thấy dòng dữ liệu nào để import.');
  }

  const hasWordColumn = parsedRows.some((row) => row.word);
  const hasMeanColumn = parsedRows.some((row) => row.mean);
  if (!hasWordColumn || !hasMeanColumn) {
    throw new Error('File Excel cần có ít nhất 2 cột "word" và "mean".');
  }

  return parsedRows;
}

export async function parseCustomTopicImportFile(file) {
  const extension = String(file?.name || '')
    .toLowerCase()
    .split('.')
    .pop();

  if (!['xlsx', 'xls'].includes(extension)) {
    throw new Error('Chỉ hỗ trợ file Excel .xlsx hoặc .xls.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseWorkbookRows(workbook);
}

export function downloadCustomTopicSampleFile() {
  downloadWorkbook(buildSampleWorkbook(), 'custom-topic-import-sample.xlsx');
}
