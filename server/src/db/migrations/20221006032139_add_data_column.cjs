/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table('users', (table) => {
    table.json('data')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('data')
  })
