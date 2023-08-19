const {
  database: {
    settings: { userTableName },
  },
} = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.createTable('nest_submissions', (table) => {
    table.bigInteger('nest_id').primary()
    table
      .bigInteger('user_id')
      .references(`${userTableName}.id`)
      .unsigned()
      .notNullable()
      .index()
    table.string('name').notNullable()
    table.string('submitted_by').notNullable().defaultTo('unknown')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = (knex) => knex.schema.dropTableIfExists('nest_submissions')
