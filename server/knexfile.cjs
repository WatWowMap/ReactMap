const path = require('path')
const { database: { schemas } } = require('./src/services/config')

const migrationUrl = 'src/db/migrations'

const selectedDb = Object.keys(schemas).find(dbName => schemas[dbName].useFor.includes('user')) || 'scanner'

const connection = {
  client: 'mysql',
  connection: {
    host: schemas[selectedDb].host,
    user: schemas[selectedDb].username,
    password: schemas[selectedDb].password,
    database: schemas[selectedDb].database,
  },
  migrations: {
    directory: migrationUrl,
    extensions: 'cjs',
    stub: path.join(migrationUrl, 'migration.stub.cjs'),
  },
}

module.exports = connection
