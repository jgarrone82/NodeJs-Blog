const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/admin/index', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `SELECT * FROM publicaciones WHERE autor_id = ${connection.escape(peticion.session.usuario.id)}`
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      respuesta.render('admin/index', { usuario: peticion.session.usuario, mensaje: peticion.flash('mensaje'), publicaciones: filas })
    })
  })
})

router.get('/admin/procesar_cerrar_sesion', (peticion, respuesta) => {
  peticion.session.destroy();
  respuesta.redirect("/")
})

router.get('/admin/agregar', (peticion, respuesta) => {
  respuesta.render('admin/agregar', { mensaje: peticion.flash('mensaje'), usuario: peticion.session.usuario })
})

router.post('/admin/procesar_agregar', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const date = new Date()
    const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const consulta = `
      INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora)
      VALUES (
        ${connection.escape(peticion.body.titulo)},
        ${connection.escape(peticion.body.resumen)},
        ${connection.escape(peticion.body.contenido)},
        ${connection.escape(peticion.session.usuario.id)},
        ${connection.escape(fecha)}
      )
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      peticion.flash('mensaje', 'Publicación agregada')
      respuesta.redirect("/admin/index")
    })
  })
})

router.get('/admin/editar/:id', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `
      SELECT * FROM publicaciones
      WHERE id = ${connection.escape(peticion.params.id)}
      AND autor_id = ${connection.escape(peticion.session.usuario.id)}
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas.length > 0) {
        respuesta.render('admin/editar', { publicacion: filas[0], mensaje: peticion.flash('mensaje'), usuario: peticion.session.usuario })
      }
      else {
        peticion.flash('mensaje', 'Operación no permitida')
        respuesta.redirect("/admin/index")
      }
    })
  })
})

router.post('/admin/procesar_editar', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `
      UPDATE publicaciones
      SET
      titulo = ${connection.escape(peticion.body.titulo)},
      resumen = ${connection.escape(peticion.body.resumen)},
      contenido = ${connection.escape(peticion.body.contenido)}
      WHERE
      id = ${connection.escape(peticion.body.id)}
      AND
      autor_id = ${connection.escape(peticion.session.usuario.id)}
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas && filas.changedRows > 0) {
        peticion.flash('mensaje', 'Publicación editada')
      }
      else {
        peticion.flash('mensaje', 'Publicación no editada')
      }
      respuesta.redirect("/admin/index")
    })
  })
})

router.post('/admin/procesar_eliminar', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).send('Error del servidor')
    }

    const consulta = `
      DELETE FROM publicaciones
      WHERE
      id = ${connection.escape(peticion.body.id)}
      AND
      autor_id = ${connection.escape(peticion.session.usuario.id)}
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas && filas.affectedRows > 0) {
        peticion.flash('mensaje', 'Publicación eliminada')
      }
      else {
        peticion.flash('mensaje', 'Publicación no eliminada')
      }
      respuesta.redirect("/admin/index")
    })
  })
})

module.exports = router
