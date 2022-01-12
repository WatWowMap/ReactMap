/* eslint-disable no-console */
const path = require('path')
const { database: { schemas, settings: { migrationTableName } } } = require('./src/services/config')

const migrationUrl = 'src/db/migrations'

const selectedDb = schemas.find(db => db.useFor.includes('user'))

if (!selectedDb) {
  console.warn('No database selected for React Map Tables')
  process.exit(9)
}

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

module.exports = connection
