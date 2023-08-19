/* eslint-disable no-unused-vars */
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
/**
 * @typedef {import("knex").Knex} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) =>
  knex.schema
    .hasTable(config.getSafe('database.settings.userTableName'))
    .then((exists) => {
      if (!exists) {
        return knex.schema.createTable(
          config.getSafe('database.settings.userTableName'),
          (table) => {
            table.string('id')
          },
        )
      }
      log.warn(
        HELPERS.db,
        `${config.getSafe(
          'database.settings.userTableName',
        )} already exists in your db, you may need to choose a new name in the config file.`,
      )
    })

/**
 * @param {Knex} knex
 */
exports.down = (knex) =>
  knex.schema.dropTableIfExists(
    config.getSafe('database.settings.userTableName'),
  )
