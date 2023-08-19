/* eslint-disable no-unused-vars */
const {
  database: {
    settings: { userTableName: tableName },
  },
} = require('@rm/config')

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.json('data')
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(tableName, (table) => {
    table.dropColumn('data')
  })
