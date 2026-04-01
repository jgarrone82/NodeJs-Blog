const AppError = require('./app-error')

class DatabaseError extends AppError {
  constructor(message = 'Database error occurred') {
    super(message, 500)
    this.name = 'DatabaseError'
  }
}

module.exports = DatabaseError
