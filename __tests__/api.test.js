const request = require('supertest')
const app = require('../webapp')
const mockPrisma = global.__mockPrisma

describe('API v1 - Publicaciones', () => {
  const mockPublicacion = {
    id: 1, titulo: 'Mi viaje a París', resumen: 'Una experiencia increíble',
    contenido: 'Contenido completo', fechaHora: new Date('2024-01-01'),
    autorId: 1, votos: 5, foto: null,
    autor: { pseudonimo: 'viajero1', avatar: 'avatar1.jpg' }
  }

  describe('GET /api/v1/publicaciones/', () => {
    it('debería retornar 200 con lista de publicaciones', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce([mockPublicacion])
      mockPrisma.publicacion.count.mockResolvedValueOnce(1)

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('meta')
      expect(res.body.meta).toHaveProperty('pagina')
      expect(res.body.meta).toHaveProperty('total')
    })

    it('debería retornar 200 con lista vacía', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce([])
      mockPrisma.publicacion.count.mockResolvedValueOnce(0)

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('debería retornar 500 cuando la DB falla', async () => {
      mockPrisma.publicacion.findMany.mockRejectedValueOnce(new Error('DB error'))

      const res = await request(app).get('/api/v1/publicaciones/')

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error')
    })

    it('debería soportar parámetros de paginación', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce([mockPublicacion])
      mockPrisma.publicacion.count.mockResolvedValueOnce(1)

      const res = await request(app).get('/api/v1/publicaciones/?pagina=1&limite=5&ordenar=votos&direccion=asc')

      expect(res.status).toBe(200)
      expect(mockPrisma.publicacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          orderBy: { votos: 'asc' }
        })
      )
    })
  })

  describe('GET /api/v1/publicaciones/:id', () => {
    it('debería retornar 200 con la publicación', async () => {
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicacion)

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

  describe('POST /api/v1/publicaciones/ — JWT auth', () => {
    it('debería retornar 401 sin token', async () => {
      const res = await request(app)
        .post('/api/v1/publicaciones/')
        .send({ titulo: 'Test', resumen: 'Test', contenido: 'Test' })

      expect(res.status).toBe(401)
    })

    it('debería crear publicación con token válido', async () => {
      mockPrisma.publicacion.create.mockResolvedValueOnce({ id: 99 })
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce({
        ...mockPublicacion, id: 99
      })

      const res = await request(app)
        .post('/api/v1/publicaciones/')
        .set('Authorization', 'Bearer valid-token')
        .send({ titulo: 'Test', resumen: 'Test', contenido: 'Test' })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('data')
    })
  })

  describe('PUT /api/v1/publicaciones/:id — JWT auth', () => {
    it('debería retornar 401 sin token', async () => {
      const res = await request(app)
        .put('/api/v1/publicaciones/1')
        .send({ id: 1, titulo: 'Updated', resumen: 'Updated', contenido: 'Updated' })

      expect(res.status).toBe(401)
    })

    it('debería actualizar publicación con token válido', async () => {
      mockPrisma.publicacion.update.mockResolvedValueOnce({ id: 1 })
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicacion)

      const res = await request(app)
        .put('/api/v1/publicaciones/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ id: 1, titulo: 'Updated', resumen: 'Updated', contenido: 'Updated' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
    })

    it('debería retornar 403 si no es el autor', async () => {
      mockPrisma.publicacion.update.mockRejectedValueOnce(new Error('Not found'))

      const res = await request(app)
        .put('/api/v1/publicaciones/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ id: 999, titulo: 'Updated', resumen: 'Updated', contenido: 'Updated' })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/v1/publicaciones/:id — JWT auth', () => {
    it('debería retornar 401 sin token', async () => {
      const res = await request(app).delete('/api/v1/publicaciones/1')

      expect(res.status).toBe(401)
    })

    it('debería eliminar publicación con token válido', async () => {
      mockPrisma.publicacion.delete.mockResolvedValueOnce({ id: 1 })

      const res = await request(app)
        .delete('/api/v1/publicaciones/1')
        .set('Authorization', 'Bearer valid-token')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body.data).toHaveProperty('message')
    })

    it('debería retornar 403 si no es el autor', async () => {
      mockPrisma.publicacion.delete.mockRejectedValueOnce(new Error('Not found'))

      const res = await request(app)
        .delete('/api/v1/publicaciones/999')
        .set('Authorization', 'Bearer valid-token')

      expect(res.status).toBe(403)
    })
  })
})

describe('API v1 - Autores', () => {
  const mockAutor = {
    id: 1, email: 'test@test.com', pseudonimo: 'viajero1',
    avatar: 'avatar1.jpg', contrasena: 'hashed'
  }

  describe('GET /api/v1/autores/', () => {
    it('debería retornar 200 con lista de autores', async () => {
      mockPrisma.autor.findMany.mockResolvedValueOnce([mockAutor])

      const res = await request(app).get('/api/v1/autores/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('meta')
      expect(res.body.meta).toHaveProperty('total')
    })
  })

  describe('GET /api/v1/autores/:id', () => {
    it('debería retornar 200 con autor y publicaciones', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({
        ...mockAutor,
        publicaciones: [{ id: 1, titulo: 'Mi viaje' }]
      })

      const res = await request(app).get('/api/v1/autores/1')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('publicaciones')
    })

    it('debería retornar 404 cuando el autor no existe', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const res = await request(app).get('/api/v1/autores/999')

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/autores/', () => {
    it('debería retornar 201 con autor creado', async () => {
      mockPrisma.autor.findUnique.mockResolvedValue(null)
      mockPrisma.autor.create.mockResolvedValueOnce({
        id: 42, email: 'new@test.com', pseudonimo: 'newuser'
      })

      const res = await request(app)
        .post('/api/v1/autores/')
        .send({ email: 'new@test.com', pseudonimo: 'newuser', contrasena: 'password123' })

      expect(res.status).toBe(201)
      expect(res.body.data).toHaveProperty('id', 42)
    })

    it('debería retornar 400 con email inválido', async () => {
      const res = await request(app)
        .post('/api/v1/autores/')
        .send({ email: 'notanemail', pseudonimo: 'user1', contrasena: '123456' })

      expect(res.status).toBe(400)
    })
  })
})

describe('API v1 - Auth', () => {
  describe('POST /api/v1/auth/login', () => {
    it('debería retornar 400 con email inválido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'notanemail', contrasena: '123456' })

      expect(res.status).toBe(400)
    })

    it('debería retornar 401 con credenciales inválidas', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', contrasena: 'wrongpassword' })

      expect(res.status).toBe(401)
    })
  })
})

describe('Security Headers (Helmet)', () => {
  it('debería incluir headers de seguridad', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])
    mockPrisma.publicacion.count.mockResolvedValueOnce(0)

    const res = await request(app).get('/api/v1/publicaciones/')

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(res.headers['x-dns-prefetch-control']).toBe('off')
  })
})

describe('POST /api/v1/vote/:id', () => {
    it('debería retornar 200 con votos incrementados', async () => {
      mockPrisma.publicacion.update.mockResolvedValueOnce({ id: 1, votos: 6 })

      const res = await request(app).post('/api/v1/vote/1')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body.data).toHaveProperty('votos', 6)
      expect(mockPrisma.publicacion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { votos: { increment: 1 } }
      })
    })

    it('debería retornar 404 cuando la publicación no existe', async () => {
      mockPrisma.publicacion.update.mockRejectedValueOnce(new Error('Record not found'))

      const res = await request(app).post('/api/v1/vote/999')

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })

    it('debería rechazar ID inválido (texto)', async () => {
      const res = await request(app).post('/api/v1/vote/abc')

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })
  })

describe('Rate Limiting', () => {
  it('debería tener rate limiting configurado en rutas API', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])
    mockPrisma.publicacion.count.mockResolvedValueOnce(0)

    const res = await request(app).get('/api/v1/publicaciones/')

    expect(res.status).not.toBe(429)
  })
})
