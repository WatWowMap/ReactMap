/* eslint-disable no-console */
const express = require('express')
const { default: center } = require('@turf/center')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const apiRouter = require('./api/apiIndex')
const config = require('../services/config')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
const { User } = require('../models/index')
const { Event, Db } = require('../services/initialization')

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
    const validScanAreas = scanAreas[req.headers.host]
      ? scanAreas[req.headers.host]
      : scanAreas.main
    if (validScanAreas.features.length) {
      const foundArea = validScanAreas.features.find(a => a.properties.name.toLowerCase() === area.toLowerCase())
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
    console.error(`[ERROR] Error navigating to ${area}`, e.message)
    res.redirect('/404')
  }
})

rootRouter.get('/settings', async (req, res) => {
  try {
    if (!Event.uicons.length) throw new Error('Icons Have Not Been Fetched Yet')

    if (config.authentication.alwaysEnabledPerms.length || !config.authMethods.length) {
      if (req.session.tutorial === undefined) {
        req.session.tutorial = !config.map.forceTutorial
      }
      req.session.perms = {
        areaRestrictions: Utility.areaPerms(['none']),
        webhooks: [],
        scanner: [],
      }
      config.authentication.alwaysEnabledPerms.forEach(perm => {
        if (config.authentication.perms[perm]) {
          req.session.perms[perm] = true
        } else {
          console.warn('[AUTH] Invalid Perm in "alwaysEnabledPerms" array:', perm)
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
          console.log('[SESSION] Legacy user detected, forcing logout, User ID:', req?.user?.id)
          req.logout()
          return { valid: false, tutorial: !config.map.forceTutorial }
        } catch (e) {
          console.log('[SESSION] Issue finding user, forcing logout, User ID:', req?.user?.id)
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
        icons: { ...config.icons, styles: Event.uicons },
        scanner: {
          scannerType: config.scanner.backendConfig.platform,
          enableScanNext: config.scanner.scanNext.enabled,
          scanNextShowScanCount: config.scanner.scanNext.showScanCount,
          scanNextShowScanQueue: config.scanner.scanNext.showScanQueue,
          scanNextAreaRestriction: config.scanner.scanNext.scanNextAreaRestriction,
          enableScanZone: config.scanner.scanZone.enabled,
          scanZoneShowScanCount: config.scanner.scanZone.showScanCount,
          scanZoneShowScanQueue: config.scanner.scanZone.showScanQueue,
          advancedScanZoneOptions: config.scanner.scanZone.advancedScanZoneOptions,
          scanZoneRadius: config.scanner.scanZone.scanZoneRadius,
          scanZoneSpacing: config.scanner.scanZone.scanZoneSpacing,
          scanZoneMaxSize: config.scanner.scanZone.scanZoneMaxSize,
          scanZoneAreaRestriction: config.scanner.scanZone.scanZoneAreaRestriction,
        },
        gymValidDataLimit: Date.now() / 1000 - (config.api.gymValidDataLimit * 86400),
      },
      available: { pokemon: [], pokestops: [], gyms: [], nests: [] },
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user.valid) {
      serverSettings.loggedIn = req.user

      // keys that are being sent to the frontend but are not options
      const ignoreKeys = ['map', 'manualAreas', 'limit', 'icons', 'scanner', 'gymValidDataLimit']

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

      if (serverSettings.user.perms.pokemon) {
        serverSettings.available.pokemon = config.api.queryOnSessionInit.pokemon
          ? await Db.getAvailable('Pokemon')
          : Event.available.pokemon
      }
      if (serverSettings.user.perms.raids || serverSettings.user.perms.gyms) {
        serverSettings.available.gyms = config.api.queryOnSessionInit.raids
          ? await Db.getAvailable('Gym')
          : Event.available.gyms
      }
      if (serverSettings.user.perms.quests
        || serverSettings.user.perms.pokestops
        || serverSettings.user.perms.invasions
        || serverSettings.user.perms.lures) {
        serverSettings.available.pokestops = config.api.queryOnSessionInit.quests
          ? await Db.getAvailable('Pokestop')
          : Event.available.pokestops
      }
      if (serverSettings.user.perms.nests) {
        serverSettings.available.nests = config.api.queryOnSessionInit.nests
          ? await Db.getAvailable('Nest')
          : Event.available.nests
      }

      serverSettings.defaultFilters = Utility.buildDefaultFilters(serverSettings.user.perms, serverSettings.available)

      // Backup in case there are Pokemon/Quests/Raids etc that are not in the masterfile
      // Primary for quest rewards that are form unset, despite normally have a set form

      serverSettings.ui = Utility.buildPrimaryUi(serverSettings.defaultFilters, serverSettings.user.perms)

      serverSettings.menus = Utility.buildAdvMenus(serverSettings.available)

      const { clientValues, clientMenus } = Utility.buildClientOptions(serverSettings.user.perms)

      serverSettings.userSettings = clientValues
      serverSettings.clientMenus = clientMenus

      serverSettings.masterfile = { ...Event.masterfile, invasions: Event.invasions }

      if (config.webhooks.length && serverSettings.user?.perms?.webhooks?.length) {
        serverSettings.webhooks = {}
        const filtered = config.webhooks.filter(webhook => serverSettings.user.perms.webhooks.includes(webhook.name))
        try {
          await Promise.all(filtered.map(async webhook => {
            if (webhook.enabled && Event.webhookObj?.[webhook.name]?.client?.valid) {
              const webhookId = Utility.evalWebhookId(serverSettings.user)
              const { strategy, webhookStrategy } = serverSettings.user

              const remoteData = await Fetch.webhookApi('allProfiles', webhookId, 'GET', webhook.name)
              const { areas } = await Fetch.webhookApi('humans', webhookId, 'GET', webhook.name)

              if (remoteData && areas) {
                serverSettings.webhooks[webhook.name] = remoteData.human.admin_disable
                  ? Event.webhookObj[webhook.name].client
                  : {
                    ...Event.webhookObj[webhook.name].client,
                    ...remoteData,
                    hasNominatim: Boolean(Event.webhookObj[webhook.name].server.nominatimUrl),
                    locale: remoteData.human.language || Event.webhookObj[webhook.name].client.locale,
                    available: areas
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(area => area.userSelectable !== false)
                      .map(area => area.name),
                    templates: Event.webhookObj[webhook.name].client.templates[webhookStrategy || strategy],
                  }
              }
            }
          }))
        } catch (e) {
          serverSettings.webhooks = null
          console.warn('[AUTH]', e.message, 'Unable to fetch webhook data, this is unlikely an issue with ReactMap, check to make sure the user is registered in the webhook database. User ID:', serverSettings.user.id)
        }
      }
    }
    res.status(200).json({ serverSettings })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message, status: 500 })
  }
})

module.exports = rootRouter
