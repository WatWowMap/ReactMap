/* eslint-disable no-console */
const express = require('express')
const { default: center } = require('@turf/center')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const apiRouter = require('./api/apiIndex')
const config = require('../services/config')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
const masterfile = require('../data/masterfile.json')
const {
  Pokemon, Gym, Pokestop, Nest, PokemonFilter, GenericFilter, User,
} = require('../models/index')

const rootRouter = new express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

rootRouter.use('/api', apiRouter)

rootRouter.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

rootRouter.get('/area/:area/:zoom?', (req, res) => {
  const { area, zoom } = req.params
  try {
    const { scanAreas, manualAreas } = config
    if (scanAreas.features.length) {
      const foundArea = scanAreas.features.find(a => a.properties.name.toLowerCase() === area.toLowerCase())
      if (foundArea) {
        const [lon, lat] = center(foundArea).geometry.coordinates
        return res.redirect(`/@/${lat}/${lon}/${zoom || 18}`)
      }
      if (manualAreas.length) {
        const { lat, lon } = manualAreas.find(a => a.name.toLowerCase() === area.toLowerCase())
        return res.redirect(`/@/${lat}/${lon}/${zoom || 18}`)
      }
      return res.redirect('/404')
    }
  } catch (e) {
    console.error(`Error navigating to ${area}`, e.message)
    res.redirect('/404')
  }
})

rootRouter.get('/settings', async (req, res) => {
  try {
    if (config.authentication.alwaysEnabledPerms.length || !config.authMethods.length) {
      if (req.session.tutorial === undefined) {
        req.session.tutorial = !config.map.forceTutorial
      }
      req.session.perms = { areaRestrictions: [], webhooks: [] }

      config.authentication.alwaysEnabledPerms.forEach(perm => {
        if (config.authentication.perms[perm]) {
          req.session.perms[perm] = true
        } else {
          console.warn('Invalid Perm in "alwaysEnabledPerms" array:', perm)
        }
      })
      req.session.save()
    }

    const getUser = async () => {
      if (config.authMethods.length && req.user) {
        try {
          const user = await User.query().findById(req.user.id)
          if (user) {
            delete user.password
            return { ...req.user, ...user, valid: true, username: user.username || req.user.username }
          }
          console.log('[Session Init] Legacy user detected, forcing logout, User ID:', req?.user?.id)
          req.logout()
          return { valid: false, tutorial: !config.map.forceTutorial }
        } catch (e) {
          console.log('[Session Init] Issue finding user, forcing logout, User ID:', req?.user?.id)
          req.logout()
          return { valid: false, tutorial: !config.map.forceTutorial }
        }
      } else if (req.session.perms) {
        return { ...req.session, valid: true }
      }
      return { valid: false, tutorial: !config.map.forceTutorial }
    }
    const serverSettings = {
      user: await getUser(),
      settings: {},
      authMethods: config.authMethods,
      config: {
        map: {
          ...config.map,
          ...config.multiDomainsObj[req.headers.host],
          excludeList: config.authentication.excludeFromTutorial,
        },
        localeSelection: Object.fromEntries(config.map.localeSelection.map(l => [l, { name: l }])),
        tileServers: Object.fromEntries(config.tileServers.map(s => [s.name, s])),
        navigation: Object.fromEntries(config.navigation.map(n => [n.name, n])),
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
        gymValidDataLimit: config.api.gymValidDataLimit,
      },
      available: {},
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user.valid) {
      serverSettings.loggedIn = req.user

      // keys that are being sent to the frontend but are not options
      const ignoreKeys = ['map', 'manualAreas', 'limit', 'icons', 'gymValidDataLimit']

      Object.keys(serverSettings.config).forEach(setting => {
        try {
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
        } catch (e) {
          console.warn(`Error setting ${setting}, most likely means there are no options set in the config`, e.message)
        }
      })

      serverSettings.defaultFilters = Utility.buildDefaultFilters(serverSettings.user.perms)

      try {
        if (serverSettings.user.perms.pokemon) {
          serverSettings.available.pokemon = config.api.queryAvailable.pokemon
            ? await Pokemon.getAvailablePokemon(Utility.dbSelection('pokemon').type === 'mad')
            : []
        }
      } catch (e) {
        console.error('Unable to query Pokemon', e.message)
      }
      try {
        if (serverSettings.user.perms.raids || serverSettings.user.perms.gyms) {
          serverSettings.available.gyms = config.api.queryAvailable.raids
            ? await Gym.getAvailableRaidBosses(Utility.dbSelection('gym').type === 'mad')
            : await Fetch.raids()
        }
      } catch (e) {
        console.error('Unable to query Raids', e.message)
      }
      try {
        if (serverSettings.user.perms.quests
          || serverSettings.user.perms.pokestops
          || serverSettings.user.perms.invasions
          || serverSettings.user.perms.lures) {
          serverSettings.available.pokestops = config.api.queryAvailable.quests
            ? await Pokestop.getAvailableQuests(Utility.dbSelection('pokestop').type === 'mad')
            : await Fetch.quests()
        }
      } catch (e) {
        console.error('Unable to query Pokestops', e.message)
      }
      try {
        if (serverSettings.user.perms.nests) {
          serverSettings.available.nests = config.api.queryAvailable.nests
            ? await Nest.getAvailableNestingSpecies()
            : await Fetch.nests()
        }
      } catch (e) {
        console.error('Unable to query Nests', e.message)
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

      serverSettings.menus = Utility.buildAdvMenus(serverSettings.available)

      const { clientValues, clientMenus } = Utility.buildClientOptions(serverSettings.user.perms)

      serverSettings.userSettings = clientValues
      serverSettings.clientMenus = clientMenus

      serverSettings.masterfile = masterfile

      if (config.webhooks.length && serverSettings.user?.perms?.webhooks?.length) {
        serverSettings.webhooks = {}
        const filtered = config.webhooks.filter(webhook => serverSettings.user.perms.webhooks.includes(webhook.name))
        try {
          await Promise.all(filtered.map(async webhook => {
            if (webhook.enabled && config.webhookObj?.[webhook.name]?.client?.valid) {
              const { strategy, webhookStrategy, discordId, telegramId } = serverSettings.user
              const webhookId = (() => {
                switch (strategy) {
                  case 'discord': return discordId
                  case 'telegram': return telegramId
                  default: return webhookStrategy === 'discord' ? discordId : telegramId
                }
              })()

              const remoteData = await Fetch.webhookApi('allProfiles', webhookId, 'GET', webhook.name)
              const { areas } = await Fetch.webhookApi('humans', webhookId, 'GET', webhook.name)

              if (remoteData && areas) {
                serverSettings.webhooks[webhook.name] = remoteData.human.admin_disable
                  ? config.webhookObj[webhook.name].client
                  : {
                    ...config.webhookObj[webhook.name].client,
                    ...remoteData,
                    hasNominatim: Boolean(config.webhookObj[webhook.name].server.nominatimUrl),
                    locale: remoteData.human.language || config.webhookObj[webhook.name].client.locale,
                    available: areas
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(area => area.userSelectable !== false)
                      .map(area => area.name),
                    templates: config.webhookObj[webhook.name].client.templates[webhookStrategy || strategy],
                  }
              }
            }
          }))
        } catch (e) {
          serverSettings.webhooks = null
          console.warn(e.message, 'Unable to fetch webhook data, this is unlikely an issue with ReactMap, check to make sure the user is registered in the webhook database. User ID:', serverSettings.user.id)
        }
      }
    }
    res.status(200).json({ serverSettings })
  } catch (error) {
    res.status(500).json({ error: error.message, status: 500 })
  }
})

module.exports = rootRouter
