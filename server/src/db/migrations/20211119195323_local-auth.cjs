const config = require('@rm/config')

const tableName = config.getSafe('database.settings.userTableName')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.string('username')
    table.string('password')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.dropColumn('username')
    table.dropColumn('password')
  })
