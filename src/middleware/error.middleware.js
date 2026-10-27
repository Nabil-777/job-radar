const crypto = require('crypto');
const { logger } = require('../utils/logger');

function requestIdMiddleware(req, res, next) {
  const start = Date.now();
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const route = req.originalUrl || req.url;
    logger.info({
      requestId: req.id,
      route,
      method: req.method,
      statusCode: res.statusCode,
      durationMs
    }, `${req.method} ${route} ${res.statusCode} in ${durationMs}ms`);
  });

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

  // Structured logging with requestId, route, and full error details
  logger.error({
    requestId,
    route: req.originalUrl || req.url,
    method: req.method,
    statusCode: status,
    err: err.stack || err.message
  }, `[Error] [RequestId: ${requestId}] ${status} ${req.method} ${req.originalUrl || req.url}: ${err.stack || err.message}`);

  // Interceptable console.error for test assertion harnesses
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
