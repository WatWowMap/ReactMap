// @ts-check
const { knex } = require('knex')

const { log, TAGS } = require('@rm/logger')

const { knexConfig } = require('./knexfile.cjs')

async function migrate() {
  log.info(TAGS.db, 'starting database migrations')
  const connection = knex(knexConfig)
  await connection.migrate.latest()
  await connection.destroy()
  log.info(TAGS.db, 'database migrated')
}

module.exports = { migrate }
