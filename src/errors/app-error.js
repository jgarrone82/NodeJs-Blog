/**
 * Base application error class.
 * All custom errors extend from this to provide consistent
 * status codes, messages, and operational flags.
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError
