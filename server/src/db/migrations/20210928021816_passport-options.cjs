/* eslint-disable no-unused-vars */
const {
  database: {
    settings: { userTableName: tableName },
  },
} = require('../../services/config')

/**
 * @typedef {import("knex").Knex} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.dropTable(tableName).createTable(tableName, (table) => {
    table.bigIncrements('id')
    table.boolean('tutorial').defaultTo(false)
    table.string('strategy')
    table.string('discordId')
    table.string('telegramId')
  })

/**
 * @param {Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.dropTable(tableName).createTable(tableName, (table) => {
    table.string('id')
  })
