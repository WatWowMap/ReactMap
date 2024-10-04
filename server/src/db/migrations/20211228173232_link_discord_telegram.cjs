/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table('users', (table) => {
    table.json('discordPerms')
    table.json('telegramPerms')
    table.string('webhookStrategy')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('discordPerms')
    table.dropColumn('telegramPerms')
    table.dropColumn('webhookStrategy')
  })
