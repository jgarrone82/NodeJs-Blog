/**
 * Wraps an async route handler to forward errors to Express error middleware.
 * Eliminates the need for try/catch in every route handler.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (request, response, next) => {
    Promise.resolve(fn(request, response, next)).catch(next)
  }
}

module.exports = asyncHandler
