const path = require('path')
const { database: { schemas, settings: { migrationTableName } } } = require('./src/services/config')

const migrationUrl = 'src/db/migrations'

const selectedDb = Object.keys(schemas).find(dbName => schemas[dbName].useFor.includes('user')) || Object.keys(schemas)[0]

const connection = {
  client: 'mysql2',
  connection: {
    host: schemas[selectedDb].host,
    port: schemas[selectedDb].port,
    user: schemas[selectedDb].username,
    password: schemas[selectedDb].password,
    database: schemas[selectedDb].database,
  },
  migrations: {
    tableName: migrationTableName,
    directory: migrationUrl,
    extensions: 'cjs',
    stub: path.join(migrationUrl, 'migration.stub.cjs'),
  },
}

module.exports = connection
