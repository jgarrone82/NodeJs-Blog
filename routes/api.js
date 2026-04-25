const express = require('express')
const router = express.Router()
const { apiLimiter, authLimiter } = require('./rateLimiter')
const { validateApiAuth, validateApiCreatePost, validateApiCreateAuthor, validateIdParam, validateEditPost, validateLogin } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { PostService, AuthService, AuthorService } = require('../src/services')
const { NotFoundError, AuthenticationError, ValidationError, AuthorizationError } = require('../src/errors')
const { authenticateJWT, generateToken } = require('../src/middleware/auth.middleware')
const { invalidatePosts } = require('../src/cache')
const prisma = require('../db')

// Initialize services
const postService = new PostService()
const authService = new AuthService()
const authorService = new AuthorService()

// Apply rate limiting to all API routes
router.use('/api/v1/', apiLimiter)

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, contrasena]
 *             properties:
 *               email: { type: string, format: email }
 *               contrasena: { type: string }
 *     responses:
 *       200:
 *         description: JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     expiresIn: { type: string }
 *       401:
 *         description: Invalid credentials
 */
router.post('/api/v1/auth/login', authLimiter, validateLogin, asyncHandler(async (peticion, respuesta) => {
  const usuario = await authService.login(peticion.body.email, peticion.body.contrasena)

  if (!usuario) {
    throw new AuthenticationError('Credenciales inválidas')
  }

  const token = generateToken(usuario)

  respuesta.json({
    data: {
      token,
      expiresIn: '1h',
      user: {
        id: usuario.id,
        email: usuario.email,
        pseudonimo: usuario.pseudonimo
      }
    }
  })
}))

/**
 * @swagger
 * /api/v1/publicaciones/:
 *   get:
 *     summary: List posts with pagination, search, and sorting
 *     tags: [Publicaciones]
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: ordenar
 *         schema: { type: string, enum: [fecha, votos, titulo] }
 *       - in: query
 *         name: direccion
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of posts
 */
router.get('/api/v1/publicaciones/', asyncHandler(async (peticion, respuesta) => {
  const busqueda = peticion.query.busqueda || ''
  const pagina = parseInt(peticion.query.pagina) || 0
  const limite = Math.min(parseInt(peticion.query.limite) || 10, 100) // Max 100
  const ordenar = peticion.query.ordenar || 'fecha'
  const direccion = peticion.query.direccion === 'asc' ? 'asc' : 'desc'

  const publicaciones = await postService.list({ busqueda, pagina, limit: limite, ordenar, direccion })

  // Get total count for pagination metadata
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

  respuesta.json({
    data: publicaciones,
    meta: {
      pagina,
      limite,
      total,
      paginas: Math.ceil(total / limite)
    }
  })
}))

/**
 * @swagger
 * /api/v1/publicaciones/{id}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Publicaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Post found }
 *       404: { description: Post not found }
 */
router.get('/api/v1/publicaciones/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const publicacion = await postService.getById(peticion.params.id)
  respuesta.json({ data: publicacion })
}))

/**
 * @swagger
 * /api/v1/publicaciones/:
 *   post:
 *     summary: Create a new post (requires JWT auth)
 *     tags: [Publicaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, resumen, contenido]
 *             properties:
 *               titulo: { type: string, maxLength: 200 }
 *               resumen: { type: string, maxLength: 500 }
 *               contenido: { type: string, maxLength: 10000 }
 *     responses:
 *       201: { description: Post created }
 *       401: { description: Unauthorized }
 */
router.post('/api/v1/publicaciones/', authLimiter, authenticateJWT, validateApiCreatePost, asyncHandler(async (peticion, respuesta) => {
  const { titulo, resumen, contenido } = peticion.body

  const nuevoId = await postService.create({
    titulo,
    resumen,
    contenido,
    autorId: peticion.user.id
  })

  const nuevaPub = await prisma.publicacion.findUnique({
    where: { id: nuevoId },
    include: { autor: true }
  })

  respuesta.status(201).json({ data: nuevaPub })
}))

/**
 * @swagger
 * /api/v1/publicaciones/{id}:
 *   put:
 *     summary: Update a post (requires JWT auth, author only)
 *     tags: [Publicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, resumen, contenido]
 *             properties:
 *               titulo: { type: string }
 *               resumen: { type: string }
 *               contenido: { type: string }
 *     responses:
 *       200: { description: Post updated }
 *       403: { description: Not the author }
 *       404: { description: Post not found }
 */
router.put('/api/v1/publicaciones/:id', authenticateJWT, validateEditPost, asyncHandler(async (peticion, respuesta) => {
  const { titulo, resumen, contenido } = peticion.body

  const editado = await postService.update({
    id: parseInt(peticion.params.id),
    titulo,
    resumen,
    contenido,
    autorId: peticion.user.id
  })

  if (!editado) {
    throw new AuthorizationError('No tenés permiso para editar esta publicación')
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: parseInt(peticion.params.id) },
    include: { autor: true }
  })

  respuesta.json({ data: publicacion })
}))

/**
 * @swagger
 * /api/v1/publicaciones/{id}:
 *   delete:
 *     summary: Delete a post (requires JWT auth, author only)
 *     tags: [Publicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Post deleted }
 *       403: { description: Not the author }
 */
router.delete('/api/v1/publicaciones/:id', authenticateJWT, validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const eliminado = await postService.delete({
    id: parseInt(peticion.params.id),
    autorId: peticion.user.id
  })

  if (!eliminado) {
    throw new AuthorizationError('No tenés permiso para eliminar esta publicación')
  }

  respuesta.json({ data: { message: 'Publicación eliminada' } })
}))

/**
 * @swagger
 * /api/v1/autores/:
 *   get:
 *     summary: List all authors
 *     tags: [Autores]
 *     responses:
 *       200: { description: List of authors }
 */
router.get('/api/v1/autores/', asyncHandler(async (peticion, respuesta) => {
  const autores = await authorService.list()

  respuesta.json({
    data: autores,
    meta: { total: autores.length }
  })
}))

/**
 * @swagger
 * /api/v1/autores/{id}:
 *   get:
 *     summary: Get author with their publications
 *     tags: [Autores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Author found }
 *       404: { description: Author not found }
 */
router.get('/api/v1/autores/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const result = await authorService.getByIdWithPublications(peticion.params.id)

  if (!result) {
    throw new NotFoundError('Autor no encontrado')
  }

  respuesta.json({
    data: result.author,
    publicaciones: result.publications || []
  })
}))

/**
 * @swagger
 * /api/v1/autores/:
 *   post:
 *     summary: Register a new author
 *     tags: [Autores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, contrasena, pseudonimo]
 *             properties:
 *               email: { type: string, format: email }
 *               contrasena: { type: string, minLength: 6 }
 *               pseudonimo: { type: string, minLength: 3, maxLength: 30 }
 *     responses:
 *       201: { description: Author created }
 *       409: { description: Duplicate email or pseudonimo }
 */
router.post('/api/v1/autores/', authLimiter, validateApiCreateAuthor, asyncHandler(async (peticion, respuesta) => {
  const { email, pseudonimo, contrasena } = peticion.body

  const resultado = await authService.register({ email, pseudonimo, contrasena })

  respuesta.status(201).json({
    data: {
      id: resultado.id,
      email: resultado.email,
      pseudonimo: resultado.pseudonimo
    }
  })
}))

/**
 * @swagger
 * /api/v1/vote/{id}:
 *   post:
 *     summary: Vote for a post
 *     tags: [Publicaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Vote counted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     votos: { type: integer }
 *       404:
 *         description: Post not found
 */
router.post('/api/v1/vote/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const result = await postService.vote(peticion.params.id)

  if (!result.success) {
    throw new NotFoundError('Publicación no encontrada')
  }

  invalidatePosts()

  respuesta.json({
    data: {
      votos: result.votos
    }
  })
}))

module.exports = router
