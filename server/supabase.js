require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';
const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL || '';

function isLikelyPublishableSupabaseKey(value) {
  return typeof value === 'string' && value.trim().startsWith('sb_publishable_');
}

function getSupabaseAdminConfigError() {
  if (!supabaseUrl) {
    const error = new Error('SUPABASE_URL is not configured.');
    error.status = 500;
    return error;
  }

  if (!supabaseServiceRoleKey) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
    error.status = 500;
    return error;
  }

  if (isLikelyPublishableSupabaseKey(supabaseServiceRoleKey)) {
    const error = new Error(
      'SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. Use the Supabase secret service_role key instead of the public sb_publishable_* key.',
    );
    error.status = 500;
    return error;
  }

  return null;
}

const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
const hasSupabaseAdmin = Boolean(supabaseUrl && supabaseServiceRoleKey && !isLikelyPublishableSupabaseKey(supabaseServiceRoleKey));
// In production we always want to use Supabase when the admin client exists.
// The old toggle-only behavior caused production to 500 when the flag was not
// explicitly enabled even though the database was correctly configured.
const useSupabaseDb = hasSupabaseAdmin;

const supabasePublic = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  : null;

const supabaseAdmin = hasSupabaseAdmin
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  : null;

function getSupabaseIssuer() {
  return `${supabaseUrl}/auth/v1`;
}

function getSupabaseJwksUrl() {
  return supabaseJwksUrl || `${getSupabaseIssuer()}/.well-known/jwks.json`;
}

async function findSupabaseAuthUserByEmail(email) {
  if (!supabaseAdmin || !email) return null;

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const matched = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (matched) return matched;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureSupabaseAuthUser({ email, password, name }) {
  if (!supabaseAdmin) {
    return null;
  }

  const existing = await findSupabaseAuthUserByEmail(email);
  if (existing) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        name: name || existing.user_metadata?.name || null,
        full_name: name || existing.user_metadata?.full_name || null,
      },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name || null,
      full_name: name || null,
    },
  });

  if (error) throw error;
  return data.user;
}

async function createSupabaseAuthUser({ email, password, name }) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const existing = await findSupabaseAuthUserByEmail(email);
  if (existing) {
    const error = new Error('Email already in use');
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name || null,
      full_name: name || null,
    },
  });

  if (error) throw error;
  return data.user;
}

async function deleteSupabaseAuthUserById(userId) {
  if (!supabaseAdmin || !userId) return false;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return true;
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildGoogleOAuthUrl({ redirectTo, codeChallenge, state }) {
  const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('state', state);
  return url.toString();
}

function createPkceCodeVerifier() {
  return base64Url(require('crypto').randomBytes(32));
}

async function exchangeSupabaseOAuthCode({ code, codeVerifier }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth client is not configured.');
  }

  const storageKey = 'vocabup-oauth';
  const storageValue = `${codeVerifier}/pkce`;
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey,
      storage: {
        getItem: async (key) => (key === `${storageKey}-code-verifier` ? storageValue : null),
        setItem: async () => undefined,
        removeItem: async () => undefined,
      },
    },
  });

  return tempClient.auth.exchangeCodeForSession(code);
}

module.exports = {
  supabasePublic,
  supabaseAdmin,
  isSupabaseConfigured,
  hasSupabaseAdmin,
  getSupabaseAdminConfigError,
  useSupabaseDb,
  supabaseUrl,
  supabaseAnonKey,
  getSupabaseIssuer,
  getSupabaseJwksUrl,
  ensureSupabaseAuthUser,
  createSupabaseAuthUser,
  findSupabaseAuthUserByEmail,
  deleteSupabaseAuthUserById,
  buildGoogleOAuthUrl,
  createPkceCodeVerifier,
  exchangeSupabaseOAuthCode,
};
