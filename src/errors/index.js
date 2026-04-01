const AppError = require('./app-error')
const ValidationError = require('./validation-error')
const AuthenticationError = require('./authentication-error')
const AuthorizationError = require('./authorization-error')
const NotFoundError = require('./not-found-error')
const DatabaseError = require('./database-error')

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError
}
