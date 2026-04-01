const { PostService, AuthService, AuthorService } = require('../src/services')
const { NotFoundError } = require('../src/errors')

// Access mock via global (set up in setup.js)
const mockPrisma = global.__mockPrisma

describe('PostService', () => {
  let service

  beforeEach(() => {
    service = new PostService()
  })

  describe('list', () => {
    it('should return paginated posts without search', async () => {
      const mockPosts = [{
        id: 1, titulo: 'Test Post', autor: { pseudonimo: 'author1', avatar: 'a.jpg' }
      }]
      mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPosts)

      const result = await service.list({ pagina: 0, limit: 5 })

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('pseudonimo', 'author1')
      expect(mockPrisma.publicacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 5
      }))
    })

    it('should return posts matching search', async () => {
      const mockPosts = [{
        id: 1, titulo: 'Paris', autor: { pseudonimo: 'author1', avatar: 'a.jpg' }
      }]
      mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPosts)

      const result = await service.list({ busqueda: 'paris' })

      expect(result).toHaveLength(1)
      expect(mockPrisma.publicacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: expect.any(Array) }
      }))
    })

    it('should handle negative page numbers', async () => {
      mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

      await service.list({ pagina: -5 })

      expect(mockPrisma.publicacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0
      }))
    })
  })

  describe('getById', () => {
    it('should return post when found', async () => {
      const mockPost = { id: 1, titulo: 'Test', autor: { pseudonimo: 'author1', avatar: 'a.jpg' } }
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPost)

      const result = await service.getById(1)

      expect(result).toHaveProperty('titulo', 'Test')
    })

    it('should throw NotFoundError when not found', async () => {
      mockPrisma.publicacion.findUnique.mockResolvedValueOnce(null)

      await expect(service.getById(999)).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('should insert post and return id', async () => {
      mockPrisma.publicacion.create.mockResolvedValueOnce({ id: 42 })

      const result = await service.create({
        titulo: 'New Post',
        resumen: 'Summary',
        contenido: 'Content',
        autorId: 1
      })

      expect(result).toBe(42)
      expect(mockPrisma.publicacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ titulo: 'New Post' })
        })
      )
    })
  })

  describe('update', () => {
    it('should return true when post is updated', async () => {
      mockPrisma.publicacion.update.mockResolvedValueOnce({ id: 1 })

      const result = await service.update({
        id: 1, titulo: 'Updated', resumen: 'Summary', contenido: 'Content', autorId: 1
      })

      expect(result).toBe(true)
    })

    it('should return false when not found or not owned', async () => {
      mockPrisma.publicacion.update.mockRejectedValueOnce(new Error('Record not found'))

      const result = await service.update({
        id: 1, titulo: 'Same', resumen: 'Same', contenido: 'Same', autorId: 1
      })

      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('should return true when post is deleted', async () => {
      mockPrisma.publicacion.delete.mockResolvedValueOnce({ id: 1 })

      const result = await service.delete({ id: 1, autorId: 1 })

      expect(result).toBe(true)
    })

    it('should return false when not found or not owned', async () => {
      mockPrisma.publicacion.delete.mockRejectedValueOnce(new Error('Record not found'))

      const result = await service.delete({ id: 999, autorId: 1 })

      expect(result).toBe(false)
    })
  })

  describe('getByAuthor', () => {
    it('should return posts by author', async () => {
      const mockPosts = [
        { id: 1, titulo: 'Post 1', autor: { pseudonimo: 'a', avatar: null } },
        { id: 2, titulo: 'Post 2', autor: { pseudonimo: 'a', avatar: null } }
      ]
      mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPosts)

      const result = await service.getByAuthor(1)

      expect(result).toHaveLength(2)
    })
  })

  describe('getByIdAndAuthor', () => {
    it('should return post when found and owned', async () => {
      const mockPost = { id: 1, titulo: 'Test', autor: { pseudonimo: 'a', avatar: null } }
      mockPrisma.publicacion.findFirst.mockResolvedValueOnce(mockPost)

      const result = await service.getByIdAndAuthor(1, 1)

      expect(result).toHaveProperty('titulo', 'Test')
    })

    it('should return null when not found or not owned', async () => {
      mockPrisma.publicacion.findFirst.mockResolvedValueOnce(null)

      const result = await service.getByIdAndAuthor(999, 1)

      expect(result).toBeNull()
    })
  })

  describe('vote', () => {
    it('should return true when post exists', async () => {
      mockPrisma.publicacion.update.mockResolvedValueOnce({ id: 1 })

      const result = await service.vote(1)

      expect(result).toBe(true)
    })

    it('should return false when post does not exist', async () => {
      mockPrisma.publicacion.update.mockRejectedValueOnce(new Error('Not found'))

      const result = await service.vote(999)

      expect(result).toBe(false)
    })
  })
})

describe('AuthService', () => {
  let service

  beforeEach(() => {
    service = new AuthService()
  })

  describe('login', () => {
    it('should return null when user not found', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const result = await service.login('nope@test.com', 'password')

      expect(result).toBeNull()
    })
  })

  describe('register', () => {
    it('should throw error on duplicate email', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({ id: 1 })

      await expect(service.register({
        email: 'test@test.com',
        pseudonimo: 'user1',
        contrasena: 'password123'
      })).rejects.toThrow('Email duplicado')
    })

    it('should throw error on duplicate pseudonimo', async () => {
      mockPrisma.autor.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1 })

      await expect(service.register({
        email: 'new@test.com',
        pseudonimo: 'taken',
        contrasena: 'password123'
      })).rejects.toThrow('Pseudonimo duplicado')
    })

    it('should return new author info on success', async () => {
      mockPrisma.autor.findUnique.mockResolvedValue(null)
      mockPrisma.autor.create.mockResolvedValueOnce({
        id: 42, email: 'new@test.com', pseudonimo: 'newuser'
      })

      const result = await service.register({
        email: 'new@test.com',
        pseudonimo: 'newuser',
        contrasena: 'password123'
      })

      expect(result.id).toBe(42)
      expect(result.email).toBe('new@test.com')
      expect(result.pseudonimo).toBe('newuser')
    })
  })

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({ id: 1 })

      const result = await service.emailExists('test@test.com')

      expect(result).toBe(true)
    })

    it('should return false when email does not exist', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const result = await service.emailExists('nope@test.com')

      expect(result).toBe(false)
    })
  })

  describe('pseudonimoExists', () => {
    it('should return true when pseudonimo exists', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({ id: 1 })

      const result = await service.pseudonimoExists('user1')

      expect(result).toBe(true)
    })
  })
})

describe('AuthorService', () => {
  let service

  beforeEach(() => {
    service = new AuthorService()
  })

  describe('listWithPublications', () => {
    it('should group publications by author', async () => {
      const mockAutores = [
        {
          id: 1, pseudonimo: 'author1', avatar: 'a.jpg',
          publicaciones: [
            { id: 10, titulo: 'Post 1' },
            { id: 11, titulo: 'Post 2' }
          ]
        },
        {
          id: 2, pseudonimo: 'author2', avatar: 'b.jpg',
          publicaciones: [
            { id: 20, titulo: 'Post 3' }
          ]
        }
      ]
      mockPrisma.autor.findMany.mockResolvedValueOnce(mockAutores)

      const result = await service.listWithPublications()

      expect(result).toHaveLength(2)
      expect(result[0].publicaciones).toHaveLength(2)
      expect(result[1].publicaciones).toHaveLength(1)
    })
  })

  describe('getByIdWithPublications', () => {
    it('should return author with publications', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({
        id: 1, pseudonimo: 'author1',
        publicaciones: [{ id: 10, titulo: 'Post 1' }]
      })

      const result = await service.getByIdWithPublications(1)

      expect(result).not.toBeNull()
      expect(result.author).toHaveProperty('pseudonimo', 'author1')
      expect(result.publications).toHaveLength(1)
    })

    it('should return null when author not found', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

      const result = await service.getByIdWithPublications(999)

      expect(result).toBeNull()
    })

    it('should return author without publications when none exist', async () => {
      mockPrisma.autor.findUnique.mockResolvedValueOnce({
        id: 1, pseudonimo: 'author1',
        publicaciones: []
      })

      const result = await service.getByIdWithPublications(1)

      expect(result.author).toHaveProperty('pseudonimo', 'author1')
      expect(result.publications).toBeNull()
    })
  })

  describe('list', () => {
    it('should return all authors', async () => {
      const mockAuthors = [{ id: 1 }, { id: 2 }]
      mockPrisma.autor.findMany.mockResolvedValueOnce(mockAuthors)

      const result = await service.list()

      expect(result).toEqual(mockAuthors)
    })
  })
})
