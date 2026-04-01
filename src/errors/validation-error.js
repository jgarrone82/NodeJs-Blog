const AppError = require('./app-error')

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

module.exports = ValidationError
