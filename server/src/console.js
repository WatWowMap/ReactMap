const repl = require('repl')
require('./db/initialization')
const models = require('./models/index')

const replServer = repl.start({
  prompt: '> ',
})

replServer.context.models = models
