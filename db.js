const mysql = require('mysql2/promise')
const config = require('./src/config/env')

const pool = mysql.createPool({
  connectionLimit: 20,
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name
})

module.exports = pool
