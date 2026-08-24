/*
 * 2.0 does not support renaming this table. That option was announced as
 * unsupported well ahead of this release, so the name is fixed here rather
 * than read from config the way the pre-2.0 migrations do. An install still
 * relying on a renamed table fails loudly at migrate time, which is the
 * intended outcome rather than a silent partial upgrade.
 */
const USER_TABLE = 'users'

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) =>
  knex.schema.table(USER_TABLE, (table) => {
    table.boolean('useAppShell').notNullable().defaultTo(false)
  })

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) =>
  knex.schema.table(USER_TABLE, (table) => {
    table.dropColumn('useAppShell')
  })
