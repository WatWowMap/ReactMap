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
  })

  cached = drizzle(pool)
  return cached
}

/**
 * Drops the cached client. `bun test` runs every file in one process, so
 * without this a test that builds a client leaves it in place for every test
 * after it, including ones that mean to exercise a different configuration.
 */
function resetDrizzle() {
  cached = null
}

module.exports = { getDrizzle, resetDrizzle }
