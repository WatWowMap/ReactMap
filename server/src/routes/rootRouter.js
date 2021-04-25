const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const cors = require('cors')
const authRouter = require('./auth')
const clientRouter = require('./clientRouter')
const schema = require('../schema/schema')
const config = require('../services/config')
const Utility = require('../services/Utility')
const masterfile = require('../data/masterfile.json')

const rootRouter = new express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

rootRouter.get('/settings', async (req, res) => {
  let { user } = req
  if (!config.discord.enabled) {
    user = { perms: {} }
    Object.keys(config.discord.perms).forEach(perm => user.perms[perm] = config.discord.perms[perm].enabled)
  }
  ['tileServers', 'icons'].forEach(setting => {
    Object.keys(config[setting]).forEach(option => {
      config[setting][option].name = option
    })
  })

  if (user) {
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
        defaultFilters: await Utility.buildDefaultFilters(user.perms),
        user,
        menus: Utility.buildMenus(),
      }
      serverSettings.ui = Utility.generateUi(serverSettings.defaultFilters, user.perms)
      await Utility.updateAvailableForms(serverSettings.config.icons)

      res.status(200).json({ serverSettings })
    } catch (error) {
      res.status(500).json({ error })
    }
  }
})

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql,
}))

module.exports = rootRouter
