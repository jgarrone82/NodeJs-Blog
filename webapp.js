require('dotenv').config()
const config = require('./src/config/env')
const express = require('express')
const helmet = require('helmet')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const aplicacion = express()
const session = require('express-session')
const flash = require('express-flash')
const fileUpload = require('express-fileupload')
const logger = require('./src/logger')
const requestLogger = require('./src/middleware/request-logger')

const rutasMiddleware = require('./routes/middleware')
const rutasPublicas = require('./routes/publicas')
const rutasPrivadas = require('./routes/privadas')
const rutasApi = require('./routes/api')
const { errorHandler, notFoundHandler } = require('./src/middleware/error-handler')

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NodeJs Blog API',
      version: '1.0.0',
      description: 'REST API for the travel blog application'
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/api.js']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

// Security headers
aplicacion.use(helmet({
  contentSecurityPolicy: false // Disabled until inline scripts are refactored
}))

aplicacion.use(express.json())
aplicacion.use(express.urlencoded({ extended: true }))
aplicacion.set("view engine", "ejs")
aplicacion.use(session({ secret: config.session.secret, resave: true, saveUninitialized: true }));
aplicacion.use(flash())

// Static assets with cache headers
const oneYear = 365 * 24 * 60 * 60 * 1000
aplicacion.use('/javascripts', express.static('public/javascripts', {
  maxAge: oneYear,
  immutable: true
}))
aplicacion.use('/stylesheets', express.static('public/stylesheets', {
  maxAge: oneYear,
  immutable: true
}))
aplicacion.use('/images', express.static('public/images', {
  maxAge: oneYear,
  immutable: true
}))
aplicacion.use('/avatars', express.static('public/avatars', {
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (may change)
}))
// Fallback for any other static files
aplicacion.use(express.static('public', {
  maxAge: 24 * 60 * 60 * 1000 // 1 day
}))

aplicacion.use(fileUpload())

// Swagger docs (available in development)
if (config.server.isDev) {
  aplicacion.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// Request logging (after security middleware, before routes)
aplicacion.use(requestLogger)

aplicacion.use(rutasMiddleware)
aplicacion.use(rutasPublicas)
aplicacion.use(rutasPrivadas)
aplicacion.use(rutasApi)

// 404 handler — catches unmatched routes
aplicacion.use(notFoundHandler)

// Global error handler — must be last
aplicacion.use(errorHandler)

// Only start server when run directly (not when required by tests)
if (require.main === module) {
  aplicacion.listen(config.server.port, () => {
    logger.info(`Servidor iniciado en puerto ${config.server.port} (${config.server.env})`)
    if (config.server.isDev) {
      logger.info(`API Docs: http://localhost:${config.server.port}/api/docs`)
    }
  })
}

module.exports = aplicacion
