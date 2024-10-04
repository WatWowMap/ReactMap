/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.createTable('users', (table) => {
    table.string('id')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = (knex) => knex.schema.dropTableIfExists('users')
