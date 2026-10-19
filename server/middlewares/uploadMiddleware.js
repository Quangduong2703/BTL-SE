const multer = require('multer');
const path = require('path');
const { useSupabaseStorage } = require('../lib/supabaseStorage');

const uploadDir = path.join(__dirname, '../uploads/toeic');

const memoryStorage = multer.memoryStorage();
const isVercelRuntime = Boolean(process.env.VERCEL);

const diskStorage = useSupabaseStorage || isVercelRuntime
  ? null
  : multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${timestamp}-${random}${ext}`);
    },
  });

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  'audio/x-m4a',
  'audio/aac',
];

function fileFilter(req, file, cb) {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
}

const upload = multer({
  storage: useSupabaseStorage || isVercelRuntime ? memoryStorage : diskStorage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

const toeicUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'audios', maxCount: 10 },
]);

module.exports = {
  toeicUpload,
};
