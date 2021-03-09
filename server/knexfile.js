import knex from 'knex'
import objection from 'objection'
import config from './src/services/config.js' 

const connection = {
  client: "mysql",
  connection: {
    host: config.db.scanner.host,
    user: config.db.scanner.username,
    password: config.db.scanner.password,
    database: config.db.scanner.database
  }
}
const knexConnection = knex(connection)

objection.Model.knex(knexConnection)

export default knexConnection