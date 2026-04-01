const prisma = require('../../db')

/**
 * AuthorService — Business logic for author/public profile operations.
 * Uses Prisma ORM for database access.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class AuthorService {
  /**
   * Get all authors with their most recent publications.
   * Returns authors grouped with their posts.
   */
  async listWithPublications() {
    const autores = await prisma.autor.findMany({
      include: {
        publicaciones: {
          orderBy: { fechaHora: 'desc' }
        }
      },
      orderBy: { id: 'desc' }
    })

    return autores.map(autor => ({
      id: autor.id,
      pseudonimo: autor.pseudonimo,
      avatar: autor.avatar,
      publicaciones: autor.publicaciones.map(pub => ({
        id: pub.id,
        titulo: pub.titulo
      }))
    }))
  }

  /**
   * Get a single author by ID with their publications.
   * Returns { author, publications } or null if not found.
   */
  async getByIdWithPublications(id) {
    const autor = await prisma.autor.findUnique({
      where: { id: parseInt(id) },
      include: {
        publicaciones: {
          orderBy: { fechaHora: 'desc' }
        }
      }
    })

    if (!autor) {
      return null
    }

    return {
      author: autor,
      publications: autor.publicaciones.length > 0 ? autor.publicaciones : null
    }
  }

  /**
   * Get all authors (basic list, no publications).
   */
  async list() {
    return prisma.autor.findMany()
  }
}

module.exports = AuthorService
