const express = require('express')
const router = express.Router()
const { apiLimiter, authLimiter } = require('./rateLimiter')
const { validateApiAuth, validateApiCreatePost, validateApiCreateAuthor, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { PostService, AuthService, AuthorService } = require('../src/services')
const { NotFoundError, AuthenticationError, ValidationError } = require('../src/errors')

const pool = require('../db')

// Initialize services (dependency injection)
const postService = new PostService(pool)
const authService = new AuthService(pool)
const authorService = new AuthorService(pool)

// Apply rate limiting to all API routes
router.use('/api/v1/', apiLimiter)

// GET /api/v1/publicaciones/:id — Get single post
router.get('/api/v1/publicaciones/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const publicacion = await postService.getById(peticion.params.id)
  respuesta.json({ data: [publicacion] })
}))

// GET /api/v1/autores/ — List all authors
router.get('/api/v1/autores/', asyncHandler(async (peticion, respuesta) => {
  const autores = await authorService.list()

  if (autores.length > 0) {
    respuesta.json({ data: autores })
  } else {
    throw new NotFoundError('Autores no encontrados')
  }
}))

// GET /api/v1/autores/:id — Get author with publications
router.get('/api/v1/autores/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const result = await authorService.getByIdWithPublications(peticion.params.id)

  if (!result) {
    throw new NotFoundError('Autor no encontrado')
  }

  if (result.publications) {
    respuesta.json({ data: [result.author], publicaciones: result.publications })
  } else {
    respuesta.json({ data: [result.author] })
  }
}))

// POST /api/v1/publicaciones/ — Create post (with auth via query params)
router.post('/api/v1/publicaciones/', authLimiter, validateApiAuth, validateApiCreatePost, asyncHandler(async (peticion, respuesta) => {
  const email = peticion.query.email || ''
  const contrasena = peticion.query.contrasena || ''

  if (!email || !contrasena) {
    throw new ValidationError('Email y contraseña son requeridos')
  }

  const usuario = await authService.login(email, contrasena)
  if (!usuario) {
    throw new AuthenticationError('Combinación de email y contraseña inválida')
  }

  const { titulo, resumen, contenido } = peticion.body

  const nuevoId = await postService.create({
    titulo,
    resumen,
    contenido,
    autorId: usuario.id
  })

  const [nuevaPub] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ?',
    [nuevoId]
  )

  if (nuevaPub.length > 0) {
    respuesta.json({ data: nuevaPub })
  } else {
    throw new Error('Error al crear publicación')
  }
}))

// DELETE /api/v1/publicaciones/:id — Delete post (with auth via query params)
router.delete('/api/v1/publicaciones/:id', authLimiter, validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const email = peticion.query.email || ''
  const contrasena = peticion.query.contrasena || ''

  if (!email || !contrasena) {
    throw new ValidationError('Email y contraseña son requeridos')
  }

  const usuario = await authService.login(email, contrasena)
  if (!usuario) {
    throw new AuthenticationError('Combinación de email y contraseña inválida')
  }

  const eliminado = await postService.delete({
    id: peticion.params.id,
    autorId: usuario.id
  })

  if (eliminado) {
    respuesta.status(200).send('Publicación eliminada')
  } else {
    throw new Error('La publicación no pertenece al autor')
  }
}))

// GET /api/v1/publicaciones/ — List posts (with optional search)
router.get('/api/v1/publicaciones/', asyncHandler(async (peticion, respuesta) => {
  const busqueda = peticion.query.busqueda || ''

  const publicaciones = await postService.list({ busqueda, pagina: 0, limit: 1000 })

  if (publicaciones.length > 0) {
    respuesta.json({ data: publicaciones })
  } else {
    throw new NotFoundError('Publicaciones no encontradas')
  }
}))

// POST /api/v1/autores/ — Register author
router.post('/api/v1/autores/', authLimiter, validateApiCreateAuthor, asyncHandler(async (peticion, respuesta) => {
  const { email, pseudonimo, contrasena } = peticion.body

  // Check duplicates
  if (await authService.emailExists(email.toLowerCase().trim())) {
    return respuesta.status(409).send('Email duplicado')
  }

  if (await authService.pseudonimoExists(pseudonimo.trim())) {
    return respuesta.status(409).send('Pseudonimo duplicado')
  }

  const resultado = await authService.register({ email, pseudonimo, contrasena })

  const [nuevoAutor] = await pool.query(
    'SELECT * FROM autores WHERE id = ?',
    [resultado.id]
  )

  if (nuevoAutor.length > 0) {
    respuesta.json({ data: nuevoAutor })
  } else {
    throw new Error('Error al crear autor')
  }
}))

module.exports = router
