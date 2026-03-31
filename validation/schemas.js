const Joi = require('joi')

// --- Auth schemas ---

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido'
  }),
  pseudonimo: Joi.string().min(3).max(30).alphanum().required().messages({
    'string.min': 'Pseudónimo debe tener al menos 3 caracteres',
    'string.max': 'Pseudónimo no puede exceder 30 caracteres',
    'string.alphanum': 'Pseudónimo solo puede contener letras y números',
    'any.required': 'Pseudónimo es requerido'
  }),
  contrasena: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Contraseña debe tener al menos 6 caracteres',
    'string.max': 'Contraseña no puede exceder 100 caracteres',
    'any.required': 'Contraseña es requerida'
  })
})

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido'
  }),
  contrasena: Joi.string().required().messages({
    'any.required': 'Contraseña es requerida'
  })
})

// --- Post schemas ---

const createPostSchema = Joi.object({
  titulo: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Título es requerido',
    'string.max': 'Título no puede exceder 200 caracteres',
    'any.required': 'Título es requerido'
  }),
  resumen: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Resumen es requerido',
    'string.max': 'Resumen no puede exceder 500 caracteres',
    'any.required': 'Resumen es requerido'
  }),
  contenido: Joi.string().min(1).max(10000).required().messages({
    'string.min': 'Contenido es requerido',
    'string.max': 'Contenido no puede exceder 10000 caracteres',
    'any.required': 'Contenido es requerido'
  })
})

const editPostSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID debe ser un número',
    'number.integer': 'ID debe ser un número entero',
    'number.positive': 'ID debe ser positivo',
    'any.required': 'ID es requerido'
  }),
  titulo: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Título es requerido',
    'string.max': 'Título no puede exceder 200 caracteres',
    'any.required': 'Título es requerido'
  }),
  resumen: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Resumen es requerido',
    'string.max': 'Resumen no puede exceder 500 caracteres',
    'any.required': 'Resumen es requerido'
  }),
  contenido: Joi.string().min(1).max(10000).required().messages({
    'string.min': 'Contenido es requerido',
    'string.max': 'Contenido no puede exceder 10000 caracteres',
    'any.required': 'Contenido es requerido'
  })
})

const deletePostSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID debe ser un número',
    'number.integer': 'ID debe ser un número entero',
    'number.positive': 'ID debe ser positivo',
    'any.required': 'ID es requerido'
  })
})

// --- API auth schemas (query params) ---

const apiAuthSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido'
  }),
  contrasena: Joi.string().required().messages({
    'any.required': 'Contraseña es requerida'
  })
})

// --- API post schemas ---

const apiCreatePostSchema = Joi.object({
  titulo: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Título es requerido',
    'string.max': 'Título no puede exceder 200 caracteres',
    'any.required': 'Título es requerido'
  }),
  resumen: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Resumen es requerido',
    'string.max': 'Resumen no puede exceder 500 caracteres',
    'any.required': 'Resumen es requerido'
  }),
  contenido: Joi.string().min(1).max(10000).required().messages({
    'string.min': 'Contenido es requerido',
    'string.max': 'Contenido no puede exceder 10000 caracteres',
    'any.required': 'Contenido es requerido'
  })
})

const apiCreateAuthorSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido'
  }),
  pseudonimo: Joi.string().min(3).max(30).alphanum().required().messages({
    'string.min': 'Pseudónimo debe tener al menos 3 caracteres',
    'string.max': 'Pseudónimo no puede exceder 30 caracteres',
    'string.alphanum': 'Pseudónimo solo puede contener letras y números',
    'any.required': 'Pseudónimo es requerido'
  }),
  contrasena: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Contraseña debe tener al menos 6 caracteres',
    'string.max': 'Contraseña no puede exceder 100 caracteres',
    'any.required': 'Contraseña es requerida'
  })
})

// --- Param schemas ---

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID debe ser un número',
    'number.integer': 'ID debe ser un número entero',
    'number.positive': 'ID debe ser positivo',
    'any.required': 'ID es requerido'
  })
})

module.exports = {
  registerSchema,
  loginSchema,
  createPostSchema,
  editPostSchema,
  deletePostSchema,
  apiAuthSchema,
  apiCreatePostSchema,
  apiCreateAuthorSchema,
  idParamSchema
}
