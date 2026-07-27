const request = require('supertest')
const cheerio = require('cheerio')
const bcrypt = require('bcrypt')
const app = require('../webapp')
const mockPrisma = global.__mockPrisma

// Ordenadas de más nueva a más vieja, como retornan las queries (orderBy fechaHora desc)
const mockPublicaciones = [
  {
    id: 3, titulo: 'Playas de Tailandia', resumen: 'Arena blanca',
    contenido: 'Mar y sol', fechaHora: new Date(2024, 2, 10),
    autorId: 2, votos: 0, foto: null,
    autor: { pseudonimo: 'viajero2', avatar: null }
  },
  {
    id: 2, titulo: 'Ruta por los Andes', resumen: 'Montañas infinitas',
    contenido: 'Caminata de altura', fechaHora: new Date(2024, 1, 20),
    autorId: 1, votos: 3, foto: null,
    autor: { pseudonimo: 'viajero1', avatar: null }
  },
  {
    id: 1, titulo: 'Mi viaje a París', resumen: 'Una experiencia increíble',
    contenido: 'Contenido completo del viaje', fechaHora: new Date(2024, 0, 15),
    autorId: 1, votos: 5, foto: null,
    autor: { pseudonimo: 'viajero1', avatar: null }
  }
]

const contrasenaHash = bcrypt.hashSync('password123', 4)
const mockUsuario = {
  id: 1, email: 'test@test.com', pseudonimo: 'viajero1',
  avatar: null, contrasena: contrasenaHash
}

async function iniciarSesion() {
  const agente = request.agent(app)
  mockPrisma.autor.findUnique.mockResolvedValueOnce(mockUsuario)
  const res = await agente
    .post('/procesar_inicio')
    .send({ email: 'test@test.com', contrasena: 'password123' })
  expect(res.status).toBe(302)
  expect(res.headers.location).toBe('/admin/index')
  return agente
}

describe('Vistas - Página principal (index)', () => {
  it('debería renderizar la sección hero', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(3)

    const res = await request(app).get('/')

    expect(res.status).toBe(200)
    const $ = cheerio.load(res.text)
    expect($('.hero-section').length).toBe(1)
    expect($('.hero-title').text()).toBe('Nomad Notes')
    expect($('.hero-tagline').text()).toBe('Share Your Journey')
  })

  it('debería renderizar la publicación más nueva como destacada', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(3)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    expect($('.featured-card').length).toBe(1)
    expect($('.featured-card a[href="/publicacion/3"]').text()).toBe('Playas de Tailandia')
    expect($('.featured-card .vote-badge').text()).toBe('0')
  })

  it('debería renderizar el resto de publicaciones en la grilla', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(3)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    expect($('.post-grid .post-card').length).toBe(2)
    expect($('.post-grid a[href="/publicacion/2"]').text()).toBe('Ruta por los Andes')
    expect($('.post-grid a[href="/publicacion/1"]').text()).toBe('Mi viaje a París')
  })

  it('debería renderizar metadatos en las tarjetas (autor, fecha, tiempo de lectura, resumen)', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(3)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    const meta = $('.featured-card .meta').text()
    expect(meta).toContain('viajero2')
    expect(meta).toContain('2024/03/10')
    expect(meta).toContain('1 min read')
    expect($('.featured-card .excerpt').text()).toBe('Arena blanca')
  })

  it('debería mostrar mensaje vacío cuando no hay publicaciones', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])
    mockPrisma.publicacion.count.mockResolvedValueOnce(0)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    expect($('.featured-card').length).toBe(0)
    expect($('main').text()).toContain('No posts found.')
  })
})

describe('Vistas - Paginación (partial)', () => {
  it('debería renderizar paginación con Prev deshabilitado en la primera página', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(12)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    expect($('nav.pagination').length).toBe(1)
    expect($('span.pagination-disabled').first().text()).toContain('Prev')
    expect($('span.pagination-active').text()).toBe('1')
    const next = $('a.pagination-item').filter((i, el) => $(el).text().includes('Next'))
    expect(next.attr('href')).toBe('/?pagina=1')
  })

  it('debería renderizar enlaces Prev y Next en una página intermedia', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(12)

    const res = await request(app).get('/?pagina=1')

    const $ = cheerio.load(res.text)
    expect($('span.pagination-active').text()).toBe('2')
    const prev = $('a.pagination-item').filter((i, el) => $(el).text().includes('Prev'))
    expect(prev.attr('href')).toBe('/?pagina=0')
    const next = $('a.pagination-item').filter((i, el) => $(el).text().includes('Next'))
    expect(next.attr('href')).toBe('/?pagina=2')
  })

  it('no debería renderizar paginación con una sola página', async () => {
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(mockPublicaciones)
    mockPrisma.publicacion.count.mockResolvedValueOnce(3)

    const res = await request(app).get('/')

    const $ = cheerio.load(res.text)
    expect($('nav.pagination').length).toBe(0)
  })
})

describe('Vistas - Publicación individual', () => {
  it('debería renderizar título y metadatos (autor, fecha, tiempo de lectura)', async () => {
    mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicaciones[2])
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/publicacion/1')

    expect(res.status).toBe(200)
    const $ = cheerio.load(res.text)
    expect($('article h1').first().text()).toBe('Mi viaje a París')
    expect($('.meta-bar .meta-author span').text()).toBe('viajero1')
    const metaBar = $('.meta-bar').text()
    expect(metaBar).toContain('2024/01/15')
    expect(metaBar).toContain('1 min read')
  })

  it('debería renderizar el contenido y el contador de votos', async () => {
    mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicaciones[2])
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/publicacion/1')

    const $ = cheerio.load(res.text)
    expect($('.prose').text()).toContain('Contenido completo del viaje')
    expect($('#vote-count').text()).toBe('5')
  })

  it('debería renderizar publicaciones relacionadas del mismo autor', async () => {
    mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicaciones[2])
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([mockPublicaciones[1]])

    const res = await request(app).get('/publicacion/1')

    const $ = cheerio.load(res.text)
    expect($('article section h2').text()).toBe('More from viajero1')
    expect($('article section .post-card').length).toBe(1)
    expect($('article section a[href="/publicacion/2"]').text()).toBe('Ruta por los Andes')
  })

  it('no debería renderizar la sección de relacionadas cuando no hay', async () => {
    mockPrisma.publicacion.findUnique.mockResolvedValueOnce(mockPublicaciones[2])
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/publicacion/1')

    const $ = cheerio.load(res.text)
    expect($('article section').length).toBe(0)
  })

  it('debería retornar 404 cuando la publicación no existe', async () => {
    mockPrisma.publicacion.findUnique.mockResolvedValueOnce(null)
    mockPrisma.publicacion.findMany.mockResolvedValueOnce([])

    const res = await request(app).get('/publicacion/999')

    expect(res.status).toBe(404)
  })
})

describe('Vistas - Admin dashboard', () => {
  const publicacionesAutor = [
    { ...mockPublicaciones[1], autor: undefined },
    { ...mockPublicaciones[2], autor: undefined }
  ]

  it('debería redirigir a /inicio sin sesión', async () => {
    const res = await request(app).get('/admin/index')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/inicio')
  })

  it('debería renderizar el sidebar con enlaces de navegación', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesAutor)

    const res = await agente.get('/admin/index')

    expect(res.status).toBe(200)
    const $ = cheerio.load(res.text)
    expect($('aside').length).toBe(1)
    const enlaces = $('.admin-sidebar-link')
    expect(enlaces.length).toBe(3)
    expect(enlaces.eq(0).attr('href')).toBe('/admin/index')
    expect(enlaces.eq(1).attr('href')).toBe('/admin/agregar')
    expect(enlaces.eq(2).attr('href')).toBe('/admin/procesar_cerrar_sesion')
  })

  it('debería renderizar las tarjetas de estadísticas con totales', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesAutor)

    const res = await agente.get('/admin/index')

    const $ = cheerio.load(res.text)
    expect($('.stats-card').length).toBe(3)
    expect($('.stats-card-value').eq(0).text()).toBe('2')
    expect($('.stats-card-value').eq(1).text()).toBe('8')
    expect($('.stats-card-value').eq(2).text()).toBe('1 min')
    expect($('.stats-card-label').eq(0).text()).toBe('Total Posts')
    expect($('.stats-card-label').eq(1).text()).toBe('Total Votes')
  })

  it('debería renderizar el markup de búsqueda y filtro', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesAutor)

    const res = await agente.get('/admin/index')

    const $ = cheerio.load(res.text)
    expect($('input[placeholder="Search posts by title..."]').length).toBe(1)
    const opciones = $('select option')
    expect(opciones.length).toBe(3)
    expect(opciones.map((i, el) => $(el).attr('value')).get())
      .toEqual(['all', 'with_votes', 'no_votes'])
  })

  it('debería renderizar la tabla de publicaciones con acciones', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesAutor)

    const res = await agente.get('/admin/index')

    const $ = cheerio.load(res.text)
    const filas = $('table.data-table tbody tr')
    expect(filas.length).toBe(2)
    expect(filas.eq(0).find('td').first().text()).toBe('Ruta por los Andes')
    expect($('a[href="/admin/editar/2"]').length).toBe(1)
    const formulario = $('form[action="/admin/procesar_eliminar"]').first()
    expect(formulario.find('input[name="id"]').attr('value')).toBe('2')
  })

  it('debería renderizar el encabezado privado con el pseudónimo del usuario', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesAutor)

    const res = await agente.get('/admin/index')

    const $ = cheerio.load(res.text)
    expect($('body').text()).toContain('viajero1')
    expect($('h1').first().text()).toBe('Dashboard')
  })
})

describe('Vistas - Alertas (mensajes flash)', () => {
  it('debería mostrar alerta en /inicio tras credenciales inválidas', async () => {
    const agente = request.agent(app)
    mockPrisma.autor.findUnique.mockResolvedValueOnce(null)

    const res = await agente
      .post('/procesar_inicio')
      .send({ email: 'test@test.com', contrasena: 'incorrecta' })

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/inicio')

    const paginaInicio = await agente.get('/inicio')
    const $ = cheerio.load(paginaInicio.text)
    expect($('.alert.alert-info').text()).toContain('Datos inválidos')
  })

  it('debería mostrar alerta en el dashboard tras agregar una publicación', async () => {
    const agente = await iniciarSesion()
    mockPrisma.publicacion.create.mockResolvedValueOnce({ id: 10 })

    const res = await agente
      .post('/admin/procesar_agregar')
      .send({ titulo: 'Nuevo post', resumen: 'Resumen', contenido: 'Contenido' })

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/admin/index')

    mockPrisma.publicacion.findMany.mockResolvedValueOnce(publicacionesConNueva())
    const dashboard = await agente.get('/admin/index')
    const $ = cheerio.load(dashboard.text)
    expect($('.alert.alert-info').text()).toContain('Publicación agregada')
  })
})

function publicacionesConNueva() {
  return [
    {
      id: 10, titulo: 'Nuevo post', resumen: 'Resumen', contenido: 'Contenido',
      fechaHora: new Date(2024, 3, 1), autorId: 1, votos: 0, foto: null
    }
  ]
}
