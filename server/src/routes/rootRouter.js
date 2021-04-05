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

    await Utility.updateAvailableForms(settings.config.icons)
    settings.filters = await Utility.buildDefaultFilters()
    settings.masterfile = masterfile

    res.status(200).json({ settings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

module.exports = rootRouter
