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
  Pokemon, Gym, Pokestop, Nest, PokemonFilter, GenericFilter,
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
      req.session.perms = { areaRestrictions: [] }
      Object.keys(config.discord.perms).forEach(perm => req.session.perms[perm] = config.discord.perms[perm].enabled)
      req.session.save()
    } else if (config.alwaysEnabledPerms.length > 0) {
      req.session.perms = { areaRestrictions: [] }
      config.alwaysEnabledPerms.forEach(perm => req.session.perms[perm] = config.discord.perms[perm].enabled)
      req.session.save()
    }

    const getUser = () => {
      if (config.discord.enabled) {
        if (req.user || config.alwaysEnabledPerms.length === 0) {
          return req.user
        }
      }
      return req.session
    }
    const serverSettings = {
      user: getUser(),
      discord: config.discord.enabled,
      settings: {},
      googleAnalytics: config.googleAnalytics.enabled ? config.googleAnalytics.trackingId : null,
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user && serverSettings.user.perms) {
      serverSettings.loggedIn = req.user
      serverSettings.config = {
        map: { ...config.map, excludeList: config.excludeFromTutorial },
        tileServers: config.tileServers,
        navigation: config.navigation,
        drawer: {
          temporary: {},
          persistent: {},
        },
        manualAreas: config.manualAreas || {},
        icons: config.icons,
      }

      // add config options to this array that are structured as arrays
      const arrayUserOptions = [
        { name: 'localeSelection', values: config.localeSelection },
      ]

      arrayUserOptions.forEach(userMenu => {
        serverSettings.config[userMenu.name] = {}
        userMenu.values.forEach(value => serverSettings.config[userMenu.name][value] = {})
      })

      // keys that are being sent to the frontend but are not options
      const ignoreKeys = ['map', 'manualAreas', 'limit', 'icons']
      Object.keys(serverSettings.config).forEach(setting => {
        if (!ignoreKeys.includes(setting)) {
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
      try {
        serverSettings.available = {
          pokemon: pokemon
            ? await Pokemon.getAvailablePokemon(Utility.dbSelection('pokemon') === 'mad')
            : [],
          gyms: raids
            ? await Gym.getAvailableRaidBosses(Utility.dbSelection('gym') === 'mad')
            : await Utility.fetchRaids(),
          pokestops: quests
            ? await Pokestop.getAvailableQuests(Utility.dbSelection('pokestop') === 'mad')
            : await Utility.fetchQuests(),
          nests: nests
            ? await Nest.getAvailableNestingSpecies()
            : await Utility.fetchNests(),
        }
      } catch (e) {
        console.warn(e, '\nUnable to query available.')
      }

      // Backup in case there are Pokemon/Quests/Raids etc that are not in the masterfile
      // Primary for quest rewards that are form unset, despite normally have a set form
      try {
        Object.keys(serverSettings.available).forEach(category => {
          serverSettings.available[category].forEach(item => {
            if (!serverSettings.defaultFilters[category].filter[item] && !item.startsWith('132')) {
              serverSettings.defaultFilters[category].filter[item] = category === 'pokemon'
                ? new PokemonFilter()
                : new GenericFilter()
              if (typeof parseInt(item.charAt(0)) === 'number') {
                const masterfileRef = masterfile.pokemon[item.split('-')[0]]
                if (masterfileRef) {
                  if (!masterfileRef.forms) {
                    masterfileRef.forms = {}
                  }
                  masterfileRef.forms[item.split('-')[1]] = { name: '*' }
                } else {
                  console.warn('Missing and unable to add', category, item)
                }
              }
            }
          })
        })
      } catch (e) {
        console.warn(e, '\nUnable to add missing items to the filters')
      }

      serverSettings.ui = Utility.buildPrimaryUi(serverSettings.defaultFilters, serverSettings.user.perms)

      serverSettings.menus = Utility.buildAdvMenus()

      const { clientValues, clientMenus } = Utility.buildClientOptions(serverSettings.user.perms)

      serverSettings.userSettings = clientValues
      serverSettings.clientMenus = clientMenus

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
