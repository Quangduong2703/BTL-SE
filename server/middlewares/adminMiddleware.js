function adminMiddleware(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = {
  adminMiddleware,
};
