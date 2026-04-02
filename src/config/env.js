const Joi = require('joi')
const pino = require('pino')

const envSchema = Joi.object({
  // Database (required)
  DB_HOST: Joi.string().required().messages({
    'any.required': 'DB_HOST is required'
  }),
  DB_USER: Joi.string().required().messages({
    'any.required': 'DB_USER is required'
  }),
  DB_PASSWORD: Joi.string().allow('').default('').messages({
    'string.base': 'DB_PASSWORD must be a string'
  }),
  DB_NAME: Joi.string().required().messages({
    'any.required': 'DB_NAME is required'
  }),

  // Session (required)
  SESSION_SECRET: Joi.string().required().messages({
    'any.required': 'SESSION_SECRET is required'
  }),

  // JWT (optional — falls back to SESSION_SECRET)
  JWT_SECRET: Joi.string().default(Joi.ref('SESSION_SECRET')).messages({
    'string.base': 'JWT_SECRET must be a string'
  }),
  JWT_EXPIRES_IN: Joi.string().default('1h').messages({
    'string.base': 'JWT_EXPIRES_IN must be a string'
  }),

  // Email (optional — non-critical feature)
  GMAIL_USER: Joi.string().email().allow('').default('').messages({
    'string.email': 'GMAIL_USER must be a valid email'
  }),
  GMAIL_PASS: Joi.string().allow('').default('').messages({
    'string.base': 'GMAIL_PASS must be a string'
  }),

  // Server (with defaults)
  PORT: Joi.number().integer().min(1).max(65535).default(8080).messages({
    'number.base': 'PORT must be a number',
    'number.min': 'PORT must be at least 1',
    'number.max': 'PORT must be at most 65535'
  }),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .messages({
      'any.only': 'NODE_ENV must be one of: development, production, test'
    })
}).unknown(true) // Allow extra environment variables

function loadConfig() {
  const { error, value: env } = envSchema.validate(process.env, {
    abortEarly: false
  })

  if (error) {
    const mensajes = error.details.map(d => d.message).join('\n  - ')
    const startupLogger = pino({ name: 'env-validation' })
    startupLogger.fatal({ error: mensajes }, 'Environment validation failed')
    process.exit(1)
  }

  return {
    db: {
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      name: env.DB_NAME
    },
    session: {
      secret: env.SESSION_SECRET
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN
    },
    email: {
      user: env.GMAIL_USER || null,
      pass: env.GMAIL_PASS || null,
      enabled: !!(env.GMAIL_USER && env.GMAIL_PASS)
    },
    server: {
      port: env.PORT,
      env: env.NODE_ENV,
      isDev: env.NODE_ENV === 'development',
      isTest: env.NODE_ENV === 'test',
      isProd: env.NODE_ENV === 'production'
    }
  }
}

module.exports = loadConfig()
