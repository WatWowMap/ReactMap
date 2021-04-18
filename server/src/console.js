const repl = require('repl')
const knexConnection = require('./db/initialization')
const models = require('./models/index.js')

const replServer = repl.start({
  prompt: '> ',
})

replServer.context.models = models
replServer.on('close', () => {
  knexConnection.destroy()
})
