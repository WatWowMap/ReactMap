const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const cors = require('cors')
const { NoSchemaIntrospectionCustomRule } = require('graphql')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const schema = require('../schema/schema')
const config = require('../services/config')
const Utility = require('../services/Utility')
const masterfile = require('../data/masterfile.json')
const { Pokemon, Gym, Pokestop } = require('../models/index')

const rootRouter = new express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

rootRouter.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

rootRouter.get('/settings', async (req, res) => {
  try {
    if (!config.discord.enabled) {
      req.session.perms = {}
      Object.keys(config.discord.perms).forEach(perm => req.session.perms[perm] = config.discord.perms[perm].enabled)
      req.session.save()
    }
    const serverSettings = {
      user: config.discord.enabled ? req.user : req.session,
      discord: config.discord.enabled,
      settings: {},
    }

    if (serverSettings.user) {
      serverSettings.config = {
        map: config.map,
        tileServers: config.tileServers,
        icons: config.icons,
        navigation: config.navigation,
        drawer: {
          temporary: {},
          persistent: {},
        },
      }
      await Utility.updateAvailableForms(serverSettings.config.icons)

      Object.keys(serverSettings.config).forEach(setting => {
        if (setting !== 'map') {
          const category = serverSettings.config[setting]
          Object.keys(category).forEach(option => {
            category[option].name = option
          })
          serverSettings.settings[setting] = category[Object.keys(category)[0]]
        }
      })

      serverSettings.defaultFilters = await Utility.buildDefaultFilters(serverSettings.user.perms)

      serverSettings.available = {
        pokemon: await Pokemon.getAvailablePokemon(),
        gyms: await Gym.getAvailableRaidBosses(),
        pokestops: await Pokestop.getAvailableQuests(),
      }
      serverSettings.ui = Utility.generateUi(serverSettings.defaultFilters, serverSettings.user.perms)

      serverSettings.menus = Utility.buildMenus()

      serverSettings.masterfile = masterfile
    }
    res.status(200).json({ serverSettings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql,
  validationRules: config.devOptions.graphiql ? undefined : [NoSchemaIntrospectionCustomRule],
}))

module.exports = rootRouter
