// Set required environment variables for config validation
process.env.DB_HOST = 'localhost'
process.env.DB_USER = 'test'
process.env.DB_PASSWORD = 'test'
process.env.DB_NAME = 'test_blog'
process.env.SESSION_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_blog'

// Mock Prisma client — must be defined before jest.mock for hoisting
// Using a mutable object that jest.mock can reference
const mockPrisma = {
  autor: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  publicacion: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $disconnect: jest.fn()
}

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    autor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    publicacion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $disconnect: jest.fn()
  }

  // Attach to global so tests can access it
  global.__mockPrisma = mockPrisma

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  }
})

// Mock rate limiter to pass-through (no rate limiting in tests)
jest.mock('../routes/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
  postLimiter: (req, res, next) => next()
}))

// Reset mocks before each test
beforeEach(() => {
  const mp = global.__mockPrisma
  if (mp) {
    Object.values(mp.autor).forEach(fn => {
      if (typeof fn.mockReset === 'function') fn.mockReset()
    })
    Object.values(mp.publicacion).forEach(fn => {
      if (typeof fn.mockReset === 'function') fn.mockReset()
    })
  }
})

module.exports = {
  get mockPrisma() { return global.__mockPrisma }
}
