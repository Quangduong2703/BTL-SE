require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabaseAdmin } = require('../supabase');

const REQUIRED_TABLES = [
  'profiles',
  'courses',
  'topics',
  'flashcards',
  'user_progress',
  'user_word_progress',
  'srs_reviews',
  'toeic_tests',
  'toeic_question_groups',
  'toeic_questions',
  'toeic_test_records',
  'support_tickets',
  'vocab_activity_logs',
];

async function checkTable(tableName) {
  const { error } = await supabaseAdmin.from(tableName).select('*', { head: true, count: 'exact' }).limit(1);
  return {
    tableName,
    ok: !error,
    error: error ? error.message : null,
  };
}

async function checkStorageBucket(bucketName) {
  const { data, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    return {
      bucketName,
      ok: false,
      error: error.message,
    };
  }

  const bucket = (data || []).find((item) => item.name === bucketName);
  return {
    bucketName,
    ok: Boolean(bucket),
    error: bucket ? null : 'Bucket not found',
  };
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const bucketName = process.env.SUPABASE_STORAGE_TOEIC_BUCKET || 'toeic-media';
  const tableResults = [];

  for (const tableName of REQUIRED_TABLES) {
    const result = await checkTable(tableName);
    tableResults.push(result);
    process.stdout.write(`${result.ok ? 'OK' : 'FAIL'} table ${tableName}${result.error ? `: ${result.error}` : ''}\n`);
  }

  const bucketResult = await checkStorageBucket(bucketName);
  process.stdout.write(`${bucketResult.ok ? 'OK' : 'FAIL'} bucket ${bucketName}${bucketResult.error ? `: ${bucketResult.error}` : ''}\n`);

  const failed = tableResults.filter((item) => !item.ok);
  if (failed.length || !bucketResult.ok) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Supabase schema verification passed.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
