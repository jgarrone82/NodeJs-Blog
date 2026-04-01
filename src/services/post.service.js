const { NotFoundError } = require('../errors')

/**
 * PostService — Business logic for post operations.
 * No HTTP concerns (no req/res, no flash, no redirect).
 */
class PostService {
  constructor(pool) {
    this.pool = pool
  }

  /**
   * Get paginated list of posts with author info.
   * If busqueda is provided, search is performed instead of pagination.
   */
  async list({ busqueda = '', pagina = 0, limit = 5 } = {}) {
    let modificadorConsulta = ''
    let modificadorPagina = ''

    if (busqueda) {
      const busquedaSegura = this.pool.escape(`%${busqueda}%`)
      modificadorConsulta = `WHERE titulo LIKE ${busquedaSegura} OR resumen LIKE ${busquedaSegura} OR contenido LIKE ${busquedaSegura}`
    } else {
      if (pagina < 0) pagina = 0
      modificadorPagina = `LIMIT ${limit} OFFSET ${pagina * limit}`
    }

    const consulta = `
      SELECT
        publicaciones.id id, titulo, resumen, fecha_hora, pseudonimo, votos, avatar
      FROM publicaciones
      INNER JOIN autores ON publicaciones.autor_id = autores.id
      ${modificadorConsulta}
      ORDER BY fecha_hora DESC
      ${modificadorPagina}
    `

    const [filas] = await this.pool.query(consulta)
    return filas
  }

  /**
   * Get a single post by ID.
   * Throws NotFoundError if not found.
   */
  async getById(id) {
    const [filas] = await this.pool.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [id]
    )

    if (filas.length === 0) {
      throw new NotFoundError('Publicación no encontrada')
    }

    return filas[0]
  }

  /**
   * Get a post by ID, verifying it belongs to the given author.
   * Returns the post or null if not found or not owned by author.
   */
  async getByIdAndAuthor(id, autorId) {
    const [filas] = await this.pool.query(
      'SELECT * FROM publicaciones WHERE id = ? AND autor_id = ?',
      [id, autorId]
    )

    return filas.length > 0 ? filas[0] : null
  }

  /**
   * Create a new post.
   */
  async create({ titulo, resumen, contenido, autorId }) {
    const date = new Date()
    const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    const [resultado] = await this.pool.query(
      'INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora) VALUES (?, ?, ?, ?, ?)',
      [titulo, resumen, contenido, autorId, fecha]
    )

    return resultado.insertId
  }

  /**
   * Update an existing post.
   * Verifies the post belongs to the author before updating.
   * Returns true if updated, false if no changes or not authorized.
   */
  async update({ id, titulo, resumen, contenido, autorId }) {
    const [resultado] = await this.pool.query(
      'UPDATE publicaciones SET titulo = ?, resumen = ?, contenido = ? WHERE id = ? AND autor_id = ?',
      [titulo, resumen, contenido, id, autorId]
    )

    return resultado.changedRows > 0
  }

  /**
   * Delete a post.
   * Verifies the post belongs to the author before deleting.
   * Returns true if deleted, false if not found or not authorized.
   */
  async delete({ id, autorId }) {
    const [resultado] = await this.pool.query(
      'DELETE FROM publicaciones WHERE id = ? AND autor_id = ?',
      [id, autorId]
    )

    return resultado.affectedRows > 0
  }

  /**
   * Get posts by a specific author (for admin dashboard).
   */
  async getByAuthor(autorId) {
    const [filas] = await this.pool.query(
      'SELECT * FROM publicaciones WHERE autor_id = ?',
      [autorId]
    )

    return filas
  }

  /**
   * Increment vote count for a post.
   * Returns true if post exists and was voted.
   */
  async vote(id) {
    const [filas] = await this.pool.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [id]
    )

    if (filas.length === 0) {
      return false
    }

    await this.pool.query(
      'UPDATE publicaciones SET votos = votos + 1 WHERE id = ?',
      [id]
    )

    return true
  }
}

module.exports = PostService
