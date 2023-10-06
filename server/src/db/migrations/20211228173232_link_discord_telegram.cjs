const config = require('@rm/config')

const tableName = config.getSafe('database.settings.userTableName')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.json('discordPerms')
    table.json('telegramPerms')
    table.string('webhookStrategy')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.dropColumn('discordPerms')
    table.dropColumn('telegramPerms')
    table.dropColumn('webhookStrategy')
  })
