const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || crypto.randomUUID();
  let status = err.status || err.statusCode || 500;
  if (typeof status !== 'number' || status < 400 || status > 599) {
    status = 500;
  }

  // Handle specific CORS rejection
  if (err.message === 'Not allowed by CORS') {
    status = 403;
  }

  // Log full stack server-side with request ID
  console.error(`[Error] [RequestId: ${requestId}] ${status} ${req.method} ${req.originalUrl || req.url}:`, err.stack || err);

  const isProduction = process.env.NODE_ENV === 'production';

  // In production, sanitize 5xx errors to generic message
  if (status >= 500) {
    if (isProduction) {
      return res.status(status).json({
        error: 'Internal server error',
        requestId
      });
    }
    return res.status(status).json({
      error: err.message || 'Internal server error',
      requestId
    });
  }

  // Keep detailed messages only for 4xx client errors (validation, auth, not found)
  return res.status(status).json({
    error: err.message || 'Bad Request',
    requestId
  });
}

module.exports = {
  requestIdMiddleware,
  errorHandler
};
