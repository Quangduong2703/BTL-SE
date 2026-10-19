const express = require('express');
const path = require('path');
const cors = require('cors');
const progressRoutes = require('./routes/progressRoutes');
const toeicUploadRoutes = require('./routes/toeicUploadRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const topicsRoutes = require('./routes/topicsRoutes');
const srsRoutes = require('./routes/srsRoutes');
const toeicRoutes = require('./routes/toeicRoutes');
const wordProgressRoutes = require('./routes/wordProgressRoutes');
const supportRoutes = require('./routes/supportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { useSupabaseStorage } = require('./lib/supabaseStorage');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

const BODY_SIZE_LIMIT = '25mb';

const app = express();

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(origin || '');
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (isLocalOrigin(origin)) {
    return true;
  }

  return /^https:\/\/.*\.vercel\.app$/i.test(origin) || /^https:\/\/.*\.vercel\.app\/?$/i.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));
if (!useSupabaseStorage) {
  app.use('/uploads/toeic', express.static(path.join(__dirname, 'uploads/toeic')));
}

app.use('/vocabup-api/auth', authRoutes);
app.use('/vocabup-api/admin', adminRoutes);
app.use('/vocabup-api/courses', coursesRoutes);
app.use('/vocabup-api/topics', topicsRoutes);
app.use('/vocabup-api/srs', srsRoutes);
app.use('/vocabup-api/progress', progressRoutes);
app.use('/vocabup-api/word-progress', wordProgressRoutes);
app.use('/vocabup-api/toeic-upload', toeicUploadRoutes);
app.use('/vocabup-api/toeic', toeicRoutes);
app.use('/vocabup-api/support', supportRoutes);
app.use('/vocabup-api/ai', aiRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);


module.exports = app;
