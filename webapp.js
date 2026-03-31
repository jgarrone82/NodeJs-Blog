require('dotenv').config()
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
aplicacion.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
aplicacion.use(flash())
aplicacion.use(express.static('public'))
aplicacion.use(fileUpload())

aplicacion.use(rutasMiddleware)
aplicacion.use(rutasPublicas)
aplicacion.use(rutasPrivadas)
aplicacion.use(rutasApi)

aplicacion.listen(8080, () => {
  console.log("Servidor iniciado")
})
