const { database: { settings: { userTableName } } } = require('../../services/config')
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => knex.schema.createTable('gym_badges', table => {
  table.bigIncrements('id')
  table.bigInteger('user_id')
    .references(`${userTableName}.id`)
    .notNullable()
    .index()
    .unsigned()
  table.string('gym_id')
  table.integer('badge')
    .unsigned()
    .notNullable()
    .defaultTo(0)
})

/**
 * @param {Knex} knex
 */
exports.down = (knex) => knex.schema.dropTableIfExists('gym_badges')
