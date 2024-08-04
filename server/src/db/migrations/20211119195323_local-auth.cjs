const config = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.string('username')
      table.string('password')
    },
  )

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.dropColumn('username')
      table.dropColumn('password')
    },
  )
