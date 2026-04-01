const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const path = require('path')
const nodemailer = require('nodemailer')
const pool = require('../db')
const { authLimiter } = require('./rateLimiter')
const { validateRegister, validateLogin, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { NotFoundError, ValidationError } = require('../src/errors')

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
    if (error) console.error('Error enviando correo:', error)
  })
}

router.get('/', asyncHandler(async (peticion, respuesta) => {
  let modificadorConsulta = ""
  let modificadorPagina = ""
  let pagina = 0
  const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
  if (busqueda != "") {
    const busquedaSegura = pool.escape(`%${busqueda}%`)
    modificadorConsulta = `WHERE titulo LIKE ${busquedaSegura} OR resumen LIKE ${busquedaSegura} OR contenido LIKE ${busquedaSegura}`
  }
  else {
    pagina = (peticion.query.pagina) ? parseInt(peticion.query.pagina) : 0
    if (pagina < 0) {
      pagina = 0
    }
    modificadorPagina = `LIMIT 5 OFFSET ${pagina * 5}`
  }
  const consulta = `
    SELECT
    publicaciones.id id, titulo, resumen, fecha_hora, pseudonimo, votos, avatar
    FROM publicaciones
    INNER JOIN autores
    ON publicaciones.autor_id = autores.id
    ${modificadorConsulta}
    ORDER BY fecha_hora DESC
    ${modificadorPagina}
  `
  const [filas] = await pool.query(consulta)
  respuesta.render('index', { publicaciones: filas, busqueda: busqueda, pagina: pagina })
}))

router.get('/registro', (peticion, respuesta) => {
  respuesta.render('registro', { mensaje: peticion.flash('mensaje') })
})

router.post('/procesar_registro', authLimiter, validateRegister, asyncHandler(async (peticion, respuesta) => {
  let connection
  try {
    connection = await pool.getConnection()

    const email = peticion.body.email.toLowerCase().trim()
    const pseudonimo = peticion.body.pseudonimo.trim()
    const contrasenaPlana = peticion.body.contrasena

    const contrasenaHasheada = await bcrypt.hash(contrasenaPlana, 10)

    const [filasEmail] = await connection.query(
      'SELECT * FROM autores WHERE email = ?',
      [email]
    )
    if (filasEmail.length > 0) {
      peticion.flash('mensaje', 'Email duplicado')
      return respuesta.redirect('/registro')
    }

    const [filasPseudonimo] = await connection.query(
      'SELECT * FROM autores WHERE pseudonimo = ?',
      [pseudonimo]
    )
    if (filasPseudonimo.length > 0) {
      peticion.flash('mensaje', 'Pseudonimo duplicado')
      return respuesta.redirect('/registro')
    }

    const [resultado] = await connection.query(
      'INSERT INTO autores (email, contrasena, pseudonimo) VALUES (?, ?, ?)',
      [email, contrasenaHasheada, pseudonimo]
    )
    const id = resultado.insertId

    if (peticion.files && peticion.files.avatar) {
      const archivoAvatar = peticion.files.avatar
      const nombreArchivo = `${id}${path.extname(archivoAvatar.name)}`
      await archivoAvatar.mv(`./public/avatars/${nombreArchivo}`)

      await connection.query(
        'UPDATE autores SET avatar = ? WHERE id = ?',
        [nombreArchivo, id]
      )
      enviarCorreoBienvenida(email, pseudonimo)
      peticion.flash('mensaje', 'Usuario registrado con avatar')
    }
    else {
      enviarCorreoBienvenida(email, pseudonimo)
      peticion.flash('mensaje', 'Usuario registrado')
    }
    respuesta.redirect('/registro')
  } catch (error) {
    console.error('Error registrando usuario:', error)
    peticion.flash('mensaje', 'Error al registrar usuario')
    respuesta.redirect('/registro')
  } finally {
    if (connection) connection.release()
  }
}))

router.get('/inicio', (peticion, respuesta) => {
  respuesta.render('inicio', { mensaje: peticion.flash('mensaje') })
})

router.post('/procesar_inicio', authLimiter, validateLogin, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM autores WHERE email = ?',
    [peticion.body.email]
  )

  if (filas.length > 0) {
    const coincide = await bcrypt.compare(peticion.body.contrasena, filas[0].contrasena)
    if (coincide) {
      peticion.session.usuario = filas[0]
      return respuesta.redirect('/admin/index')
    }
  }
  peticion.flash('mensaje', 'Datos inválidos')
  respuesta.redirect('/inicio')
}))

router.get('/publicacion/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ?',
    [peticion.params.id]
  )
  if (filas.length > 0) {
    respuesta.render('publicacion', { publicacion: filas[0] })
  }
  else {
    respuesta.redirect('/')
  }
}))

router.get('/autores', asyncHandler(async (peticion, respuesta) => {
  const consulta = `
    SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
    FROM autores
    INNER JOIN publicaciones
    ON autores.id = publicaciones.autor_id
    ORDER BY autores.id DESC, publicaciones.fecha_hora DESC
  `
  const [filas] = await pool.query(consulta)

  const autores = []
  let ultimoAutorId = undefined
  filas.forEach(registro => {
    if (registro.id != ultimoAutorId) {
      ultimoAutorId = registro.id
      autores.push({
        id: registro.id,
        pseudonimo: registro.pseudonimo,
        avatar: registro.avatar,
        publicaciones: []
      })
    }
    autores[autores.length - 1].publicaciones.push({
      id: registro.publicacion_id,
      titulo: registro.titulo
    })
  })
  respuesta.render('autores', { autores: autores })
}))

router.get('/publicacion/:id/votar', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ?',
    [peticion.params.id]
  )
  if (filas.length > 0) {
    await pool.query(
      'UPDATE publicaciones SET votos = votos + 1 WHERE id = ?',
      [peticion.params.id]
    )
    respuesta.redirect(`/publicacion/${peticion.params.id}`)
  }
  else {
    peticion.flash('mensaje', 'Publicación inválida')
    respuesta.redirect('/')
  }
}))

module.exports = router
