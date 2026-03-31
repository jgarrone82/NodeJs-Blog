const rateLimit = require('express-rate-limit')

// Rate limiter for auth endpoints (login, registro)
// 5 attempts per 15 minutes — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos. Intente nuevamente en 15 minutos.'
})

// Rate limiter for API endpoints
// 100 requests per 15 minutes — prevents abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.'
})

// Rate limiter for general POST requests (non-auth)
// 20 requests per 15 minutes
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.'
})

module.exports = { authLimiter, apiLimiter, postLimiter }
