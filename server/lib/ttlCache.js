const cacheStore = new Map();

function now() {
  return Date.now();
}

function isExpired(entry) {
  return !entry || entry.expiresAt <= now();
}

function get(key) {
  const entry = cacheStore.get(key);
  if (isExpired(entry)) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
}

async function getOrSet(key, ttlMs, loader) {
  const cachedValue = get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const pendingEntry = cacheStore.get(key);
  if (pendingEntry?.promise) {
    return pendingEntry.promise;
  }

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      cacheStore.set(key, {
        value,
        expiresAt: now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    promise,
    expiresAt: now() + ttlMs,
  });

  return promise;
}

function deleteByPrefix(prefix) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = {
  getOrSet,
  deleteByPrefix,
};
