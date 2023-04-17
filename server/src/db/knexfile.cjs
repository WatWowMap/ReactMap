const path = require('path')
const knex = require('knex')
const { log, HELPERS } = require('../services/logger')

const {
  database: {
    schemas,
    settings: { migrationTableName },
  },
} = require('../services/config')

const migrationUrl = path.resolve(__dirname, 'migrations')

const selectedDb = schemas.find((db) => db.useFor.includes('user'))

if (!selectedDb) {
  log.error(
    HELPERS.db,
    'No database selected for React Map Tables, one schema must contain "user" in its useFor array',
  )
  process.exit(9)
}

const getConnection = (basePath = '') => {
  const connection = {
    client: 'mysql2',
    connection: {
      host: selectedDb.host,
      port: selectedDb.port,
      user: selectedDb.username,
      password: selectedDb.password,
      database: selectedDb.database,
    },
    migrations: {
      tableName: migrationTableName,
      directory: migrationUrl,
      extensions: 'cjs',
      stub: path.join(migrationUrl, 'migration.stub.cjs'),
    },
  }
  return basePath ? knex(connection) : connection
}

if (require.main?.path?.includes('knex')) {
  module.exports = getConnection()
} else {
  module.exports.connection = getConnection('server')
}
