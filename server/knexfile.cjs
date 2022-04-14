/* eslint-disable no-console */
const path = require('path')
const knex = require('knex')

const { database: { schemas, settings: { migrationTableName } } } = require('./src/services/config')

const migrationUrl = 'src/db/migrations'

const selectedDb = schemas.find(db => db.useFor.includes('user'))

if (!selectedDb) {
  console.warn('[DB] No database selected for React Map Tables, one schema must contain "user" in its useFor array')
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
      directory: path.join(basePath, migrationUrl),
      extensions: 'cjs',
      stub: path.join(basePath, migrationUrl, 'migration.stub.cjs'),
    },
  }
  return basePath ? knex(connection) : connection
}

if (require.main?.path?.includes('knex')) {
  module.exports = getConnection()
} else {
  module.exports.connection = getConnection('server')
}
