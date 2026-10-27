const pino = require('pino');

/**
 * Centralized Structured JSON Logger
 * Outputs JSON logs formatted with level, time, requestId, route, durationMs
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: {
    pid: process.pid
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = {
  logger
};
