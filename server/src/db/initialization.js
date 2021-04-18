const Knex = require('knex')
const { database: { schemas } } = require('../services/config')
const models = require('../models/index')

// Establishes knex connections to each database listed in the config
const connections = Object.keys(schemas).map(name => Knex({
  client: 'mysql',
  connection: {
    host: schemas[name].host,
    user: schemas[name].username,
    password: schemas[name].password,
    database: schemas[name].database,
  },
}))

// Sets default if for some reason it's not set in config
if (schemas.scanner.useFor.length < 1) {
  schemas.scanner.useFor.push('pokestop', 'gym', 'device', 's2cell', 'portal', 'weather', 'spawnpoint', 'pokemon', 'weather', 'user', 'session')
}

// Binds the models to the designated databases
Object.keys(schemas).forEach((name, index) => {
  schemas[name].useFor.forEach(category => {
    const capital = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
    models[capital].knex(connections[index])
  })
})
