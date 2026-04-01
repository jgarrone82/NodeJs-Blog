const bcrypt = require('bcrypt')

/**
 * AuthService — Business logic for authentication operations.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class AuthService {
  constructor(pool) {
    this.pool = pool
  }

  /**
   * Authenticate a user by email and password.
   * Returns the user object if credentials are valid, null otherwise.
   */
  async login(email, password) {
    const [filas] = await this.pool.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )

    if (filas.length === 0) {
      return null
    }

    const coincide = await bcrypt.compare(password, filas[0].contrasena)
    if (!coincide) {
      return null
    }

    return filas[0]
  }

  /**
   * Register a new author.
   * Returns { id, email, pseudonimo } on success.
   * Throws Error if email or pseudonimo already exists.
   */
  async register({ email, pseudonimo, contrasena }) {
    const connection = await this.pool.getConnection()

    try {
      const emailLower = email.toLowerCase().trim()
      const pseudonimoTrimmed = pseudonimo.trim()

      const contrasenaHasheada = await bcrypt.hash(contrasena, 10)

      // Check for duplicate email
      const [filasEmail] = await connection.query(
        'SELECT * FROM autores WHERE email = ?',
        [emailLower]
      )
      if (filasEmail.length > 0) {
        throw new Error('Email duplicado')
      }

      // Check for duplicate pseudonimo
      const [filasPseudonimo] = await connection.query(
        'SELECT * FROM autores WHERE pseudonimo = ?',
        [pseudonimoTrimmed]
      )
      if (filasPseudonimo.length > 0) {
        throw new Error('Pseudonimo duplicado')
      }

      // Insert new author
      const [resultado] = await connection.query(
        'INSERT INTO autores (email, contrasena, pseudonimo) VALUES (?, ?, ?)',
        [emailLower, contrasenaHasheada, pseudonimoTrimmed]
      )

      return {
        id: resultado.insertId,
        email: emailLower,
        pseudonimo: pseudonimoTrimmed
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Update avatar for an author.
   */
  async updateAvatar(autorId, avatarFilename) {
    await this.pool.query(
      'UPDATE autores SET avatar = ? WHERE id = ?',
      [avatarFilename, autorId]
    )
  }

  /**
   * Check if an email exists.
   */
  async emailExists(email) {
    const [filas] = await this.pool.query(
      'SELECT id FROM autores WHERE email = ?',
      [email]
    )
    return filas.length > 0
  }

  /**
   * Check if a pseudonimo exists.
   */
  async pseudonimoExists(pseudonimo) {
    const [filas] = await this.pool.query(
      'SELECT id FROM autores WHERE pseudonimo = ?',
      [pseudonimo]
    )
    return filas.length > 0
  }
}

module.exports = AuthService
