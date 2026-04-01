const express = require('express')
const router = express.Router()
const pool = require('../db')
const { postLimiter } = require('./rateLimiter')
const { validateCreatePost, validateEditPost, validateDeletePost, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')

router.get('/admin/index', asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM publicaciones WHERE autor_id = ?',
    [peticion.session.usuario.id]
  )
  respuesta.render('admin/index', { usuario: peticion.session.usuario, mensaje: peticion.flash('mensaje'), publicaciones: filas })
}))

router.get('/admin/procesar_cerrar_sesion', (peticion, respuesta) => {
  peticion.session.destroy()
  respuesta.redirect("/")
})

router.get('/admin/agregar', (peticion, respuesta) => {
  respuesta.render('admin/agregar', { mensaje: peticion.flash('mensaje'), usuario: peticion.session.usuario })
})

router.post('/admin/procesar_agregar', postLimiter, validateCreatePost, asyncHandler(async (peticion, respuesta) => {
  const date = new Date()
  const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  await pool.query(
    'INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora) VALUES (?, ?, ?, ?, ?)',
    [peticion.body.titulo, peticion.body.resumen, peticion.body.contenido, peticion.session.usuario.id, fecha]
  )
  peticion.flash('mensaje', 'Publicación agregada')
  respuesta.redirect("/admin/index")
}))

router.get('/admin/editar/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const [filas] = await pool.query(
    'SELECT * FROM publicaciones WHERE id = ? AND autor_id = ?',
    [peticion.params.id, peticion.session.usuario.id]
  )
  if (filas.length > 0) {
    respuesta.render('admin/editar', { publicacion: filas[0], mensaje: peticion.flash('mensaje'), usuario: peticion.session.usuario })
  }
  else {
    peticion.flash('mensaje', 'Operación no permitida')
    respuesta.redirect("/admin/index")
  }
}))

router.post('/admin/procesar_editar', postLimiter, validateEditPost, asyncHandler(async (peticion, respuesta) => {
  const [resultado] = await pool.query(
    'UPDATE publicaciones SET titulo = ?, resumen = ?, contenido = ? WHERE id = ? AND autor_id = ?',
    [peticion.body.titulo, peticion.body.resumen, peticion.body.contenido, peticion.body.id, peticion.session.usuario.id]
  )
  if (resultado.changedRows > 0) {
    peticion.flash('mensaje', 'Publicación editada')
  }
  else {
    peticion.flash('mensaje', 'Publicación no editada')
  }
  respuesta.redirect("/admin/index")
}))

router.post('/admin/procesar_eliminar', postLimiter, validateDeletePost, asyncHandler(async (peticion, respuesta) => {
  const [resultado] = await pool.query(
    'DELETE FROM publicaciones WHERE id = ? AND autor_id = ?',
    [peticion.body.id, peticion.session.usuario.id]
  )
  if (resultado.affectedRows > 0) {
    peticion.flash('mensaje', 'Publicación eliminada')
  }
  else {
    peticion.flash('mensaje', 'Publicación no eliminada')
  }
  respuesta.redirect("/admin/index")
}))

module.exports = router
