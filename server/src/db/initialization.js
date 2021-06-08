const Knex = require('knex')
const { database: { schemas } } = require('../services/config')
const models = require('../models/index')

// Establishes knex connections to each database listed in the config
const connections = Object.values(schemas).map(schema => Knex({
  client: 'mysql',
  connection: {
    host: schema.host,
    port: schema.port,
    user: schema.username,
    password: schema.password,
    database: schema.database,
  },
  pool: {
    afterCreate(conn, done) {
      conn.query('SET time_zone="+00:00";', (err) => done(err, conn))
      console.log('Timezone Set')
    },
  },
}))

// Binds the models to the designated databases
Object.values(schemas).forEach((schema, index) => {
  schema.useFor.forEach(category => {
    const capital = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
    models[capital].knex(connections[index])
  })
})
