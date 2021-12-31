/* eslint-disable no-console */
const Knex = require('knex')
const { database: { schemas: { scanner, manual } } } = require('../configs/config.example.json')
const { database: { schemas, settings }, devOptions: { queryDebug } } = require('../services/config')
const models = require('../models/index')

// Establishes knex connections to each database listed in the config
const connections = Object.values(schemas).map(schema => Knex({
  client: 'mysql2',
  connection: {
    host: schema.host,
    port: schema.port,
    user: schema.username,
    password: schema.password,
    database: schema.database,
  },
  debug: queryDebug,
  pool: {
    max: settings.maxConnections,
    afterCreate(conn, done) {
      conn.query('SET time_zone="+00:00";', (err) => done(err, conn))
    },
  },
}))

// Binds the models to the designated databases
Object.values(schemas).forEach((schema, index) => {
  try {
    schema.useFor.forEach(category => {
      const capital = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
      models[capital].knex(connections[index])
    })
  } catch (e) {
    console.error(`
    Only ${[...scanner.useFor, ...manual.useFor].join(', ')} are valid options in the useFor fields`, '\n\n', e)
    process.exit(9)
  }
})
