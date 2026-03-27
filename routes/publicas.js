const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const path = require('path')
const nodemailer = require('nodemailer')
const pool = require('../db')

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

router.get('/', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    let modificadorConsulta = ""
    let modificadorPagina = ""
    let pagina = 0
    const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
    if (busqueda != "") {
      const busquedaSegura = connection.escape(`%${busqueda}%`)
      modificadorConsulta = `WHERE titulo LIKE ${busquedaSegura} OR resumen LIKE ${busquedaSegura} OR contenido LIKE ${busquedaSegura}`
      modificadorPagina = ""
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
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      respuesta.render('index', { publicaciones: filas, busqueda: busqueda, pagina: pagina })
    })
  })
})

router.get('/registro', (peticion, respuesta) => {
  respuesta.render('registro', { mensaje: peticion.flash('mensaje') })
})

router.post('/procesar_registro', (peticion, respuesta) => {
  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const email = peticion.body.email.toLowerCase().trim()
    const pseudonimo = peticion.body.pseudonimo.trim()
    const contrasenaPlana = peticion.body.contrasena

    try {
      const contrasenaHasheada = await bcrypt.hash(contrasenaPlana, 10)

      const consultaEmail = `SELECT * FROM autores WHERE email = ${connection.escape(email)}`
      connection.query(consultaEmail, (error, filas, campos) => {
        if (filas.length > 0) {
          connection.release()
          peticion.flash('mensaje', 'Email duplicado')
          return respuesta.redirect('/registro')
        }

        const consultaPseudonimo = `SELECT * FROM autores WHERE pseudonimo = ${connection.escape(pseudonimo)}`
        connection.query(consultaPseudonimo, (error, filas, campos) => {
          if (filas.length > 0) {
            connection.release()
            peticion.flash('mensaje', 'Pseudonimo duplicado')
            return respuesta.redirect('/registro')
          }

          const consulta = `
            INSERT INTO autores (email, contrasena, pseudonimo)
            VALUES (${connection.escape(email)}, ${connection.escape(contrasenaHasheada)}, ${connection.escape(pseudonimo)})
          `
          connection.query(consulta, (error, filas, campos) => {
            if (error) {
              connection.release()
              peticion.flash('mensaje', 'Error al registrar usuario')
              return respuesta.redirect('/registro')
            }

            const id = filas.insertId

            if (peticion.files && peticion.files.avatar) {
              const archivoAvatar = peticion.files.avatar
              const nombreArchivo = `${id}${path.extname(archivoAvatar.name)}`
              archivoAvatar.mv(`./public/avatars/${nombreArchivo}`, (error) => {
                if (error) {
                  connection.release()
                  console.error('Error subiendo avatar:', error)
                  peticion.flash('mensaje', 'Error subiendo avatar')
                  return respuesta.redirect('/registro')
                }

                const consultaAvatar = `
                  UPDATE autores SET avatar = ${connection.escape(nombreArchivo)}
                  WHERE id = ${connection.escape(id)}
                `
                connection.query(consultaAvatar, (error, filas, campos) => {
                  connection.release()
                  enviarCorreoBienvenida(email, pseudonimo)
                  peticion.flash('mensaje', 'Usuario registrado con avatar')
                  respuesta.redirect('/registro')
                })
              })
            }
            else {
              connection.release()
              enviarCorreoBienvenida(email, pseudonimo)
              peticion.flash('mensaje', 'Usuario registrado')
              respuesta.redirect('/registro')
            }
          })
        })
      })
    } catch (error) {
      connection.release()
      console.error('Error registrando usuario:', error)
      peticion.flash('mensaje', 'Error al registrar usuario')
      respuesta.redirect('/registro')
    }
  })
})

router.get('/inicio', (peticion, respuesta) => {
  respuesta.render('inicio', { mensaje: peticion.flash('mensaje') })
})

router.post('/procesar_inicio', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `SELECT * FROM autores WHERE email = ${connection.escape(peticion.body.email)}`
    connection.query(consulta, async (error, filas, campos) => {
      connection.release()

      if (filas.length > 0) {
        try {
          const coincide = await bcrypt.compare(peticion.body.contrasena, filas[0].contrasena)
          if (coincide) {
            peticion.session.usuario = filas[0]
            return respuesta.redirect('/admin/index')
          }
        } catch (e) {
          console.error('Error verificando contraseña:', e)
        }
      }
      peticion.flash('mensaje', 'Datos inválidos')
      respuesta.redirect('/inicio')
    })
  })
})

router.get('/publicacion/:id', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `SELECT * FROM publicaciones WHERE id = ${connection.escape(peticion.params.id)}`
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas.length > 0) {
        respuesta.render('publicacion', { publicacion: filas[0] })
      }
      else {
        respuesta.redirect('/')
      }
    })
  })
})

router.get('/autores', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `
      SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
      FROM autores
      INNER JOIN publicaciones
      ON autores.id = publicaciones.autor_id
      ORDER BY autores.id DESC, publicaciones.fecha_hora DESC
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()

      autores = []
      ultimoAutorId = undefined
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
    })
  })
})

router.get('/publicacion/:id/votar', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `SELECT * FROM publicaciones WHERE id = ${connection.escape(peticion.params.id)}`
    connection.query(consulta, (error, filas, campos) => {
      if (filas.length > 0) {
        const consultaVoto = `UPDATE publicaciones SET votos = votos + 1 WHERE id = ${connection.escape(peticion.params.id)}`
        connection.query(consultaVoto, (error, filas, campos) => {
          connection.release()
          respuesta.redirect(`/publicacion/${peticion.params.id}`)
        })
      }
      else {
        connection.release()
        peticion.flash('mensaje', 'Publicación inválida')
        respuesta.redirect('/')
      }
    })
  })
})

module.exports = router
