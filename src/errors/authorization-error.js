const AppError = require('./app-error')

class AuthorizationError extends AppError {
  constructor(message = 'Operation not allowed') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

module.exports = AuthorizationError
