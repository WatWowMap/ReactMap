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
const {
  Pokemon, Gym, Pokestop, Nest,
} = require('../models/index')

const rootRouter = new express.Router()

rootRouter.use('/', clientRouter)

if (config.discord.enabled) {
  rootRouter.use('/auth', authRouter)

  // eslint-disable-next-line no-unused-vars
  rootRouter.use((err, req, res, next) => {
    switch (err.message) {
      case 'NoCodeProvided':
        return res.status(400).send({
          status: 'ERROR',
          error: err.message,
        })
      case 'Failed to fetch user\'s guilds':
        return res.redirect('/login')
      default:
        return res.status(500).send({
          status: 'ERROR',
          error: err.message,
        })
    }
  })
}

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

    // add user options here from the config that are structured as objects
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
        manualAreas: config.manualAreas || {},
      }
      await Utility.updateAvailableForms(serverSettings.config.icons)

      // add config options to this array that are structured as arrays
      const arrayUserOptions = [
        { name: 'localeSelection', values: config.localeSelection },
      ]

      arrayUserOptions.forEach(userMenu => {
        serverSettings.config[userMenu.name] = {}
        userMenu.values.forEach(value => serverSettings.config[userMenu.name][value] = {})
      })

      const ignoreList = ['map', 'manualAreas']
      Object.keys(serverSettings.config).forEach(setting => {
        if (!ignoreList.includes(setting)) {
          const category = serverSettings.config[setting]
          Object.keys(category).forEach(option => {
            category[option].name = option
          })
          serverSettings.settings[setting] = category[Object.keys(category)[0]].name
        }
      })

      serverSettings.defaultFilters = Utility.buildDefaultFilters(serverSettings.user.perms)

      const {
        pokemon, quests, raids, nests,
      } = config.api.queryAvailable
      serverSettings.available = {
        pokemon: pokemon ? await Pokemon.getAvailablePokemon() : [],
        gyms: raids ? await Gym.getAvailableRaidBosses() : await Utility.fetchRaids(),
        pokestops: quests ? await Pokestop.getAvailableQuests() : await Utility.fetchQuests(),
        nests: nests ? await Nest.getAvailableNestingSpecies() : await Utility.fetchNests(),
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
