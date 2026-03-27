const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const pool = require('../db')

router.get('/api/v1/publicaciones/:id', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const consulta = `SELECT * FROM publicaciones WHERE id = ${connection.escape(peticion.params.id)}`
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas.length > 0) {
        respuesta.json({ data: filas })
      }
      else {
        respuesta.status(404).send("Id no encontrada")
      }
    })
  })
})

router.get('/api/v1/autores/', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const consulta = `SELECT * FROM autores`
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas.length > 0) {
        respuesta.json({ data: filas })
      }
      else {
        respuesta.status(404).send("Filas no encontradas")
      }
    })
  })
})

router.get('/api/v1/autores/:id', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const consulta = `SELECT * FROM autores WHERE id = ${connection.escape(peticion.params.id)}`
    connection.query(consulta, (error, filas, campos) => {
      if (filas.length > 0) {
        const consultaPub = `
          SELECT publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
          FROM publicaciones
          INNER JOIN autores
          ON publicaciones.autor_id = autores.id
          WHERE autor_id = ${connection.escape(peticion.params.id)}
        `
        connection.query(consultaPub, (error, filas_pub, campos) => {
          connection.release()
          if (filas_pub.length > 0) {
            respuesta.json({ data: filas, publicaciones: filas_pub })
          }
          else {
            respuesta.json({ data: filas })
          }
        })
      }
      else {
        connection.release()
        respuesta.status(404).send("Autor no encontrado")
      }
    })
  })
})

router.post('/api/v1/publicaciones/', (peticion, respuesta) => {
  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

    if (email == "" || contrasena == "") {
      connection.release()
      return respuesta.status(400).send("Email y contraseña son requeridos")
    }

    const consulta = `SELECT * FROM autores WHERE email = ${connection.escape(email)}`
    connection.query(consulta, async (error, filas, campos) => {
      if (filas.length > 0) {
        try {
          const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
          if (!coincide) {
            connection.release()
            return respuesta.status(401).send("Combinación de email y contraseña inválida")
          }
        } catch (e) {
          connection.release()
          return respuesta.status(500).send("Error verificando credenciales")
        }

        const id = filas[0].id
        const date = new Date()
        const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        const consultaInsert = `
          INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora)
          VALUES (
            ${connection.escape(peticion.body.titulo)},
            ${connection.escape(peticion.body.resumen)},
            ${connection.escape(peticion.body.contenido)},
            ${connection.escape(id)},
            ${connection.escape(fecha)}
          )
        `
        connection.query(consultaInsert, (error, filas, campos) => {
          const insertId = filas.insertId
          const consultaSelect = `SELECT * FROM publicaciones WHERE id = ${connection.escape(insertId)}`
          connection.query(consultaSelect, (error, filas, campos) => {
            connection.release()
            if (filas.length > 0) {
              respuesta.json({ data: filas })
            }
            else {
              respuesta.status(500).send("Error al crear publicación")
            }
          })
        })
      }
      else {
        connection.release()
        respuesta.status(401).send("Combinación de email y contraseña inválida")
      }
    })
  })
})

router.delete('/api/v1/publicaciones/:id', (peticion, respuesta) => {
  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""

    if (email == "" || contrasena == "") {
      connection.release()
      return respuesta.status(400).send("Email y contraseña son requeridos")
    }

    const consulta = `SELECT * FROM autores WHERE email = ${connection.escape(email)}`
    connection.query(consulta, async (error, filas, campos) => {
      if (filas.length == 0) {
        connection.release()
        return respuesta.status(401).send("Combinación de email y contraseña inválida")
      }

      try {
        const coincide = await bcrypt.compare(contrasena, filas[0].contrasena)
        if (!coincide) {
          connection.release()
          return respuesta.status(401).send("Combinación de email y contraseña inválida")
        }
      } catch (e) {
        connection.release()
        return respuesta.status(500).send("Error verificando credenciales")
      }

      const id_autor = filas[0].id
      const consultaPub = `
        SELECT * FROM publicaciones
        WHERE id = ${connection.escape(peticion.params.id)}
        AND autor_id = ${connection.escape(id_autor)}
      `
      connection.query(consultaPub, (error, filas, campos) => {
        if (filas.length > 0) {
          const consultaDelete = `
            DELETE FROM publicaciones
            WHERE id = ${connection.escape(peticion.params.id)}
            AND autor_id = ${connection.escape(id_autor)}
          `
          connection.query(consultaDelete, (error, filas, campos) => {
            connection.release()
            if (filas && filas.affectedRows > 0) {
              respuesta.status(200).send("Publicación eliminada")
            }
            else {
              respuesta.status(500).send("Publicación no eliminada")
            }
          })
        }
        else {
          connection.release()
          respuesta.status(403).send("La publicación no pertenece al autor")
        }
      })
    })
  })
})

router.get('/api/v1/publicaciones/', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    let modificadorConsulta = ""
    const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
    if (busqueda != "") {
      const busquedaSegura = connection.escape(`%${busqueda}%`)
      modificadorConsulta = `WHERE titulo LIKE ${busquedaSegura} OR resumen LIKE ${busquedaSegura} OR contenido LIKE ${busquedaSegura}`
    }

    const consulta = `
      SELECT publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
      FROM publicaciones
      INNER JOIN autores
      ON publicaciones.autor_id = autores.id
      ${modificadorConsulta}
      ORDER BY publicaciones.id
    `
    connection.query(consulta, (error, filas, campos) => {
      connection.release()
      if (filas.length > 0) {
        respuesta.json({ data: filas })
      }
      else {
        respuesta.status(404).send("filas no encontradas")
      }
    })
  })
})

router.post('/api/v1/autores/', (peticion, respuesta) => {
  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error('Error de conexión:', err)
      return respuesta.status(500).json({ error: 'Error del servidor' })
    }

    const email = peticion.body.email.toLowerCase().trim()
    const pseudonimo = peticion.body.pseudonimo.trim()
    const contrasenaPlana = peticion.body.contrasena

    try {
      const contrasenaHasheada = await bcrypt.hash(contrasenaPlana, 10)

      const consultaEmail = `SELECT * FROM autores WHERE email = ${connection.escape(email)}`
      connection.query(consultaEmail, (error, filas, campos) => {
        if (filas.length > 0) {
          connection.release()
          return respuesta.status(409).send("Email duplicado")
        }

        const consultaPseudonimo = `SELECT * FROM autores WHERE pseudonimo = ${connection.escape(pseudonimo)}`
        connection.query(consultaPseudonimo, (error, filas, campos) => {
          if (filas.length > 0) {
            connection.release()
            return respuesta.status(409).send("Pseudonimo duplicado")
          }

          const consulta = `
            INSERT INTO autores (email, contrasena, pseudonimo)
            VALUES (${connection.escape(email)}, ${connection.escape(contrasenaHasheada)}, ${connection.escape(pseudonimo)})
          `
          connection.query(consulta, (error, filas, campos) => {
            const id = filas.insertId
            const consultaSelect = `SELECT * FROM autores WHERE id = ${connection.escape(id)}`
            connection.query(consultaSelect, (error, filas, campos) => {
              connection.release()
              if (filas.length > 0) {
                respuesta.json({ data: filas })
              }
              else {
                respuesta.status(500).send("Error al crear autor")
              }
            })
          })
        })
      })
    } catch (error) {
      connection.release()
      console.error('Error creando autor:', error)
      respuesta.status(500).send("Error al crear autor")
    }
  })
})

module.exports = router
