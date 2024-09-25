/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table('users', (table) => {
    table.string('selectedWebhook').nullable()
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('selectedWebhook')
  })
