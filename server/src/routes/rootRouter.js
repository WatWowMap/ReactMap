/* eslint-disable no-console */
const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const cors = require('cors')
const { NoSchemaIntrospectionCustomRule } = require('graphql')
const fs = require('fs')
const { default: center } = require('@turf/center')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const schema = require('../schema/schema')
const config = require('../services/config')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
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

rootRouter.get('/area/:area/:zoom?', (req, res) => {
  const { area, zoom } = req.params
  try {
    const scanAreas = fs.existsSync('server/src/configs/areas.json')
      // eslint-disable-next-line global-require
      ? require('../configs/areas.json')
      : { features: [] }
    if (scanAreas.features.length) {
      const foundArea = scanAreas.features.find(a => a.properties.name.toLowerCase() === area.toLowerCase())
      if (foundArea) {
        const [lon, lat] = center(foundArea).geometry.coordinates
        res.redirect(`/@/${lat}/${lon}/${zoom || 15}`)
      } else {
        res.send(`${area} is not an available area`)
      }
    }
  } catch (e) {
    res.send(`Error navigating to ${area}`, e)
  }
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
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user && serverSettings.user.perms) {
      serverSettings.loggedIn = req.user
      serverSettings.config = {
        map: {
          ...config.map,
          ...config.multiDomains[req.headers.host],
          excludeList: config.excludeFromTutorial,
        },
        tileServers: config.tileServers,
        navigation: config.navigation,
        drawer: {
          temporary: {},
          persistent: {},
        },
        navigationControls: {
          react: {},
          leaflet: {},
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
          if (config.map[setting] && typeof config.map[setting] !== 'object') {
            serverSettings.settings[setting] = config.map[setting]
          } else {
            serverSettings.settings[setting] = category[Object.keys(category)[0]].name
          }
        }
      })

      serverSettings.defaultFilters = Utility.buildDefaultFilters(serverSettings.user.perms)

      try {
        serverSettings.available = {}
        if (serverSettings.user.perms.pokemon) {
          serverSettings.available.pokemon = config.api.queryAvailable.pokemon
            ? await Pokemon.getAvailablePokemon(Utility.dbSelection('pokemon') === 'mad')
            : []
        }
        if (serverSettings.user.perms.raids || serverSettings.user.perms.gyms) {
          serverSettings.available.gyms = config.api.queryAvailable.raids
            ? await Gym.getAvailableRaidBosses(Utility.dbSelection('gym') === 'mad')
            : await Fetch.fetchRaids()
        }
        if (serverSettings.user.perms.quests
          || serverSettings.user.perms.pokestops
          || serverSettings.user.perms.invasions
          || serverSettings.user.perms.lures) {
          serverSettings.available.pokestops = config.api.queryAvailable.quests
            ? await Pokestop.getAvailableQuests(Utility.dbSelection('pokestop') === 'mad')
            : await Fetch.fetchQuests()
        }
        if (serverSettings.user.perms.nests) {
          serverSettings.available.nests = config.api.queryAvailable.nests
            ? await Nest.getAvailableNestingSpecies()
            : await Fetch.fetchNests()
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
              if (!Number.isNaN(parseInt(item.charAt(0)))) {
                const masterfileRef = masterfile.pokemon[item.split('-')[0]]
                if (masterfileRef) {
                  if (!masterfileRef.forms) {
                    masterfileRef.forms = {}
                  }
                  masterfileRef.forms[item.split('-')[1]] = { name: '*', category }
                  console.log(`Added ${masterfileRef.name} Key: ${item} to masterfile. (${category})`)
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

      if (config.webhooks.length && serverSettings.user?.perms?.webhooks?.length) {
        serverSettings.webhooks = {}
        const filtered = config.webhooks.filter(webhook => serverSettings.user.perms.webhooks.includes(webhook.name))
        try {
          await Promise.all(filtered.map(async webhook => {
            if (config.webhookObj[webhook.name].client.valid) {
              const remoteData = await Fetch.webhookApi('allProfiles', serverSettings.user.id, 'GET', webhook.name)
              serverSettings.webhooks[webhook.name] = remoteData.human.admin_disable
                ? config.webhookObj[webhook.name].client
                : {
                  ...config.webhookObj[webhook.name].client,
                  ...await Fetch.webhookApi('allProfiles', serverSettings.user.id, 'GET', webhook.name),
                }
            }
          }))
        } catch (e) {
          serverSettings.webhooks = null
          console.warn(e, 'Unable to fetch webhook data')
        }
      }
      if (config.devOptions.enabled) {
        console.log(serverSettings.webhooks)
      }
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
  customFormatErrorFn: (error) => {
    console.error('GraphQL Error:', error.message)
  },
}))

module.exports = rootRouter
