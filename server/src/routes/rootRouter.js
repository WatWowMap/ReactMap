const express = require('express')
const fs = require('fs')
const { resolve } = require('path')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const config = require('../services/config')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
const { Event, Db } = require('../services/initialization')
const { version } = require('../../../package.json')
const { log, HELPERS } = require('../services/logger')

const rootRouter = express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

fs.readdir(resolve(__dirname, './api/v1/'), (e, files) => {
  if (e) return log.error(HELPERS.api, 'Error initializing an API endpoint', e)
  files.forEach((file) => {
    try {
      rootRouter.use(
        `/api/v1/${file.replace('.js', '')}`,
        require(resolve(__dirname, './api/v1/', file)),
      )
      log.info(HELPERS.api, `Loaded ${file}`)
    } catch (err) {
      log.warn(HELPERS.api, 'Unable to load API endpoint:', file, '\n', err)
    }
  })
})

rootRouter.get('/api/health', async (req, res) =>
  res.status(200).json({ status: 'ok' }),
)

rootRouter.post('/api/error/client', (req) => {
  if (req.headers.version === version && req.isAuthenticated()) {
    const {
      body: { error },
      user,
    } = req
    const userName =
      user?.username ||
      user?.discordId ||
      user?.telegramId ||
      user?.id ||
      'Unknown'
    if (error) {
      log.warn(HELPERS.client, `User: ${userName}`, error)
    }
  }
})

rootRouter.get('/area/:area/:zoom?', (req, res) => {
  const { area, zoom } = req.params
  try {
    const { scanAreas } = config.areas
    const validScanAreas = scanAreas[req.headers.host]
      ? scanAreas[req.headers.host]
      : scanAreas.main
    if (validScanAreas.features.length) {
      const foundArea = validScanAreas.features.find(
        (a) => a.properties.name.toLowerCase() === area.toLowerCase(),
      )
      if (foundArea) {
        const [lat, lon] = foundArea.properties.center
        return res.redirect(`/@/${lat}/${lon}/${zoom || 18}`)
      }
      return res.redirect('/404')
    }
  } catch (e) {
    log.error(HELPERS.express, `Error navigating to ${area}`, e)
    res.redirect('/404')
  }
})

rootRouter.get('/api/settings', async (req, res, next) => {
  try {
    if (
      config.authentication.alwaysEnabledPerms.length ||
      !config.authMethods.length
    ) {
      if (req.session.tutorial === undefined) {
        req.session.tutorial = !config.map.forceTutorial
      }
      req.session.perms = {
        ...Object.fromEntries(
          Object.keys(config.authentication.perms).map((p) => [p, false]),
        ),
        areaRestrictions: Utility.areaPerms(['none']),
        webhooks: [],
        scanner: Object.keys(config.scanner).filter(
          (key) =>
            key !== 'backendConfig' &&
            config.scanner[key].enabled &&
            !config.scanner[key].discordRoles.length &&
            !config.scanner[key].telegramGroups.length,
        ),
      }
      config.authentication.alwaysEnabledPerms.forEach((perm) => {
        if (config.authentication.perms[perm]) {
          req.session.perms[perm] = true
        } else {
          log.warn(
            HELPERS.auth,
            'Invalid Perm in "alwaysEnabledPerms" array:',
            perm,
          )
        }
      })
      req.session.save()
    }

    const getUser = async () => {
      if (config.authMethods.length && req.user) {
        try {
          const user = await Db.models.User.query().findById(req.user.id)
          if (user) {
            delete user.password
            return {
              ...req.user,
              ...user,
              valid: true,
              username: user.username || req.user.username,
            }
          }
          log.info(
            HELPERS.session,
            'Legacy user detected, forcing logout, User ID:',
            req?.user?.id,
          )
          req.logout(() => {})
          return { valid: false, tutorial: !config.map.forceTutorial }
        } catch (e) {
          log.info(
            HELPERS.session,
            'Issue finding user, User ID:',
            req?.user?.id,
          )
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
      userBackupLimits: config.database.settings.userBackupLimits,
      masterfile: { ...Event.masterfile, invasions: Event.invasions },
      config: {
        map: {
          ...config.map,
          ...config.multiDomainsObj[req.headers.host],
          excludeList: config.authentication.excludeFromTutorial,
          polling: config.api.polling,
          authCounts: {
            areaRestrictions: config.authentication.areaRestrictions.length,
            webhooks: config.webhooks.filter((w) => w.enabled).length,
            scanner: Object.values(config.scanner).filter((s) => s.enabled)
              .length,
          },
        },
        localeSelection: Object.fromEntries(
          config.map.localeSelection.map((l) => [l, { name: l }]),
        ),
        tileServers: Object.fromEntries(
          config.tileServers.map((s) => [s.name, s]),
        ),
        navigation: Object.fromEntries(
          config.navigation.map((n) => [n.name, n]),
        ),
        navigationControls: {
          react: {},
          leaflet: {},
        },
        icons: { ...config.icons, styles: Event.uicons },
        scanner: {
          scannerType: config.scanner.backendConfig.platform,
          enableScanNext: config.scanner.scanNext.enabled,
          scanNextShowScanCount: config.scanner.scanNext.showScanCount,
          scanNextShowScanQueue: config.scanner.scanNext.showScanQueue,
          scanNextAreaRestriction:
            config.scanner.scanNext.scanNextAreaRestriction,
          scanNextCooldown: config.scanner.scanNext.userCooldownSeconds,
          enableScanZone: config.scanner.scanZone.enabled,
          scanZoneShowScanCount: config.scanner.scanZone.showScanCount,
          scanZoneShowScanQueue: config.scanner.scanZone.showScanQueue,
          advancedScanZoneOptions:
            config.scanner.scanZone.advancedScanZoneOptions,
          scanZoneRadius: config.scanner.scanZone.scanZoneRadius,
          scanZoneSpacing: config.scanner.scanZone.scanZoneSpacing,
          scanZoneMaxSize: config.scanner.scanZone.scanZoneMaxSize,
          scanZoneAreaRestriction:
            config.scanner.scanZone.scanZoneAreaRestriction,
          scanZoneCooldown: config.scanner.scanZone.userCooldownSeconds,
        },
        gymValidDataLimit:
          Date.now() / 1000 - config.api.gymValidDataLimit * 86400,
      },
      extraUserFields: config.database.settings.extraUserFields,
      available: { pokemon: [], pokestops: [], gyms: [], nests: [] },
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user.valid) {
      serverSettings.loggedIn = req.user

      serverSettings.config.map.searchable = Object.keys(
        config.api.searchable,
      ).filter((k) => config.api.searchable[k] && serverSettings.user.perms[k])

      // keys that are being sent to the frontend but are not options
      const ignoreKeys = [
        'map',
        'limit',
        'icons',
        'scanner',
        'gymValidDataLimit',
      ]

      Object.keys(serverSettings.config).forEach((setting) => {
        try {
          if (!ignoreKeys.includes(setting)) {
            const category = serverSettings.config[setting]
            Object.keys(category).forEach((option) => {
              category[option].name = option
            })
            if (
              config.map[setting] &&
              typeof config.map[setting] !== 'object'
            ) {
              serverSettings.settings[setting] = config.map[setting]
            } else {
              serverSettings.settings[setting] =
                category[Object.keys(category)[0]].name
            }
          }
        } catch (e) {
          log.warn(
            HELPERS.config,
            `Error setting ${setting}, most likely means there are no options set in the config`,
            e,
          )
        }
      })

      if (serverSettings.user.perms.pokemon) {
        if (config.api.queryOnSessionInit.pokemon) {
          Event.setAvailable('pokemon', 'Pokemon', Db, false)
        }
        serverSettings.available.pokemon = Event.getAvailable('pokemon')
      }
      if (serverSettings.user.perms.raids || serverSettings.user.perms.gyms) {
        if (config.api.queryOnSessionInit.raids) {
          Event.setAvailable('gyms', 'Gym', Db, false)
        }
        serverSettings.available.gyms = Event.getAvailable('gyms')
      }
      if (
        serverSettings.user.perms.quests ||
        serverSettings.user.perms.pokestops ||
        serverSettings.user.perms.invasions ||
        serverSettings.user.perms.lures
      ) {
        if (config.api.queryOnSessionInit.quests) {
          Event.setAvailable('pokestops', 'Pokestop', Db, false)
        }
        serverSettings.available.pokestops = Event.getAvailable('pokestops')
      }
      if (serverSettings.user.perms.nests) {
        if (config.api.queryOnSessionInit.nests) {
          Event.setAvailable('nests', 'Nest', Db, false)
        }
        serverSettings.available.nests = Event.getAvailable('nests')
      }
      if (Object.values(config.api.queryOnSessionInit).some((v) => v)) {
        Event.addAvailable()
        serverSettings.masterfile = {
          ...Event.masterfile,
          invasions: Event.invasions,
        }
      }

      serverSettings.defaultFilters = Utility.buildDefaultFilters(
        serverSettings.user.perms,
        serverSettings.available,
        Db.models,
      )

      // Backup in case there are Pokemon/Quests/Raids etc that are not in the masterfile
      // Primary for quest rewards that are form unset, despite normally have a set form

      serverSettings.ui = Utility.buildPrimaryUi(
        serverSettings.defaultFilters,
        serverSettings.user.perms,
      )

      serverSettings.menus = Utility.buildAdvMenus(serverSettings.available)

      const { clientValues, clientMenus } = Utility.buildClientOptions(
        serverSettings.user.perms,
      )

      serverSettings.userSettings = clientValues
      serverSettings.clientMenus = clientMenus

      if (
        config.webhooks.length &&
        serverSettings.user?.perms?.webhooks?.length
      ) {
        serverSettings.webhooks = {}
        const filtered = config.webhooks.filter((webhook) =>
          serverSettings.user.perms.webhooks.includes(webhook.name),
        )
        try {
          await Promise.all(
            filtered.map(async (webhook) => {
              if (
                webhook.enabled &&
                Event.webhookObj?.[webhook.name]?.client?.valid
              ) {
                const webhookId = Utility.evalWebhookId(serverSettings.user)
                const { strategy, webhookStrategy } = serverSettings.user

                const remoteData = await Fetch.webhookApi(
                  'allProfiles',
                  webhookId,
                  'GET',
                  webhook.name,
                )
                const { areas } = await Fetch.webhookApi(
                  'humans',
                  webhookId,
                  'GET',
                  webhook.name,
                )

                if (remoteData && areas) {
                  serverSettings.webhooks[webhook.name] = remoteData.human
                    .admin_disable
                    ? Event.webhookObj[webhook.name].client
                    : {
                        ...Event.webhookObj[webhook.name].client,
                        ...remoteData,
                        hasNominatim: Boolean(
                          Event.webhookObj[webhook.name].server.nominatimUrl,
                        ),
                        locale:
                          remoteData.human.language ||
                          Event.webhookObj[webhook.name].client.locale,
                        available: areas
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .filter((area) => area.userSelectable !== false)
                          .map((area) => area.name),
                        templates:
                          Event.webhookObj[webhook.name].client.templates[
                            webhookStrategy || strategy
                          ],
                      }
                }
              }
            }),
          )
        } catch (e) {
          serverSettings.webhooks = null
          log.warn(
            HELPERS.auth,
            e,
            'Unable to fetch webhook data, this is unlikely an issue with ReactMap, check to make sure the user is registered in the webhook database. User ID:',
            serverSettings.user.id,
          )
        }
      }
    }
    res.status(200).json({ serverSettings })
  } catch (error) {
    res.status(500).json({ error: error.message, status: 500 })
    next(error)
  }
})

module.exports = rootRouter
