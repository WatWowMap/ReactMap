const config = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.json('discordPerms')
      table.json('telegramPerms')
      table.string('webhookStrategy')
    },
  )

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(
    config.getSafe('database.settings.userTableName'),
    (table) => {
      table.dropColumn('discordPerms')
      table.dropColumn('telegramPerms')
      table.dropColumn('webhookStrategy')
    },
  )
