/* eslint-disable no-unused-vars */
const { database } = require('../../services/config')

const tableName = database.settings.userTableName
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => (
  knex.schema.hasTable(tableName).then((exists) => {
    if (!exists) {
      return knex.schema.createTable(tableName, table => {
        table.string('id')
      })
    }
    // eslint-disable-next-line no-console
    console.warn(`${tableName} already exists in your db, you may need to choose a new name in the config file.`)
  })

)

/**
  * @param {Knex} knex
  */
exports.down = (knex) => (knex.schema.dropTableIfExists(tableName))
