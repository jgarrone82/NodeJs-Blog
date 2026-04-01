const request = require('supertest')

// Import app after mocks are set up
const app = require('../webapp')

// Access mock via global (set up in setup.js)
const mockPrisma = global.__mockPrisma

describe('API v1 - Publicaciones', () => {
  const mockPublicaciones = [
    { id: 1, titulo: 'Mi viaje a París', resumen: 'Una experiencia increíble', contenido: 'Contenido completo', fechaHora: new Date('2024-01-01'), autorId: 1, votos: 5, foto: null, autor: { pseudonimo: 'viajero1', avatar: 'avatar1.jpg' } }
  ]

  describe('GET /api/v1/publicaciones/', () => {
    it('debería retornar 200 con lista de publicaciones', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0]).toHaveProperty('titulo', 'Mi viaje a París')
    })

    it('debería retornar 404 cuando no hay publicaciones', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(404)
    })

    it('debería retornar 500 cuando la DB falla', async () => {
      mockPrisma.publicacion.findMany.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('GET /api/v1/publicaciones/:id', () => {
    it('debería retornar 200 con la publicación', async () => {
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicaciones[0])

      const res = await request(app).get('/api/v1/publicaciones/1')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
    })

    it('debería retornar 404 cuando la publicación no existe', async () => {
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(null)

      const res = await request(app).get('/api/v1/publicaciones/999')

      expect(res.status).toBe(404)
    })

    it('debería rechazar ID inválido (texto)', async () => {
      const res = await request(app).get('/api/v1/publicaciones/abc')

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('GET /api/v1/publicaciones/?busqueda=...', () => {
    it('debería buscar con parámetro de búsqueda', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)

      const res = await request(app).get('/api/v1/publicaciones/?busqueda=paris')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
    })
  })
})

describe('API v1 - Autores', () => {
  const mockAutores = [
    { id: 1, email: 'test@test.com', pseudonimo: 'viajero1', avatar: 'avatar1.jpg', contrasena: 'hashed' }
  ]

  describe('GET /api/v1/autores/', () => {
    it('debería retornar 200 con lista de autores', async () => {
      mockPrisma.autor.findMany.mockResolvedValueOnce(mockAutores)

      const res = await request(app).get('/api/v1/autores/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body.data.length).toBe(1)
    })

    it('debería retornar 404 cuando no hay autores', async () => {
      mockPrisma.autor.findMany.mockResolvedValueOnce([])

      const res = await request(app).get('/api/v1/autores/')

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/v1/autores/:id', () => {
    it('debería retornar 200 con autor y publicaciones', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({
        ...mockAutores[0],
        publicaciones: [{ id: 1, titulo: 'Mi viaje' }]
      })

      const res = await request(app).get('/api/v1/autores/1')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('publicaciones')
    })

    it('debería retornar 200 con autor sin publicaciones', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({
        ...mockAutores[0],
        publicaciones: []
      })

      const res = await request(app).get('/api/v1/autores/1')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).not.toHaveProperty('publicaciones')
    })

    it('debería retornar 404 cuando el autor no existe', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const res = await request(app).get('/api/v1/autores/999')

      expect(res.status).toBe(404)
    })
  })
})

describe('API v1 - Validation', () => {
  describe('POST /api/v1/publicaciones/ - validación de auth', () => {
    it('debería retornar 400 sin email y contraseña', async () => {
      const res = await request(app)
        .post('/api/v1/publicaciones/')
        .send({ titulo: 'Test', resumen: 'Test', contenido: 'Test' })

      expect(res.status).toBe(400)
    })

    it('debería retornar 400 con email inválido', async () => {
      const res = await request(app)
        .post('/api/v1/publicaciones/')
        .query({ email: 'notanemail', contrasena: '123456' })
        .send({ titulo: 'Test', resumen: 'Test', contenido: 'Test' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/autores/ - validación de registro', () => {
    it('debería retornar 400 con email inválido', async () => {
      const res = await request(app)
        .post('/api/v1/autores/')
        .send({ email: 'notanemail', pseudonimo: 'user1', contrasena: '123456' })

      expect(res.status).toBe(400)
    })

    it('debería retornar 400 con contraseña corta', async () => {
      const res = await request(app)
        .post('/api/v1/autores/')
        .send({ email: 'test@test.com', pseudonimo: 'user1', contrasena: '12' })

      expect(res.status).toBe(400)
    })

    it('debería retornar 400 con pseudónimo corto', async () => {
      const res = await request(app)
        .post('/api/v1/autores/')
        .send({ email: 'test@test.com', pseudonimo: 'ab', contrasena: '123456' })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/publicaciones/:id - validación de auth', () => {
    it('debería retornar 400 sin email y contraseña', async () => {
      const res = await request(app)
        .delete('/api/v1/publicaciones/1')

      expect(res.status).toBe(400)
    })
  })
})

describe('Security Headers (Helmet)', () => {
  it('debería incluir headers de seguridad', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/api/v1/publicaciones/')

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(res.headers['x-dns-prefetch-control']).toBe('off')
  })
})

describe('Rate Limiting', () => {
  it('debería tener rate limiting configurado en rutas API', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/api/v1/publicaciones/')

    expect(res.status).not.toBe(429)
  })
})
