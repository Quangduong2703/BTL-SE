require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function assertCheck(name, ok, details = '') {
  process.stdout.write(`${ok ? 'OK' : 'FAIL'} ${name}${details ? `: ${details}` : ''}\n`);
  return ok;
}

function checkIncludes(filePath, snippets) {
  if (!exists(filePath)) {
    return { ok: false, details: 'file missing' };
  }

  const content = read(filePath);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      return { ok: false, details: `missing "${snippet}"` };
    }
  }

  return { ok: true, details: '' };
}

async function main() {
  const root = path.join(__dirname, '..', '..');

  const checks = [
    {
      name: 'Production baseline migration',
      ...checkIncludes(path.join(root, 'supabase', 'migrations', '0014_reset_public_schema.sql'), ['create table', 'profiles']),
    },
    {
      name: 'Runtime API resolution',
      ...checkIncludes(path.join(root, 'src', 'utils', 'axiosClient.js'), ['resolveApiBaseUrl', 'window.location']),
    },
    {
      name: 'API helper resolution',
      ...checkIncludes(path.join(root, 'src', 'utils', 'apiClient.js'), ['resolveApiBaseUrl', 'window.location']),
    },
    {
      name: 'Auth routes',
      ...checkIncludes(path.join(root, 'server', 'routes', 'authRoutes.js'), ['google/start', 'google/complete', 'session']),
    },
    {
      name: 'Login flow',
      ...checkIncludes(path.join(root, 'src', 'pages', 'Login.jsx'), ['supabase.auth.signInWithPassword', 'supabase.auth.signInWithOAuth']),
    },
    {
      name: 'Supabase model layer',
      ...checkIncludes(path.join(root, 'server', 'lib', 'supabaseData.js'), ['ensureSupabaseEnabled', 'fetchTopicsWithVocabularyCounts']),
    },
  ];

  let failed = false;
  for (const check of checks) {
    const ok = assertCheck(check.name, check.ok, check.details);
    if (!ok) failed = true;
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Baseline verification passed.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
