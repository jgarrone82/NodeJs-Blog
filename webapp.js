require('dotenv').config()
const config = require('./src/config/env')
const express = require('express')
const helmet = require('helmet')
const aplicacion = express()
const session = require('express-session')
const flash = require('express-flash')
const fileUpload = require('express-fileupload')

const rutasMiddleware = require('./routes/middleware')
const rutasPublicas = require('./routes/publicas')
const rutasPrivadas = require('./routes/privadas')
const rutasApi = require('./routes/api')

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

aplicacion.use(rutasMiddleware)
aplicacion.use(rutasPublicas)
aplicacion.use(rutasPrivadas)
aplicacion.use(rutasApi)

// Only start server when run directly (not when required by tests)
if (require.main === module) {
  aplicacion.listen(config.server.port, () => {
    console.log(`Servidor iniciado en puerto ${config.server.port} (${config.server.env})`)
  })
}

module.exports = aplicacion
