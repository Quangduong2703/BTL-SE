function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

function globalErrorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const message = err.type === 'entity.too.large'
    ? 'Payload quá lớn. Hãy giảm kích thước file import hoặc tăng giới hạn body của server.'
    : (err.message || 'Internal Server Error');

  res.status(status).json({
    error: message,
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
