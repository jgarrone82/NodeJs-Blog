const jwt = require('jsonwebtoken')
const config = require('../config/env')
const { AuthenticationError } = require('../errors')

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer scheme).
 * Attaches decoded payload to request.user.
 */
function authenticateJWT(request, response, next) {
  const authHeader = request.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // "Bearer <token>"

  if (!token) {
    throw new AuthenticationError('Token de acceso requerido')
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret)
    request.user = payload
    next()
  } catch (error) {
    throw new AuthenticationError('Token inválido o expirado')
  }
}

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      pseudonimo: user.pseudonimo
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

module.exports = { authenticateJWT, generateToken }
