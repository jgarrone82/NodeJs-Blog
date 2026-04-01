const AppError = require('./app-error')

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

module.exports = AuthenticationError
