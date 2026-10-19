require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabaseAdmin } = require('../supabase');

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const bucketName = process.env.SUPABASE_STORAGE_TOEIC_BUCKET || 'toeic-media';
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw listError;
  }

  const existing = (buckets || []).find((bucket) => bucket.name === bucketName);
  if (existing) {
    process.stdout.write(`Bucket ${bucketName} already exists.\n`);
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '50MB',
  });

  if (createError) {
    throw createError;
  }

  process.stdout.write(`Created bucket ${bucketName}.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
