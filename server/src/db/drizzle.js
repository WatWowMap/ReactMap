// server/src/db/drizzle.js
// @ts-check
const mysql = require('mysql2/promise')
const { drizzle } = require('drizzle-orm/mysql2')

const config = require('@rm/config')
const { resolveReactMapSchema } = require('./reactMapDb')

/** @type {import('drizzle-orm/mysql2').MySql2Database | null} */
let cached = null

/**
 * Drizzle client over the ReactMap database. Built once, on first use, so that
 * importing this module never opens a connection during tests.
 */
function getDrizzle() {
  if (cached) return cached

  const schema = resolveReactMapSchema(config.getSafe('database.schemas'))
  if (!schema) {
    throw new Error(
      'No configured database schema serves ReactMap categories. Check database.schemas[].useFor.',
    )
  }

  const pool = mysql.createPool({
    host: schema.host,
    port: schema.port,
    user: schema.username,
    password: schema.password,
    database: schema.database,
    connectionLimit: schema.connectionLimit || 10,
  })

  cached = drizzle(pool)
  return cached
}

module.exports = { getDrizzle }
