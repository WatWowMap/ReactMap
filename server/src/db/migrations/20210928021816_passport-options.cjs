/* eslint-disable no-unused-vars */
const config = require('@rm/config')

const tableName = config.getSafe('database.settings.userTableName')
/**
 * @param {import("knex").Knex} knex
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
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.dropTable(tableName).createTable(tableName, (table) => {
    table.string('id')
  })
