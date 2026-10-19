const path = require('path');
const crypto = require('crypto');
const { supabaseAdmin, hasSupabaseAdmin } = require('../supabase');

const toeicBucket = process.env.SUPABASE_STORAGE_TOEIC_BUCKET || 'toeic-media';
const useSupabaseStorage = process.env.USE_SUPABASE_STORAGE === 'true' && hasSupabaseAdmin;

function buildStorageObjectPath(file, folder) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  return `${folder}/${Date.now()}-${randomSuffix}${extension}`;
}

async function uploadToeicFile(file, folder) {
  if (!useSupabaseStorage || !supabaseAdmin) {
    throw new Error('Supabase Storage is not enabled.');
  }

  const objectPath = buildStorageObjectPath(file, folder);
  const uploadResult = await supabaseAdmin.storage
    .from(toeicBucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const publicUrlResult = supabaseAdmin.storage.from(toeicBucket).getPublicUrl(objectPath);
  return {
    filename: path.basename(objectPath),
    path: objectPath,
    bucket: toeicBucket,
    url: publicUrlResult.data.publicUrl,
  };
}

module.exports = {
  toeicBucket,
  useSupabaseStorage,
  uploadToeicFile,
};
