const { Readable } = require('stream');
const { getOrSet } = require('../lib/ttlCache');

const NON_STREAM_CACHE_TTL_MS = 5 * 60 * 1000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeValue(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function buildCacheKey(body) {
  return JSON.stringify(normalizeValue(body || {}));
}

async function fetchUpstream(upstreamUrl, apiKey, body) {
  const upstreamResponse = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body || {}),
  });

  const contentType = upstreamResponse.headers.get('content-type') || '';

  return {
    status: upstreamResponse.status,
    contentType,
    bodyText: await upstreamResponse.text(),
  };
}

async function fetchUpstreamWithFallback(upstreamUrl, apiKey, body, fallbackModel) {
  const primaryBody = { ...(body || {}) };
  if (!primaryBody.model && process.env.AI_MODEL) {
    primaryBody.model = process.env.AI_MODEL;
  }

  const primaryResponse = await fetchUpstream(upstreamUrl, apiKey, primaryBody);
  const normalizedPrimaryModel = String(primaryBody.model || '').trim();
  const normalizedFallbackModel = String(fallbackModel || '').trim();
  const canFallback =
    Boolean(normalizedFallbackModel) &&
    normalizedFallbackModel !== normalizedPrimaryModel &&
    primaryResponse.status >= 400;

  if (!canFallback) {
    return primaryResponse;
  }

  const fallbackResponse = await fetchUpstream(upstreamUrl, apiKey, {
    ...primaryBody,
    model: normalizedFallbackModel,
  });

  return fallbackResponse.status < 400 ? fallbackResponse : primaryResponse;
}

async function fetchStreamingUpstreamWithFallback(upstreamUrl, apiKey, body, fallbackModel) {
  const primaryBody = { ...(body || {}) };
  if (!primaryBody.model && process.env.AI_MODEL) {
    primaryBody.model = process.env.AI_MODEL;
  }

  const primaryResponse = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(primaryBody),
  });

  const normalizedFallbackModel = String(fallbackModel || '').trim();
  const normalizedPrimaryModel = String(primaryBody.model || '').trim();
  const canFallback =
    Boolean(normalizedFallbackModel) &&
    normalizedFallbackModel !== normalizedPrimaryModel &&
    primaryResponse.status >= 400;

  if (!canFallback) {
    return primaryResponse;
  }

  try {
    await primaryResponse.text();
  } catch {
    /* ignore */
  }

  return fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...primaryBody,
      model: normalizedFallbackModel,
    }),
  });
}

async function proxyAiChatCompletion(req, res, next) {
  try {
    const upstreamUrl = process.env.AI_UPSTREAM_URL;
    const apiKey = process.env.AI_UPSTREAM_KEY;
    const fallbackModel = process.env.AI_MODEL_OLD;

    if (!upstreamUrl || !apiKey) {
      return res.status(500).json({
        error: {
          message: 'AI configuration is missing. Please set AI_UPSTREAM_URL and AI_UPSTREAM_KEY in .env.',
        },
      });
    }

    const requestBody = req.body || {};
    const shouldCache = requestBody.stream === false;

    if (shouldCache) {
      const cacheKey = `ai:${buildCacheKey(requestBody)}`;
      const cachedResult = await getOrSet(
        cacheKey,
        NON_STREAM_CACHE_TTL_MS,
        () => fetchUpstreamWithFallback(upstreamUrl, apiKey, requestBody, fallbackModel),
      );

      res.status(cachedResult.status);
      if (cachedResult.contentType) {
        res.setHeader('Content-Type', cachedResult.contentType);
      }

      return res.send(cachedResult.bodyText);
    }

    const upstreamResponse = await fetchStreamingUpstreamWithFallback(upstreamUrl, apiKey, requestBody, fallbackModel);

    res.status(upstreamResponse.status);

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    if (!upstreamResponse.body) {
      const text = await upstreamResponse.text();
      return res.send(text);
    }

    return Readable.fromWeb(upstreamResponse.body).pipe(res);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  proxyAiChatCompletion,
};
