const {
  database: {
    settings: { userTableName, backupTableName },
  },
} = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.createTable(backupTableName, (table) => {
    table.bigIncrements('id').primary()
    table
      .bigInteger('userId')
      .references(`${userTableName}.id`)
      .unsigned()
      .notNullable()
      .index()
    table.string('name').notNullable()
    table.json('data')
    table.bigInteger('createdAt').unsigned().notNullable().defaultTo(0)
    table.bigInteger('updatedAt').unsigned().notNullable().defaultTo(0)
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = (knex) => knex.schema.dropTableIfExists(backupTableName)
