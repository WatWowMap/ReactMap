/* eslint-disable no-unused-vars */
const {
  database: {
    settings: { userTableName },
  },
} = require('../../services/config')
const { log, HELPERS } = require('../../services/logger')
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.hasTable(userTableName).then((exists) => {
    if (!exists) {
      return knex.schema.createTable(userTableName, (table) => {
        table.string('id')
      })
    }
    log.warn(
      HELPERS.db,
      `${userTableName} already exists in your db, you may need to choose a new name in the config file.`,
    )
  })

/**
 * @param {Knex} knex
 */
exports.down = (knex) => knex.schema.dropTableIfExists(userTableName)
