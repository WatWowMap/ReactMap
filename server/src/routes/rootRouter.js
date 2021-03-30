const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const cors = require('cors')

const schema = require('../schema/schema.js')
const config = require('../services/config.js')
const updateAvailableForms = require('../services/updateAvailableForms.js')
const buildDefaultFilters = require('../services/defaultFilters/buildDefaultFilters.js')
const masterfile = require('../data/masterfile.json')

const rootRouter = new express.Router()

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql,
}))

rootRouter.get('/settings', async (req, res) => {
  try {
    const settings = {
      config: {},
      quests: {},
    }
    settings.config.env = config.devOptions.enabled
    settings.config.map = config.map
    settings.config.tileServers = config.tileServers
    settings.config.icons = config.icons
    settings.config.popUpDetails = config.popUpDetails
    settings.config.rarity = config.rarity

    await updateAvailableForms(settings.config.icons)
    settings.filters = await buildDefaultFilters()
    settings.masterfile = masterfile

    res.status(200).json({ settings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

module.exports = rootRouter
