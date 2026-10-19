function setPublicCache(res, maxAgeSeconds, staleWhileRevalidateSeconds = maxAgeSeconds) {
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`);
}

function setNoStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

module.exports = {
  setPublicCache,
  setNoStore,
};
