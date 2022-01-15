const repl = require('repl')
require('../src/db/initialization')
const models = require('../src/models/index')

const replServer = repl.start({
  prompt: '> ',
})

replServer.context.models = models
