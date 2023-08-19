/* eslint-disable no-unused-vars */
const {
  database: {
    settings: { userTableName: tableName },
  },
} = require('@rm/config')

/**
 * @typedef {import("knex").Knex} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.json('data')
  })

/**
 * @param {Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.dropColumn('data')
  })
