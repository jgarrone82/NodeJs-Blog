const prisma = require('../../db')
const { NotFoundError } = require('../errors')
const { get, set, invalidatePosts, TTL, KEYS } = require('../cache')

/**
 * PostService — Business logic for post operations.
 * Uses Prisma ORM for database access.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class PostService {
  /**
   * Get paginated list of posts with author info.
   * Supports search, pagination, and sorting.
   */
  async list({ busqueda = '', pagina = 0, limit = 5, ordenar = 'fecha', direccion = 'desc' } = {}) {
    if (pagina < 0) pagina = 0

    // Only cache non-search, default sort queries (search results are too varied)
    const cacheable = !busqueda && ordenar === 'fecha' && direccion === 'desc'

    if (cacheable) {
      const { data, hit } = get(KEYS.POST_LIST(busqueda, pagina))
      if (hit) return data
    }

    // Map sort field to Prisma field names
    const sortFieldMap = {
      fecha: 'fechaHora',
      votos: 'votos',
      titulo: 'titulo'
    }
    const sortField = sortFieldMap[ordenar] || 'fechaHora'
    const sortDir = direccion === 'asc' ? 'asc' : 'desc'

    const whereClause = busqueda
      ? {
          OR: [
            { titulo: { contains: busqueda } },
            { resumen: { contains: busqueda } },
            { contenido: { contains: busqueda } }
          ]
        }
      : {}

    const publicaciones = await prisma.publicacion.findMany({
      where: whereClause,
      skip: busqueda ? undefined : pagina * limit,
      take: busqueda ? undefined : limit,
      include: { autor: true },
      orderBy: { [sortField]: sortDir }
    })

    const result = publicaciones.map(this._toPublicFormat)

    if (cacheable) {
      set(KEYS.POST_LIST(busqueda, pagina), result, TTL.POST_LIST)
    }

    return result
  }

  /**
   * Get a single post by ID.
   * Throws NotFoundError if not found.
   */
  async getById(id) {
    const cacheKey = KEYS.POST_SINGLE(id)
    const { data, hit } = get(cacheKey)
    if (hit) return data

    const publicacion = await prisma.publicacion.findUnique({
      where: { id: parseInt(id) },
      include: { autor: true }
    })

    if (!publicacion) {
      throw new NotFoundError('Publicación no encontrada')
    }

    const result = this._toPublicFormat(publicacion)
    set(cacheKey, result, TTL.POST_SINGLE)
    return result
  }

  /**
   * Get a post by ID, verifying it belongs to the given author.
   * Returns the post or null if not found or not owned by author.
   */
  async getByIdAndAuthor(id, autorId) {
    const publicacion = await prisma.publicacion.findFirst({
      where: {
        id: parseInt(id),
        autorId: parseInt(autorId)
      },
      include: { autor: true }
    })

    return publicacion ? this._toPublicFormat(publicacion) : null
  }

  /**
   * Create a new post.
   */
  async create({ titulo, resumen, contenido, autorId }) {
    const fecha = new Date()

    const publicacion = await prisma.publicacion.create({
      data: {
        titulo,
        resumen,
        contenido,
        autorId: parseInt(autorId),
        fechaHora: fecha
      }
    })

    // Invalidate all post cache when a new post is created
    invalidatePosts()

    return publicacion.id
  }

  /**
   * Update an existing post.
   * Verifies the post belongs to the author before updating.
   * Returns true if updated, false if no changes or not authorized.
   */
  async update({ id, titulo, resumen, contenido, autorId }) {
    try {
      await prisma.publicacion.update({
        where: {
          id: parseInt(id),
          autorId: parseInt(autorId)
        },
        data: { titulo, resumen, contenido }
      })
      // Invalidate all post cache when a post is updated
      invalidatePosts()
      return true
    } catch (error) {
      // Prisma throws P2025 when record not found
      return false
    }
  }

  /**
   * Delete a post.
   * Verifies the post belongs to the author before deleting.
   * Returns true if deleted, false if not found or not authorized.
   */
  async delete({ id, autorId }) {
    try {
      await prisma.publicacion.delete({
        where: {
          id: parseInt(id),
          autorId: parseInt(autorId)
        }
      })
      // Invalidate all post cache when a post is deleted
      invalidatePosts()
      return true
    } catch (error) {
      // Prisma throws P2025 when record not found
      return false
    }
  }

  /**
   * Get posts by a specific author (for admin dashboard).
   */
  async getByAuthor(autorId) {
    const publicaciones = await prisma.publicacion.findMany({
      where: { autorId: parseInt(autorId) },
      orderBy: { fechaHora: 'desc' }
    })

    return publicaciones.map(this._toPublicFormat)
  }

  /**
   * Increment vote count for a post.
   * Returns { success: boolean, votos: number | null }.
   */
  async vote(id) {
    try {
      const updated = await prisma.publicacion.update({
        where: { id: parseInt(id) },
        data: { votos: { increment: 1 } }
      })
      return { success: true, votos: updated.votos }
    } catch (error) {
      return { success: false, votos: null }
    }
  }

  /**
   * Get related posts by the same author, excluding the current post.
   * Returns up to `limit` posts.
   */
  async getRelatedPosts(postId, autorId, limit = 3) {
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        autorId: parseInt(autorId),
        id: { not: parseInt(postId) }
      },
      orderBy: { fechaHora: 'desc' },
      take: limit,
      include: { autor: true }
    })

    return publicaciones.map(this._toPublicFormat)
  }

  /**
   * Convert Prisma format to the flat format expected by views.
   * Prisma returns nested objects (publicacion.autor.pseudonimo),
   * views expect flat fields (pseudonimo, avatar).
   */
  _toPublicFormat(publicacion) {
    const wordCount = publicacion.contenido ? publicacion.contenido.split(/\s+/).length : 0
    return {
      id: publicacion.id,
      titulo: publicacion.titulo,
      resumen: publicacion.resumen,
      contenido: publicacion.contenido,
      fecha_hora: publicacion.fechaHora,
      pseudonimo: publicacion.autor?.pseudonimo || '',
      votos: publicacion.votos,
      avatar: publicacion.autor?.avatar || null,
      autorId: publicacion.autorId,
      tiempo_lectura: Math.ceil(wordCount / 200) || 1
    }
  }
}

module.exports = PostService
