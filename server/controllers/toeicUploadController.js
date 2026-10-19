const { uploadToeicFile, useSupabaseStorage } = require('../lib/supabaseStorage');

async function uploadFiles(req, res, next) {
  try {
    if (useSupabaseStorage) {
      const imageFiles = req.files?.images || [];
      const audioFiles = req.files?.audios || [];

      const savedFiles = {
        images: await Promise.all(imageFiles.map((file) => uploadToeicFile(file, 'images'))),
        audios: await Promise.all(audioFiles.map((file) => uploadToeicFile(file, 'audios'))),
      };

      return res.json({
        message: 'TOEIC files uploaded successfully to Supabase Storage.',
        files: savedFiles,
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const savedFiles = {
      images: req.files?.images?.map((file) => ({
        filename: file.filename,
        url: `${baseUrl}/uploads/toeic/${file.filename}`,
      })) || [],
      audios: req.files?.audios?.map((file) => ({
        filename: file.filename,
        url: `${baseUrl}/uploads/toeic/${file.filename}`,
      })) || [],
    };

    return res.json({
      message: 'TOEIC files uploaded successfully.',
      files: savedFiles,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadFiles,
};
