const config = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.json('data')
    },
  )

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.dropColumn('data')
    },
  )
