// @ts-check
const { knex } = require('knex')

const { log, HELPERS } = require('@rm/logger')

const { knexConfig } = require('./knexfile.cjs')

async function migrate() {
  log.info(HELPERS.db, 'starting database migrations')
  const connection = knex(knexConfig)
  await connection.migrate.latest()
  await connection.destroy()
  log.info(HELPERS.db, 'database migrated')
}

module.exports = { migrate }
