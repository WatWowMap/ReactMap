const Knex = require('knex')
const { database: { schemas } } = require('../services/config')
const models = require('../models/index')

// Establishes knex connections to each database listed in the config
const connections = Object.keys(schemas).map(name => Knex({
  client: 'mysql',
  connection: {
    host: schemas[name].host,
    port: schemas[name].port,
    user: schemas[name].username,
    password: schemas[name].password,
    database: schemas[name].database,
  },
  pool: {
    afterCreate(conn, done) {
      conn.query('SET time_zone="+00:00";', (err) => done(err, conn))
      console.log('Timezone Set')
    },
  },
}))

// Binds the models to the designated databases
Object.keys(schemas).forEach((name, index) => {
  schemas[name].useFor.forEach(category => {
    const capital = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
    models[capital].knex(connections[index])
  })
})
