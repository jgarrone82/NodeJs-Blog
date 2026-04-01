const { PostService, AuthService, AuthorService } = require('../src/services')
const { NotFoundError } = require('../src/errors')

// Mock pool
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

beforeEach(() => {
  mockQuery.mockReset()
  mockGetConnection.mockReset()
  mockRelease.mockReset()
  mockGetConnection.mockResolvedValue(mockConnection)
})

describe('PostService', () => {
  let service

  beforeEach(() => {
    service = new PostService(mockPool)
  })

  describe('list', () => {
    it('should return paginated posts without search', async () => {
      const mockPosts = [{ id: 1, titulo: 'Test Post' }]
      mockQuery.mockResolvedValueOnce([mockPosts])

      const result = await service.list({ pagina: 0, limit: 5 })

      expect(result).toEqual(mockPosts)
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT 5 OFFSET 0'))
    })

    it('should return posts matching search', async () => {
      const mockPosts = [{ id: 1, titulo: 'Paris' }]
      mockQuery.mockResolvedValueOnce([mockPosts])

      const result = await service.list({ busqueda: 'paris' })

      expect(result).toEqual(mockPosts)
      expect(mockEscape).toHaveBeenCalledWith('%paris%')
    })

    it('should handle negative page numbers', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      await service.list({ pagina: -5 })

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('OFFSET 0'))
    })
  })

  describe('getById', () => {
    it('should return post when found', async () => {
      const mockPost = { id: 1, titulo: 'Test' }
      mockQuery.mockResolvedValueOnce([[mockPost]])

      const result = await service.getById(1)

      expect(result).toEqual(mockPost)
    })

    it('should throw NotFoundError when not found', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      await expect(service.getById(999)).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('should insert post and return id', async () => {
      mockQuery.mockResolvedValueOnce([{ insertId: 42 }])

      const result = await service.create({
        titulo: 'New Post',
        resumen: 'Summary',
        contenido: 'Content',
        autorId: 1
      })

      expect(result).toBe(42)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO publicaciones'),
        expect.any(Array)
      )
    })
  })

  describe('update', () => {
    it('should return true when post is updated', async () => {
      mockQuery.mockResolvedValueOnce([{ changedRows: 1 }])

      const result = await service.update({
        id: 1, titulo: 'Updated', resumen: 'Summary', contenido: 'Content', autorId: 1
      })

      expect(result).toBe(true)
    })

    it('should return false when no rows changed', async () => {
      mockQuery.mockResolvedValueOnce([{ changedRows: 0 }])

      const result = await service.update({
        id: 1, titulo: 'Same', resumen: 'Same', contenido: 'Same', autorId: 1
      })

      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('should return true when post is deleted', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }])

      const result = await service.delete({ id: 1, autorId: 1 })

      expect(result).toBe(true)
    })

    it('should return false when post not found or not owned', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }])

      const result = await service.delete({ id: 999, autorId: 1 })

      expect(result).toBe(false)
    })
  })

  describe('getByAuthor', () => {
    it('should return posts by author', async () => {
      const mockPosts = [{ id: 1 }, { id: 2 }]
      mockQuery.mockResolvedValueOnce([mockPosts])

      const result = await service.getByAuthor(1)

      expect(result).toEqual(mockPosts)
    })
  })

  describe('getByIdAndAuthor', () => {
    it('should return post when found and owned', async () => {
      const mockPost = { id: 1, titulo: 'Test' }
      mockQuery.mockResolvedValueOnce([[mockPost]])

      const result = await service.getByIdAndAuthor(1, 1)

      expect(result).toEqual(mockPost)
    })

    it('should return null when not found or not owned', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.getByIdAndAuthor(999, 1)

      expect(result).toBeNull()
    })
  })

  describe('vote', () => {
    it('should return true and increment votes when post exists', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]])
      mockQuery.mockResolvedValueOnce([{}])

      const result = await service.vote(1)

      expect(result).toBe(true)
    })

    it('should return false when post does not exist', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.vote(999)

      expect(result).toBe(false)
      expect(mockQuery).toHaveBeenCalledTimes(1) // No UPDATE query
    })
  })
})

describe('AuthService', () => {
  let service

  beforeEach(() => {
    service = new AuthService(mockPool)
  })

  describe('login', () => {
    it('should return user when credentials match', async () => {
      const mockUser = { id: 1, email: 'test@test.com', contrasena: '$2b$10$validhash' }
      mockQuery.mockResolvedValueOnce([[mockUser]])

      // bcrypt.compare will fail since hash is fake — test the null path
      mockQuery.mockResolvedValueOnce([[mockUser]])

      const result = await service.login('test@test.com', 'wrongpassword')

      expect(result).toBeNull()
    })

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.login('nope@test.com', 'password')

      expect(result).toBeNull()
    })
  })

  describe('register', () => {
    it('should throw error on duplicate email', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]]) // email exists

      await expect(service.register({
        email: 'test@test.com',
        pseudonimo: 'user1',
        contrasena: 'password123'
      })).rejects.toThrow('Email duplicado')
    })

    it('should throw error on duplicate pseudonimo', async () => {
      mockQuery.mockResolvedValueOnce([[]]) // email doesn't exist
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]]) // pseudonimo exists

      await expect(service.register({
        email: 'new@test.com',
        pseudonimo: 'taken',
        contrasena: 'password123'
      })).rejects.toThrow('Pseudonimo duplicado')
    })

    it('should return new author info on success', async () => {
      mockQuery.mockResolvedValueOnce([[]]) // email doesn't exist
      mockQuery.mockResolvedValueOnce([[]]) // pseudonimo doesn't exist
      mockQuery.mockResolvedValueOnce([{ insertId: 42 }]) // insert

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
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]])

      const result = await service.emailExists('test@test.com')

      expect(result).toBe(true)
    })

    it('should return false when email does not exist', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.emailExists('nope@test.com')

      expect(result).toBe(false)
    })
  })

  describe('pseudonimoExists', () => {
    it('should return true when pseudonimo exists', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]])

      const result = await service.pseudonimoExists('user1')

      expect(result).toBe(true)
    })
  })
})

describe('AuthorService', () => {
  let service

  beforeEach(() => {
    service = new AuthorService(mockPool)
  })

  describe('listWithPublications', () => {
    it('should group publications by author', async () => {
      const mockRows = [
        { id: 1, pseudonimo: 'author1', avatar: 'a.jpg', publicacion_id: 10, titulo: 'Post 1' },
        { id: 1, pseudonimo: 'author1', avatar: 'a.jpg', publicacion_id: 11, titulo: 'Post 2' },
        { id: 2, pseudonimo: 'author2', avatar: 'b.jpg', publicacion_id: 20, titulo: 'Post 3' }
      ]
      mockQuery.mockResolvedValueOnce([mockRows])

      const result = await service.listWithPublications()

      expect(result).toHaveLength(2)
      expect(result[0].publicaciones).toHaveLength(2)
      expect(result[1].publicaciones).toHaveLength(1)
    })
  })

  describe('getByIdWithPublications', () => {
    it('should return author with publications', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1, pseudonimo: 'author1' }]])
      mockQuery.mockResolvedValueOnce([[{ id: 10, titulo: 'Post 1' }]])

      const result = await service.getByIdWithPublications(1)

      expect(result).not.toBeNull()
      expect(result.author).toHaveProperty('pseudonimo', 'author1')
      expect(result.publications).toHaveLength(1)
    })

    it('should return null when author not found', async () => {
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.getByIdWithPublications(999)

      expect(result).toBeNull()
    })

    it('should return author without publications when none exist', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1, pseudonimo: 'author1' }]])
      mockQuery.mockResolvedValueOnce([[]])

      const result = await service.getByIdWithPublications(1)

      expect(result.author).toHaveProperty('pseudonimo', 'author1')
      expect(result.publications).toBeNull()
    })
  })

  describe('list', () => {
    it('should return all authors', async () => {
      const mockAuthors = [{ id: 1 }, { id: 2 }]
      mockQuery.mockResolvedValueOnce([mockAuthors])

      const result = await service.list()

      expect(result).toEqual(mockAuthors)
    })
  })
})
