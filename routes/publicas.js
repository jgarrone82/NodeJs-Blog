const express = require('express')
const router = express.Router()
const path = require('path')
const nodemailer = require('nodemailer')
const { authLimiter } = require('./rateLimiter')
const { validateRegister, validateLogin, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { PostService, AuthService, AuthorService } = require('../src/services')
const logger = require('../src/logger')
const prisma = require('../db')

// Initialize services
const postService = new PostService()
const authService = new AuthService()
const authorService = new AuthorService()

// Email transporter (infrastructure concern — stays in route layer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
})

function enviarCorreoBienvenida(email, nombre) {
  const opciones = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Bienvenido al blog de viajes',
    text: `Hola ${nombre}`
  }
  transporter.sendMail(opciones, (error, info) => {
    if (error) logger.error({ error: error.message, email }, 'Failed to send welcome email')
  })
}

// GET / — Homepage with posts
router.get('/', asyncHandler(async (peticion, respuesta) => {
  const busqueda = peticion.query.busqueda || ''
  const pagina = peticion.query.pagina ? parseInt(peticion.query.pagina) : 0
  const limit = 5

  const publicaciones = await postService.list({ busqueda, pagina, limit })

  // Calculate total pages for pagination
  const whereClause = busqueda
    ? {
        OR: [
          { titulo: { contains: busqueda } },
          { resumen: { contains: busqueda } },
          { contenido: { contains: busqueda } }
        ]
      }
    : {}
  const total = await prisma.publicacion.count({ where: whereClause })
  const totalPages = Math.ceil(total / limit)

  respuesta.render('index', { publicaciones, busqueda, pagina, totalPages })
}))

// GET /registro — Registration form
router.get('/registro', (peticion, respuesta) => {
  respuesta.render('registro', { mensaje: peticion.flash('mensaje') })
})

// POST /procesar_registro — Handle registration
router.post('/procesar_registro', authLimiter, validateRegister, asyncHandler(async (peticion, respuesta) => {
  try {
    const { email, pseudonimo, contrasena } = peticion.body

    const resultado = await authService.register({ email, pseudonimo, contrasena })

    // Handle avatar upload if present
    if (peticion.files && peticion.files.avatar) {
      const archivoAvatar = peticion.files.avatar
      const nombreArchivo = `${resultado.id}${path.extname(archivoAvatar.name)}`
      await archivoAvatar.mv(`./public/avatars/${nombreArchivo}`)

      await authService.updateAvatar(resultado.id, nombreArchivo)
      enviarCorreoBienvenida(resultado.email, resultado.pseudonimo)
      peticion.flash('mensaje', 'Usuario registrado con avatar')
    } else {
      enviarCorreoBienvenida(resultado.email, resultado.pseudonimo)
      peticion.flash('mensaje', 'Usuario registrado')
    }
  } catch (error) {
    if (error.message === 'Email duplicado' || error.message === 'Pseudonimo duplicado') {
      peticion.flash('mensaje', error.message)
    } else {
      logger.error({ error: error.message, email, pseudonimo }, 'Error registering user')
      peticion.flash('mensaje', 'Error al registrar usuario')
    }
    return respuesta.redirect('/registro')
  }

  respuesta.redirect('/registro')
}))

// GET /inicio — Login form
router.get('/inicio', (peticion, respuesta) => {
  respuesta.render('inicio', { mensaje: peticion.flash('mensaje') })
})

// POST /procesar_inicio — Handle login
router.post('/procesar_inicio', authLimiter, validateLogin, asyncHandler(async (peticion, respuesta) => {
  const usuario = await authService.login(peticion.body.email, peticion.body.contrasena)

  if (usuario) {
    peticion.session.usuario = usuario
    return respuesta.redirect('/admin/index')
  }

  peticion.flash('mensaje', 'Datos inválidos')
  respuesta.redirect('/inicio')
}))

// GET /publicacion/:id — View single post
router.get('/publicacion/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const publicacion = await postService.getById(peticion.params.id)
  const relatedPosts = await postService.getRelatedPosts(publicacion.id, publicacion.autorId)
  respuesta.render('publicacion', { publicacion, relatedPosts })
}))

// GET /autores — List authors with publications
router.get('/autores', asyncHandler(async (peticion, respuesta) => {
  const autores = await authorService.listWithPublications()
  respuesta.render('autores', { autores })
}))

// GET /publicacion/:id/votar — Vote for a post (fallback, non-AJAX)
router.get('/publicacion/:id/votar', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const result = await postService.vote(peticion.params.id)

  if (result.success) {
    respuesta.redirect(`/publicacion/${peticion.params.id}`)
  } else {
    peticion.flash('mensaje', 'Publicación inválida')
    respuesta.redirect('/')
  }
}))

module.exports = router
