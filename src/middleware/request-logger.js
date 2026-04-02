const logger = require('../logger')

/**
 * HTTP request logging middleware.
 * Logs: method, path, status code, response time, and user agent.
 */
function requestLogger(request, response, next) {
  const start = process.hrtime.bigint()

  // Log when response finishes
  response.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6 // Convert to milliseconds

    const level = response.statusCode >= 500 ? 'error'
      : response.statusCode >= 400 ? 'warn'
      : 'info'

    logger[level]({
      type: 'http',
      method: request.method,
      url: request.originalUrl,
      status: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.headers['x-forwarded-for']
    }, 'HTTP Request')
  })

  next()
}

module.exports = requestLogger
