const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const pool = require('../db')
const { apiLimiter, authLimiter } = require('./rateLimiter')
const { validateApiAuth, validateApiCreatePost, validateApiCreateAuthor, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { NotFoundError, AuthenticationError, ValidationError } = require('../src/errors')

// Apply rate limiting to all API routes
router.use('/api/v1/', apiLimiter)

router.get('/api/v1/publicaciones/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ?',
    [peticion.params.id]
  )
  if (filas.length > 0) {
    respuesta.json({ data: filas })
  }
  else {
    throw new NotFoundError('Publicación no encontrada')
  }
}))

router.get('/api/v1/autores/', asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query('SELECT * FROM autores')
  if (filas.length > 0) {
    respuesta.json({ data: filas })
  }
  else {
    throw new NotFoundError('Autores no encontrados')
  }
}))

router.get('/api/v1/autores/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM autores WHERE id = ?',
    [peticion.params.id]
  )

  if (filas.length === 0) {
    throw new NotFoundError('Autor no encontrado')
  }

  const [filasPub] = await pool.query(
    `SELECT publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
     FROM publicaciones
     INNER JOIN autores
     ON publicaciones.autor_id = autores.id
     WHERE autor_id = ?`,
    [peticion.params.id]
  )

  if (filasPub.length > 0) {
    respuesta.json({ data: filas, publicaciones: filasPub })
  }
  else {
    respuesta.json({ data: filas })
  }
}))

router.post('/api/v1/publicaciones/', authLimiter, validateApiAuth, validateApiCreatePost, asyncHandler(async (peticion, respuesta) => {
  let connection
  try {
    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

    if (email == "" || contrasena == "") {
      throw new ValidationError('Email y contraseña son requeridos')
    }

    const [filas] = await pool.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )

    if (filas.length === 0) {
      throw new AuthenticationError('Combinación de email y contraseña inválida')
    }

    const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
    if (!coincide) {
      throw new AuthenticationError('Combinación de email y contraseña inválida')
    }

    connection = await pool.getConnection()
    const id = filas[0].id
    const date = new Date()
    const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    const [resultado] = await connection.query(
      'INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora) VALUES (?, ?, ?, ?, ?)',
      [peticion.body.titulo, peticion.body.resumen, peticion.body.contenido, id, fecha]
    )

    const [nuevaPub] = await connection.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [resultado.insertId]
    )

    if (nuevaPub.length > 0) {
      respuesta.json({ data: nuevaPub })
    }
    else {
      throw new Error('Error al crear publicación')
    }
  } finally {
    if (connection) connection.release()
  }
}))

router.delete('/api/v1/publicaciones/:id', authLimiter, validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const email = (peticion.query.email) ? peticion.query.email : ""
  const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

  if (email == "" || contrasena == "") {
    throw new ValidationError('Email y contraseña son requeridos')
  }

  const [filas] = await pool.query(
    'SELECT * FROM autores WHERE email = ?',
    [email]
  )

  if (filas.length === 0) {
    throw new AuthenticationError('Combinación de email y contraseña inválida')
  }

  const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
  if (!coincide) {
    throw new AuthenticationError('Combinación de email y contraseña inválida')
  }

  const id_autor = filas[0].id
  const [filasPub] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ? AND autor_id = ?',
    [peticion.params.id, id_autor]
  )

  if (filasPub.length === 0) {
    throw new Error('La publicación no pertenece al autor')
  }

  const [resultado] = await pool.query(
    'DELETE FROM publicaciones WHERE id = ? AND autor_id = ?',
    [peticion.params.id, id_autor]
  )

  if (resultado.affectedRows > 0) {
    respuesta.status(200).send("Publicación eliminada")
  }
  else {
    throw new Error('Publicación no eliminada')
  }
}))

router.get('/api/v1/publicaciones/', asyncHandler(async (peticion, respuesta) => {
  let modificadorConsulta = ""
  const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
  if (busqueda != "") {
    const busquedaSegura = pool.escape(`%${busqueda}%`)
    modificadorConsulta = `WHERE titulo LIKE ${busquedaSegura} OR resumen LIKE ${busquedaSegura} OR contenido LIKE ${busquedaSegura}`
  }

  const consulta = `
    SELECT publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
    FROM publicaciones
    INNER JOIN autores
    ON publicaciones.autor_id = autores.id
    ${modificadorConsulta}
    ORDER BY publicaciones.id
  `
  const [filas] = await pool.query(consulta)
  if (filas.length > 0) {
    respuesta.json({ data: filas })
  }
  else {
    throw new NotFoundError('Publicaciones no encontradas')
  }
}))

router.post('/api/v1/autores/', authLimiter, validateApiCreateAuthor, asyncHandler(async (peticion, respuesta) => {
  let connection
  try {
    const email = peticion.body.email.toLowerCase().trim()
    const pseudonimo = peticion.body.pseudonimo.trim()
    const contrasenaPlana = peticion.body.contrasena

    const contrasenaHasheada = await bcrypt.hash(contrasenaPlana, 10)

    connection = await pool.getConnection()

    const [filasEmail] = await connection.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )
    if (filasEmail.length > 0) {
      respuesta.status(409).send("Email duplicado")
      return
    }

    const [filasPseudonimo] = await connection.query(
      'SELECT * FROM autores WHERE pseudonimo = ?',
      [pseudonimo]
    )
    if (filasPseudonimo.length > 0) {
      respuesta.status(409).send("Pseudonimo duplicado")
      return
    }

    const [resultado] = await connection.query(
      'INSERT INTO autores (email, contrasena, pseudonimo) VALUES (?, ?, ?)',
      [email, contrasenaHasheada, pseudonimo]
    )

    const [nuevoAutor] = await connection.query(
      'SELECT * FROM autores WHERE id = ?',
      [resultado.insertId]
    )

    if (nuevoAutor.length > 0) {
      respuesta.json({ data: nuevoAutor })
    }
    else {
      throw new Error('Error al crear autor')
    }
  } finally {
    if (connection) connection.release()
  }
}))

module.exports = router
