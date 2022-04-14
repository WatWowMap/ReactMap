const repl = require('repl')
const Db = require('../src/services/initialization')
const models = require('../src/models/index')

const replServer = repl.start({
  prompt: '> ',
})

replServer.context.models = models
replServer.context.Db = Db
