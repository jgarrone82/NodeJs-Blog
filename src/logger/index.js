const pino = require('pino')
const path = require('path')
const config = require('../config/env')

const isDev = config.server.isDev
const isTest = config.server.isTest

// Sensitive fields to redact from logs
const redactFields = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.contrasena',
  'req.body.password',
  'req.body.SECRET',
  'req.body.token',
  'req.body.SECRET',
  'res.headers["set-cookie"]'
]

// Base configuration
const baseConfig = {
  level: isTest ? 'fatal' : (isDev ? 'debug' : 'info'),
  redact: {
    paths: redactFields,
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: config.server.env,
    service: 'nodejs-blog'
  }
}

// Development: pretty print to console
const devConfig = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,env,service'
    }
  }
}

// Production: JSON to console + file with rotation
const prodConfig = {
  ...baseConfig,
  transport: {
    targets: [
      {
        target: 'pino/file',
        level: 'info',
        options: {
          destination: path.join(process.cwd(), 'logs', 'app.log'),
          mkdir: true,
          rotate: true
        }
      },
      {
        target: 'pino-pretty',
        level: 'warn',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,env,service'
        }
      }
    ]
  }
}

// Test: no output (fatal level suppresses all normal logs)
const testConfig = {
  ...baseConfig,
  transport: {
    target: 'pino/file',
    options: {
      destination: '/dev/null'
    }
  }
}

const logger = pino(isTest ? testConfig : (isDev ? devConfig : prodConfig))

module.exports = logger
