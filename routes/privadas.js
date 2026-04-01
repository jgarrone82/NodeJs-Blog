const express = require('express')
const router = express.Router()
const { postLimiter } = require('./rateLimiter')
const { validateCreatePost, validateEditPost, validateDeletePost, validateIdParam } = require('../validation/middleware')
const asyncHandler = require('../src/utils/async-handler')
const { PostService } = require('../src/services')

const pool = require('../db')

// Initialize service (dependency injection)
const postService = new PostService(pool)

// GET /admin/index — Dashboard with author's posts
router.get('/admin/index', asyncHandler(async (peticion, respuesta) => {
  const publicaciones = await postService.getByAuthor(peticion.session.usuario.id)
  respuesta.render('admin/index', {
    usuario: peticion.session.usuario,
    mensaje: peticion.flash('mensaje'),
    publicaciones
  })
}))

// GET /admin/procesar_cerrar_sesion — Logout
router.get('/admin/procesar_cerrar_sesion', (peticion, respuesta) => {
  peticion.session.destroy()
  respuesta.redirect('/')
})

// GET /admin/agregar — New post form
router.get('/admin/agregar', (peticion, respuesta) => {
  respuesta.render('admin/agregar', {
    mensaje: peticion.flash('mensaje'),
    usuario: peticion.session.usuario
  })
})

// POST /admin/procesar_agregar — Create post
router.post('/admin/procesar_agregar', postLimiter, validateCreatePost, asyncHandler(async (peticion, respuesta) => {
  const { titulo, resumen, contenido } = peticion.body

  await postService.create({
    titulo,
    resumen,
    contenido,
    autorId: peticion.session.usuario.id
  })

  peticion.flash('mensaje', 'Publicación agregada')
  respuesta.redirect('/admin/index')
}))

// GET /admin/editar/:id — Edit post form
router.get('/admin/editar/:id', validateIdParam, asyncHandler(async (peticion, respuesta) => {
  const publicacion = await postService.getByIdAndAuthor(
    peticion.params.id,
    peticion.session.usuario.id
  )

  if (publicacion) {
    respuesta.render('admin/editar', {
      publicacion,
      mensaje: peticion.flash('mensaje'),
      usuario: peticion.session.usuario
    })
  } else {
    peticion.flash('mensaje', 'Operación no permitida')
    respuesta.redirect('/admin/index')
  }
}))

// POST /admin/procesar_editar — Update post
router.post('/admin/procesar_editar', postLimiter, validateEditPost, asyncHandler(async (peticion, respuesta) => {
  const { id, titulo, resumen, contenido } = peticion.body

  const editado = await postService.update({
    id,
    titulo,
    resumen,
    contenido,
    autorId: peticion.session.usuario.id
  })

  if (editado) {
    peticion.flash('mensaje', 'Publicación editada')
  } else {
    peticion.flash('mensaje', 'Publicación no editada')
  }

  respuesta.redirect('/admin/index')
}))

// POST /admin/procesar_eliminar — Delete post
router.post('/admin/procesar_eliminar', postLimiter, validateDeletePost, asyncHandler(async (peticion, respuesta) => {
  const eliminado = await postService.delete({
    id: peticion.body.id,
    autorId: peticion.session.usuario.id
  })

  if (eliminado) {
    peticion.flash('mensaje', 'Publicación eliminada')
  } else {
    peticion.flash('mensaje', 'Publicación no eliminada')
  }

  respuesta.redirect('/admin/index')
}))

module.exports = router
