/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table('users', (table) => {
    table.string('username')
    table.string('password')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('username')
    table.dropColumn('password')
  })
