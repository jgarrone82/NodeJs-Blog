const bcrypt = require('bcrypt')
const prisma = require('../../db')

/**
 * AuthService — Business logic for authentication operations.
 * Uses Prisma ORM for database access.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class AuthService {
  /**
   * Authenticate a user by email and password.
   * Returns the user object if credentials are valid, null otherwise.
   */
  async login(email, password) {
    const autor = await prisma.autor.findUnique({
      where: { email }
    })

    if (!autor) {
      return null
    }

    const coincide = await bcrypt.compare(password, autor.contrasena)
    if (!coincide) {
      return null
    }

    return autor
  }

  /**
   * Register a new author.
   * Returns { id, email, pseudonimo } on success.
   * Throws Error if email or pseudonimo already exists.
   */
  async register({ email, pseudonimo, contrasena }) {
    const emailLower = email.toLowerCase().trim()
    const pseudonimoTrimmed = pseudonimo.trim()

    // Check for duplicate email
    const existingEmail = await prisma.autor.findUnique({
      where: { email: emailLower }
    })
    if (existingEmail) {
      throw new Error('Email duplicado')
    }

    // Check for duplicate pseudonimo
    const existingPseudonimo = await prisma.autor.findUnique({
      where: { pseudonimo: pseudonimoTrimmed }
    })
    if (existingPseudonimo) {
      throw new Error('Pseudonimo duplicado')
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10)

    const autor = await prisma.autor.create({
      data: {
        email: emailLower,
        contrasena: contrasenaHasheada,
        pseudonimo: pseudonimoTrimmed
      }
    })

    return {
      id: autor.id,
      email: autor.email,
      pseudonimo: autor.pseudonimo
    }
  }

  /**
   * Update avatar for an author.
   */
  async updateAvatar(autorId, avatarFilename) {
    await prisma.autor.update({
      where: { id: parseInt(autorId) },
      data: { avatar: avatarFilename }
    })
  }

  /**
   * Check if an email exists.
   */
  async emailExists(email) {
    const autor = await prisma.autor.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    return !!autor
  }

  /**
   * Check if a pseudonimo exists.
   */
  async pseudonimoExists(pseudonimo) {
    const autor = await prisma.autor.findUnique({
      where: { pseudonimo: pseudonimo.trim() }
    })
    return !!autor
  }
}

module.exports = AuthService
