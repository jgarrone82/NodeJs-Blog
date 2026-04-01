const request = require('supertest')
const { mockQuery, mockGetConnection, mockConnection, mockRelease } = require('./setup')

// Import app after mocks are set up
const app = require('../webapp')

describe('Error Handling', () => {
  describe('Custom Error Classes', () => {
    const {
      AppError,
      ValidationError,
      AuthenticationError,
      AuthorizationError,
      NotFoundError,
      DatabaseError
    } = require('../src/errors')

    it('AppError should have correct defaults', () => {
      const error = new AppError('Test error', 400)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it('ValidationError should default to 400', () => {
      const error = new ValidationError()
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ValidationError')
    })

    it('AuthenticationError should default to 401', () => {
      const error = new AuthenticationError()
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('AuthenticationError')
    })

    it('AuthorizationError should default to 403', () => {
      const error = new AuthorizationError()
      expect(error.statusCode).toBe(403)
      expect(error.name).toBe('AuthorizationError')
    })

    it('NotFoundError should default to 404', () => {
      const error = new NotFoundError()
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('NotFoundError')
    })

    it('DatabaseError should default to 500', () => {
      const error = new DatabaseError()
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('DatabaseError')
    })

    it('Custom error messages should override defaults', () => {
      const error = new NotFoundError('Post not found')
      expect(error.message).toBe('Post not found')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('asyncHandler utility', () => {
    const asyncHandler = require('../src/utils/async-handler')

    it('should catch async errors and pass to next', (done) => {
      const handler = asyncHandler(async () => {
        throw new Error('Async error')
      })

      const mockNext = jest.fn()
      handler({}, {}, mockNext)

      // Wait for promise rejection
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
        done()
      }, 10)
    })

    it('should not call next on success', (done) => {
      const handler = asyncHandler(async () => {
        return 'success'
      })

      const mockNext = jest.fn()
      handler({}, {}, mockNext)

      setTimeout(() => {
        expect(mockNext).not.toHaveBeenCalled()
        done()
      }, 10)
    })
  })

  describe('API error responses', () => {
    it('should return 404 JSON for non-existent post', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const res = await request(app).get('/api/v1/publicaciones/999')

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toHaveProperty('message')
    })

    it('should return 404 JSON for non-existent authors list', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const res = await request(app).get('/api/v1/autores/')

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })

    it('should return 500 JSON when DB fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toHaveProperty('message')
    })

    it('should return 400 for validation errors on API', async () => {
      const res = await request(app)
        .delete('/api/v1/publicaciones/1')

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('404 handler for unmatched routes', () => {
    it('should return 404 JSON for unknown API routes', async () => {
      const res = await request(app).get('/api/v1/unknown')

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error.message).toContain('Endpoint not found')
    })
  })
})
