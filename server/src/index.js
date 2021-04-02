const express = require('express')
const path = require('path')
const logger = require('morgan')
const compression = require('compression')
require('../knexfile.js')
const rootRouter = require('./routes/rootRouter.js')
const config = require('./services/config.js')

const app = express()

app.use(logger('dev'))

app.use(compression())

app.use(express.json({ limit: '50mb' }))

app.use(express.static(path.join(__dirname, '../../dist')))

app.use(rootRouter)

app.listen(config.port, config.interface, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is now listening at http://${config.interface}:${config.port}`)
})

module.exports = app
