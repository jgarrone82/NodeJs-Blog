const { registerSchema, loginSchema, createPostSchema, editPostSchema, deletePostSchema, apiAuthSchema, apiCreatePostSchema, apiCreateAuthorSchema, idParamSchema } = require('./schemas')

// Factory function for validation middleware
function validate(schema, source = 'body') {
  return (peticion, respuesta, siguiente) => {
    const data = source === 'body' ? peticion.body : source === 'query' ? peticion.query : peticion.params
    const { error } = schema.validate(data, { abortEarly: false })

    if (error) {
      const mensajes = error.details.map(d => d.message).join(', ')
      // Determine response format based on request type
      if (peticion.path.startsWith('/api/')) {
        return respuesta.status(400).json({ error: mensajes })
      }
      peticion.flash('mensaje', mensajes)
      // Redirect back based on the route
      if (peticion.path.includes('registro')) return respuesta.redirect('/registro')
      if (peticion.path.includes('inicio')) return respuesta.redirect('/inicio')
      if (peticion.path.includes('admin')) return respuesta.redirect('/admin/index')
      return respuesta.redirect('/')
    }
    siguiente()
  }
}

// Pre-configured validation middlewares
const validateRegister = validate(registerSchema, 'body')
const validateLogin = validate(loginSchema, 'body')
const validateCreatePost = validate(createPostSchema, 'body')
const validateEditPost = validate(editPostSchema, 'body')
const validateDeletePost = validate(deletePostSchema, 'body')
const validateApiAuth = validate(apiAuthSchema, 'query')
const validateApiCreatePost = validate(apiCreatePostSchema, 'body')
const validateApiCreateAuthor = validate(apiCreateAuthorSchema, 'body')
const validateIdParam = validate(idParamSchema, 'params')

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateEditPost,
  validateDeletePost,
  validateApiAuth,
  validateApiCreatePost,
  validateApiCreateAuthor,
  validateIdParam
}
