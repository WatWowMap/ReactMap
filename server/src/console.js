import repl from "repl"
import knexConnection from '../knexfile.js'

import * as models from "./models/index.js"

const replServer = repl.start({
  prompt: "> ",
})

replServer.context.models = models
replServer.on("close", () => {
  knexConnection.destroy()
})
