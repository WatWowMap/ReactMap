const { mock } = require('node:test')

const { EventManager } = require('../src/services/EventManager')

// State consumers under test need event data and a model registry, but the
// production singleton also starts the database lifecycle during import.
// Mock that boundary before loading them so the suite stays database-free.
const state = {
  db: { models: {} },
  event: new EventManager(),
}

mock.module(require.resolve('../src/services/state'), {
  cache: true,
  namedExports: { state },
})

module.exports = { state }
