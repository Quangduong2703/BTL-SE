const express = require('express');
const { toeicUpload } = require('../middlewares/uploadMiddleware');
const { uploadFiles } = require('../controllers/toeicUploadController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

const router = express.Router();

router.post('/', authMiddleware, adminMiddleware, toeicUpload, uploadFiles);

module.exports = router;
