const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const pool = require('../db')
const { apiLimiter, authLimiter } = require('./rateLimiter')
const { validateApiAuth, validateApiCreatePost, validateApiCreateAuthor, validateIdParam } = require('../validation/middleware')

// Apply rate limiting to all API routes
router.use('/api/v1/', apiLimiter)

router.get('/api/v1/publicaciones/:id', validateIdParam, async (peticion, respuesta) => {
  try {
    const [filas] = await pool.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [peticion.params.id]
    )
    if (filas.length > 0) {
      respuesta.json({ data: filas })
    }
    else {
      respuesta.status(404).send("Id no encontrada")
    }
  } catch (error) {
    console.error('Error en GET /api/v1/publicaciones/:id:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  }
})

router.get('/api/v1/autores/', async (peticion, respuesta) => {
  try {
    const [filas] = await pool.query('SELECT * FROM autores')
    if (filas.length > 0) {
      respuesta.json({ data: filas })
    }
    else {
      respuesta.status(404).send("Filas no encontradas")
    }
  } catch (error) {
    console.error('Error en GET /api/v1/autores/:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  }
})

router.get('/api/v1/autores/:id', validateIdParam, async (peticion, respuesta) => {
  try {
    const [filas] = await pool.query(
      'SELECT * FROM autores WHERE id = ?',
      [peticion.params.id]
    )
    if (filas.length === 0) {
      return respuesta.status(404).send("Autor no encontrado")
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
  } catch (error) {
    console.error('Error en GET /api/v1/autores/:id:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  }
})

router.post('/api/v1/publicaciones/', authLimiter, validateApiAuth, validateApiCreatePost, async (peticion, respuesta) => {
  let connection
  try {
    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

    if (email == "" || contrasena == "") {
      return respuesta.status(400).send("Email y contraseña son requeridos")
    }

    const [filas] = await pool.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )

    if (filas.length === 0) {
      return respuesta.status(401).send("Combinación de email y contraseña inválida")
    }

    const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
    if (!coincide) {
      return respuesta.status(401).send("Combinación de email y contraseña inválida")
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
      respuesta.status(500).send("Error al crear publicación")
    }
  } catch (error) {
    console.error('Error en POST /api/v1/publicaciones/:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  } finally {
    if (connection) connection.release()
  }
})

router.delete('/api/v1/publicaciones/:id', authLimiter, validateIdParam, async (peticion, respuesta) => {
  try {
    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

    if (email == "" || contrasena == "") {
      return respuesta.status(400).send("Email y contraseña son requeridos")
    }

    const [filas] = await pool.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )

    if (filas.length === 0) {
      return respuesta.status(401).send("Combinación de email y contraseña inválida")
    }

    const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
    if (!coincide) {
      return respuesta.status(401).send("Combinación de email y contraseña inválida")
    }

    const id_autor = filas[0].id
    const [filasPub] = await pool.query(
      'SELECT * FROM publicaciones WHERE id = ? AND autor_id = ?',
      [peticion.params.id, id_autor]
    )

    if (filasPub.length === 0) {
      return respuesta.status(403).send("La publicación no pertenece al autor")
    }

    const [resultado] = await pool.query(
      'DELETE FROM publicaciones WHERE id = ? AND autor_id = ?',
      [peticion.params.id, id_autor]
    )

    if (resultado.affectedRows > 0) {
      respuesta.status(200).send("Publicación eliminada")
    }
    else {
      respuesta.status(500).send("Publicación no eliminada")
    }
  } catch (error) {
    console.error('Error en DELETE /api/v1/publicaciones/:id:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  }
})

router.get('/api/v1/publicaciones/', async (peticion, respuesta) => {
  try {
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
      respuesta.status(404).send("filas no encontradas")
    }
  } catch (error) {
    console.error('Error en GET /api/v1/publicaciones/:', error)
    respuesta.status(500).json({ error: 'Error del servidor' })
  }
})

router.post('/api/v1/autores/', authLimiter, validateApiCreateAuthor, async (peticion, respuesta) => {
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
      return respuesta.status(409).send("Email duplicado")
    }

    const [filasPseudonimo] = await connection.query(
      'SELECT * FROM autores WHERE pseudonimo = ?',
      [pseudonimo]
    )
    if (filasPseudonimo.length > 0) {
      return respuesta.status(409).send("Pseudonimo duplicado")
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
      respuesta.status(500).send("Error al crear autor")
    }
  } catch (error) {
    console.error('Error en POST /api/v1/autores/:', error)
    respuesta.status(500).send("Error al crear autor")
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router
