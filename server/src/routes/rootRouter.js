/* eslint-disable no-debugger */
const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const cors = require('cors')

const schema = require('../schema/schema')
const config = require('../services/config')
const Utility = require('../services/Utility')
const masterfile = require('../data/masterfile.json')

const rootRouter = new express.Router()

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql,
}))

rootRouter.get('/settings', async (req, res) => {
  try {
    const serverSettings = {
      config: {
        map: config.map,
        tileServers: config.tileServers,
        icons: config.icons,
      },
      settings: {
        iconStyle: config.icons.Default,
        tileServer: config.tileServers.Default,
      },
      masterfile,
      defaultFilters: await Utility.buildDefaultFilters(),
    }

    await Utility.updateAvailableForms(serverSettings.config.icons)

    res.status(200).json({ serverSettings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

module.exports = rootRouter
