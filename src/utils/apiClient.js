function isLocalhostHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalhostUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1)(:\d+)?(\/|$)/i.test(url);
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
  if (configuredBaseUrl) {
    if (import.meta.env.PROD && isLocalhostUrl(configuredBaseUrl)) {
      return undefined;
    }

    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (isLocalhostHost(hostname)) {
      return 'http://localhost:4000/vocabup-api';
    }

    return `${origin}/vocabup-api`;
  }

  return '/vocabup-api';
}

const API_BASE_URL = resolveApiBaseUrl() || '/vocabup-api';

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function normalizePath(path) {
  return path.replace(/^\/+/, '');
}

function buildApiUrl(path) {
  const base = normalizeBaseUrl(API_BASE_URL);
  const normalizedPath = normalizePath(path);

  if (base.endsWith('/vocabup-api')) {
    const pathWithoutBase = normalizedPath.replace(/^vocabup-api\/?/i, '');
    return `${base}/${pathWithoutBase}`;
  }

  return `${base}/${normalizedPath}`;
}

export { API_BASE_URL, buildApiUrl };
