const knex = require('knex')
const objection = require('objection')
const config = require('./src/services/config.js')

const connection = {
  client: 'mysql',
  connection: {
    host: config.db.scanner.host,
    user: config.db.scanner.username,
    password: config.db.scanner.password,
    database: config.db.scanner.database,
  },
}
const knexConnection = knex(connection)

objection.Model.knex(knexConnection)

module.exports = knexConnection
