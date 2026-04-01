// Set required environment variables for config validation
process.env.DB_HOST = 'localhost'
process.env.DB_USER = 'test'
process.env.DB_PASSWORD = 'test'
process.env.DB_NAME = 'test_blog'
process.env.SESSION_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Mock mysql2/promise before any module imports it
const mockQuery = jest.fn()
const mockGetConnection = jest.fn()
const mockRelease = jest.fn()
const mockEscape = jest.fn((val) => `'${val}'`)

const mockConnection = {
  query: mockQuery,
  release: mockRelease
}

const mockPool = {
  query: mockQuery,
  getConnection: mockGetConnection,
  escape: mockEscape
}

// Reset mocks before each test
beforeEach(() => {
  mockQuery.mockReset()
  mockGetConnection.mockReset()
  mockRelease.mockReset()
  mockGetConnection.mockResolvedValue(mockConnection)
})

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool)
}))

// Mock rate limiter to pass-through (no rate limiting in tests)
const passThrough = (req, res, next) => next()
jest.mock('../routes/rateLimiter', () => ({
  authLimiter: passThrough,
  apiLimiter: passThrough,
  postLimiter: passThrough
}))

module.exports = { mockPool, mockQuery, mockGetConnection, mockRelease, mockEscape }
