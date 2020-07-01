const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const bodyParser = require('body-parser')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

var pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    user: 'root',
    password: 'jOrgE1982!',
    database: 'blog_viajes'
})

router.get('/api/v1/publicaciones/:id', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        const consulta = ` SELECT * FROM publicaciones WHERE id = ${connection.escape(peticion.params.id)} `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.json({ data: filas })
            }
            else {
                respuesta.status(404)
                respuesta.send("Id no encontrada")
            }
        })
        connection.release()
    })
})

router.get('/api/v1/autores/', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        const consulta = ` SELECT * FROM autores  `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.json({ data: filas })
            }
            else {
                respuesta.status(404)
                respuesta.send("Filas no encontradas")
            }
        })
        connection.release()
    })
})

router.get('/api/v1/autores/:id', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        const consulta = ` SELECT * FROM autores  WHERE id = ${connection.escape(peticion.params.id)} `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                const consulta = ` SELECT
                        publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
                        FROM publicaciones
                        INNER JOIN autores
                        ON publicaciones.autor_id = autores.id                        
                        WHERE  autor_id = ${connection.escape(peticion.params.id)}  `
                connection.query(consulta, (error, filas_pub, campos) => {
                    if (filas_pub.length > 0) {
                        respuesta.json({ data: filas, publicaciones: filas_pub })
                    }
                    else {
                        respuesta.json({ data: filas })                        
                    }
                })
            }
            else {
                respuesta.status(404)
                respuesta.send("Autor no encontrado")
            }
        })
        connection.release()
    })
})

router.post('/api/v1/publicaciones/', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;

        let modificadorConsulta = ""
        const email = (peticion.query.email) ? peticion.query.email : ""
        const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""
        if (email != "" && contrasena != "") {
            modificadorConsulta = ` WHERE email = '${email}' AND contrasena = '${contrasena}' `
        }
        const consulta = ` SELECT id FROM autores ${modificadorConsulta} `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                const id = filas[0].id
                const date = new Date()
                const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
                const consulta = `
                                INSERT INTO
                                publicaciones
                                (titulo, resumen, contenido, autor_id, fecha_hora)
                                VALUES
                                (
                                    ${connection.escape(peticion.body.titulo)},
                                    ${connection.escape(peticion.body.resumen)},
                                    ${connection.escape(peticion.body.contenido)},
                                    ${connection.escape(id)},
                                    ${connection.escape(fecha)}
                                )
                                `
                connection.query(consulta, (error, filas, campos) => {

                    const id = filas.insertId
                    const consulta = ` SELECT * FROM publicaciones WHERE id = ${connection.escape(id)} `
                    connection.query(consulta, (error, filas, campos) => {
                        if (filas.length > 0) {
                            respuesta.json({ data: filas })
                        }
                        else {
                            respuesta.status(404)
                            respuesta.send("Error al crear autor")
                        }
                    })
                })
            }
            else {
                respuesta.status(404)
                respuesta.send("combinación de email y correo inválida")
            }
        })
        connection.release()
    })
})

router.delete('/api/v1/publicaciones/:id', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;

        let modificadorConsulta = ""
        const email = (peticion.query.email) ? peticion.query.email : ""
        const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""
        if (email != "" && contrasena != "") {
            modificadorConsulta = ` WHERE email = '${email}' AND contrasena = '${contrasena}' `
        }
        const consulta = ` SELECT id FROM autores ${modificadorConsulta} `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length == 0) {
                respuesta.status(404)
                respuesta.send("combinación de email y correo inválida")
            }
            else {
                const id_autor = filas[0].id

                const consulta = ` SELECT * FROM publicaciones WHERE
                id = ${connection.escape(peticion.params.id)} 
                AND autor_id = ${connection.escape(id_autor)} `
                connection.query(consulta, (error, filas, campos) => {
                    if (filas.length > 0) {
                        const consulta = `
                                DELETE
                                FROM
                                publicaciones
                                WHERE
                                id = ${connection.escape(peticion.params.id)}
                                AND
                                autor_id = ${connection.escape(id_autor)}
                                `
                        connection.query(consulta, (error, filas, campos) => {
                            if (filas && filas.affectedRows > 0) {
                                respuesta.status(200)
                                respuesta.send("Publicación eliminada")
                            }
                            else {
                                respuesta.status(404)
                                respuesta.send("Publicación no eliminada")
                            }
                        })

                    }
                    else {
                        respuesta.status(404)
                        respuesta.send("Error, la publicación no pertenece al autor")
                    }
                })

            }
        })
        connection.release()
    })
})

router.get('/api/v1/publicaciones/', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;

        let modificadorConsulta = ""
        const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
        if (busqueda != "") {
            modificadorConsulta = `
        WHERE
        titulo LIKE '%${busqueda}%' OR
        resumen LIKE '%${busqueda}%' OR
        contenido LIKE '%${busqueda}%'
      `
        }

        const consulta = ` SELECT
      publicaciones.id id, titulo, resumen, contenido, fecha_hora, pseudonimo, votos, avatar
      FROM publicaciones
      INNER JOIN autores
      ON publicaciones.autor_id = autores.id
      ${modificadorConsulta}
      ORDER BY publicaciones.id  `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.json({ data: filas })
            }
            else {
                respuesta.status(404)
                respuesta.send("filas no encontradas")
            }
        })
        connection.release()
    })
})

router.post('/api/v1/autores/', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
        const email = peticion.body.email.toLowerCase().trim()
        const pseudonimo = peticion.body.pseudonimo.trim()
        const contrasena = peticion.body.contrasena
        const consultaEmail = `
        SELECT *
        FROM autores
        WHERE email = ${connection.escape(email)}
      `
        connection.query(consultaEmail, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.status(404)
                respuesta.send("Email duplicado")
            }
            else {
                const consultaPseudonimo = `
            SELECT *
            FROM autores
            WHERE pseudonimo = ${connection.escape(pseudonimo)}
          `
                connection.query(consultaPseudonimo, (error, filas, campos) => {
                    if (filas.length > 0) {
                        respuesta.status(404)
                        respuesta.send("Pseudonimo duplicado")
                    }
                    else {
                        const consulta = `
                                  INSERT INTO
                                  autores
                                  (email, contrasena, pseudonimo)
                                  VALUES (
                                    ${connection.escape(email)},
                                    ${connection.escape(contrasena)},
                                    ${connection.escape(pseudonimo)}
                                  )
                                `
                        connection.query(consulta, (error, filas, campos) => {

                            const id = filas.insertId
                            const consulta = ` SELECT * FROM autores WHERE id = ${connection.escape(id)} `
                            connection.query(consulta, (error, filas, campos) => {
                                if (filas.length > 0) {
                                    respuesta.json({ data: filas })
                                }
                                else {
                                    respuesta.status(404)
                                    respuesta.send("Error al crear autor")
                                }
                            })

                        })
                    }
                })
            }
        })
        connection.release()
    })
})

module.exports = router
