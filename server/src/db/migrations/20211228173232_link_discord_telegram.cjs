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
  knex.schema.table(tableName, (table) => {
    table.json('discordPerms')
    table.json('telegramPerms')
    table.string('webhookStrategy')
  })

/**
 * @param {Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.dropColumn('discordPerms')
    table.dropColumn('telegramPerms')
    table.dropColumn('webhookStrategy')
  })
