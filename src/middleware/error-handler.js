const config = require('../config/env')
const logger = require('../logger')

/**
 * Global error handling middleware.
 * Must be registered AFTER all routes in webapp.js.
 *
 * Handles:
 * - Custom AppError instances (operational errors)
 * - Unhandled exceptions (programming errors)
 * - Different response formats for API vs web requests
 */
function errorHandler(error, request, response, next) {
  // Default values
  let statusCode = error.statusCode || 500
  let message = error.message || 'Error interno del servidor'

  // Determine if this is an API request
  const isApi = request.path.startsWith('/api/')

  // Log the error
  if (statusCode >= 500) {
    logger.error({
      statusCode,
      method: request.method,
      path: request.path,
      stack: error.stack
    }, error.message || 'Internal Server Error')
  } else {
    logger.warn({
      statusCode,
      method: request.method,
      path: request.path,
      message
    }, message)
  }

  if (isApi) {
    // API response format
    const body = {
      error: {
        message: statusCode === 500 && !config.server.isDev
          ? 'Error interno del servidor'
          : message,
        code: error.code || statusCode
      }
    }

    // Include stack trace only in development
    if (config.server.isDev && error.stack) {
      body.error.stack = error.stack.split('\n')
    }

    // Include validation details if available
    if (error.details) {
      body.error.details = error.details
    }

    return response.status(statusCode).json(body)
  }

  // Web response format
  if (statusCode === 404) {
    return response.status(404).render('errors/404', {
      message: 'Página no encontrada',
      url: request.originalUrl
    })
  }

  if (statusCode === 401) {
    request.flash('mensaje', message)
    return response.redirect('/inicio')
  }

  if (statusCode === 403) {
    request.flash('mensaje', message)
    return response.redirect('/admin/index')
  }

  // 500 and other errors
  return response.status(statusCode).render('errors/500', {
    message: config.server.isDev ? message : 'Error interno del servidor',
    error: config.server.isDev ? error : null
  })
}

/**
 * 404 handler — catches unmatched routes.
 * Must be registered AFTER all routes but BEFORE error handler.
 */
function notFoundHandler(request, response, next) {
  const isApi = request.path.startsWith('/api/')

  if (isApi) {
    return response.status(404).json({
      error: {
        message: `Endpoint not found: ${request.method} ${request.path}`,
        code: 404
      }
    })
  }

  response.status(404).render('errors/404', {
    message: 'Página no encontrada',
    url: request.originalUrl
  })
}

module.exports = { errorHandler, notFoundHandler }
