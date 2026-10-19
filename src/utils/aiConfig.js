const DEFAULT_AI_MODEL = 'openai/gpt-oss-120b';

function isLocalhostUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1)(:\d+)?(\/|$)/i.test(url || '');
}

function resolveAiProxyUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');

  if (configuredBaseUrl) {
    if (import.meta.env.PROD && isLocalhostUrl(configuredBaseUrl)) {
      return undefined;
    }

    return `${configuredBaseUrl}/ai/chat/completions`;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return 'http://localhost:4000/vocabup-api/ai/chat/completions';
    }

    return `${origin}/vocabup-api/ai/chat/completions`;
  }

  return '/vocabup-api/ai/chat/completions';
}

export const AI_API_URL =
  resolveAiProxyUrl() || '/vocabup-api/ai/chat/completions';

export const AI_MODEL =
  import.meta.env.AI_MODEL ||
  import.meta.env.AI_MODEL_OLD ||
  DEFAULT_AI_MODEL;
