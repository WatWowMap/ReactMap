// @ts-check
const path = require('path')
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

/**
 *
 * @returns {import('knex').Knex.Config}
 */
const getConfig = () => {
  const database = config.getSafe('database')
  const migrationUrl = path.resolve(__dirname, 'migrations')
  const selectedDb = database.schemas.find((db) => db.useFor.includes('user'))

  if (!selectedDb || 'endpoint' in selectedDb) {
    log.error(
      HELPERS.db,
      'No database selected for React Map Tables, one schema must contain "user" in its useFor array',
    )
    process.exit(9)
  }

  return {
    client: 'mysql2',
    connection: {
      host: selectedDb.host,
      port: selectedDb.port,
      user: selectedDb.username,
      password: selectedDb.password,
      database: selectedDb.database,
    },
    migrations: {
      tableName: database.settings.migrationTableName,
      directory: migrationUrl,
      extension: 'cjs',
      stub: path.join(migrationUrl, 'migration.stub.cjs'),
    },
  }
}

if (require.main?.path?.includes('knex')) {
  module.exports.default = getConfig()
} else {
  module.exports.knexConfig = getConfig()
}
