/* eslint-disable no-unused-vars */
const config = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema
    .dropTable(config.getSafe('database.settings.userTableName'))
    .createTable(config.getSafe('database.settings.userTableName'), (table) => {
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
  knex.schema
    .dropTable(config.getSafe('database.settings.userTableName'))
    .createTable(config.getSafe('database.settings.userTableName'), (table) => {
      table.string('id')
    })
