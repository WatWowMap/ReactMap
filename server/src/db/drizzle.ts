// server/src/db/drizzle.ts

import config from '@rm/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { resolveReactMapSchema } from './react-map-db'

// Typed `any` rather than `ReturnType<typeof drizzle>`: two copies of the
// `mysql2` package end up in the dependency tree (root vs. drizzle-orm's own
// resolution), and TS treats their `Pool` types as structurally different
// even though they are the same package at runtime -- an artifact of the
// duplicate install, not a real type distinction.
let cached: any = null

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

export { getDrizzle, resetDrizzle }
