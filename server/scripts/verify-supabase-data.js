require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabaseAdmin } = require('../supabase');

const TABLE_MAPPINGS = [
  { mysql: 'Users', supabase: 'profiles' },
  { mysql: 'Courses', supabase: 'courses' },
  { mysql: 'Topics', supabase: 'topics' },
  { mysql: 'Flashcards', supabase: 'flashcards' },
  { mysql: 'User_Progress', supabase: 'user_progress' },
  { mysql: 'User_Word_Progress', supabase: 'user_word_progress', optional: true },
  { mysql: 'SRS_Reviews', supabase: 'srs_reviews' },
  { mysql: 'Toeic_Tests', supabase: 'toeic_tests', optional: true },
  { mysql: 'Toeic_Question_Groups', supabase: 'toeic_question_groups', optional: true },
  { mysql: 'Toeic_Questions', supabase: 'toeic_questions', optional: true },
  { mysql: 'Toeic_Test_Records', supabase: 'toeic_test_records', optional: true },
  { mysql: 'Support_Tickets', supabase: 'support_tickets', optional: true },
  { mysql: 'Vocab_Activity_Logs', supabase: 'vocab_activity_logs', optional: true },
];

const shouldCompareWithMysql = process.env.VERIFY_WITH_MYSQL === 'true';
let mysqlPool = null;

function getMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = require('../db');
  }
  return mysqlPool;
}

async function mysqlTableExists(tableName) {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function getMysqlCount(tableName) {
  const pool = getMysqlPool();
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  return Number(rows[0]?.total || 0);
}

async function getSupabaseCount(tableName) {
  const { count, error } = await supabaseAdmin.from(tableName).select('*', { head: true, count: 'exact' });
  if (error) throw error;
  return Number(count || 0);
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  let hasMismatch = false;

  for (const mapping of TABLE_MAPPINGS) {
    const supabaseCount = await getSupabaseCount(mapping.supabase);
    if (!shouldCompareWithMysql) {
      process.stdout.write(`OK ${mapping.supabase} | supabase=${supabaseCount}\n`);
      continue;
    }

    const exists = await mysqlTableExists(mapping.mysql);
    if (!exists) {
      if (!mapping.optional) {
        hasMismatch = true;
        process.stdout.write(`FAIL mysql table missing: ${mapping.mysql}\n`);
      } else {
        process.stdout.write(`SKIP optional mysql table missing: ${mapping.mysql}\n`);
      }
      continue;
    }

    const mysqlCount = await getMysqlCount(mapping.mysql);
    const match = mysqlCount === supabaseCount;
    if (!match) {
      hasMismatch = true;
    }

    process.stdout.write(
      `${match ? 'OK' : 'FAIL'} ${mapping.mysql} -> ${mapping.supabase} | mysql=${mysqlCount} supabase=${supabaseCount}\n`
    );
  }

  if (mysqlPool) {
    await mysqlPool.end();
  }

  if (hasMismatch) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Supabase data verification passed.\n');
}

main().catch(async (error) => {
  console.error(error);
  if (mysqlPool) {
    await mysqlPool.end().catch(() => undefined);
  }
  process.exit(1);
});
