/**
 * AuthorService — Business logic for author/public profile operations.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class AuthorService {
  constructor(pool) {
    this.pool = pool
  }

  /**
   * Get all authors with their most recent publications.
   * Returns authors grouped with their posts.
   */
  async listWithPublications() {
    const consulta = `
      SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
      FROM autores
      INNER JOIN publicaciones ON autores.id = publicaciones.autor_id
      ORDER BY autores.id DESC, publicaciones.fecha_hora DESC
    `

    const [filas] = await this.pool.query(consulta)

    // Group publications by author
    const autores = []
    let ultimoAutorId = undefined

    filas.forEach(registro => {
      if (registro.id !== ultimoAutorId) {
        ultimoAutorId = registro.id
        autores.push({
          id: registro.id,
          pseudonimo: registro.pseudonimo,
          avatar: registro.avatar,
          publicaciones: []
        })
      }
      autores[autores.length - 1].publicaciones.push({
        id: registro.publicacion_id,
        titulo: registro.titulo
      })
    })

    return autores
  }

  /**
   * Get a single author by ID with their publications.
   * Returns { author, publications } or null if not found.
   */
  async getByIdWithPublications(id) {
    const [filasAutor] = await this.pool.query(
      'SELECT * FROM autores WHERE id = ?',
      [id]
    )

    if (filasAutor.length === 0) {
      return null
    }

    const [filasPub] = await this.pool.query(
      `SELECT publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
       FROM publicaciones
       INNER JOIN autores ON publicaciones.autor_id = autores.id
       WHERE autor_id = ?`,
      [id]
    )

    return {
      author: filasAutor[0],
      publications: filasPub.length > 0 ? filasPub : null
    }
  }

  /**
   * Get all authors (basic list, no publications).
   */
  async list() {
    const [filas] = await this.pool.query('SELECT * FROM autores')
    return filas
  }
}

module.exports = AuthorService
