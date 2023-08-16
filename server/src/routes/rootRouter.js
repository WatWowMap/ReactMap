const express = require('express')
const fs = require('fs')
const { resolve } = require('path')

const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const config = require('../services/config')
const Utility = require('../services/Utility')
const { Event, Db } = require('../services/initialization')
const { version } = require('../../../package.json')
const { log, HELPERS } = require('../services/logger')
const buildDefaultFilters = require('../services/filters/builder/base')
const advMenus = require('../services/ui/advMenus')

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

rootRouter.post('/api/error/client', (req, res) => {
  if (req.headers.version === version) {
    const {
      body: { error },
      user,
    } = req
    const userName =
      user?.username ||
      user?.discordId ||
      user?.telegramId ||
      user?.id ||
      'Not Logged In'
    if (error) {
      log.warn(HELPERS.client, `User: ${userName}`, error)
    }
    return res.status(200).json({ status: 'ok' })
  }
  return res.status(464).json({ status: 'invalid client version' })
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
          const user = await Db.query('User', 'getOne', req.user.id)
          if (user) {
            if (!user.selectedWebhook) {
              const newWebhook = req.user.perms.webhooks.find(
                (n) => n in Event.webhookObj,
              )
              await Db.query('User', 'updateWebhook', user.id, newWebhook)
              req.session.user.selectedWebhook = newWebhook
              req.session.save()
            }
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
          log.warn(
            HELPERS.session,
            'Issue finding user, User ID:',
            req?.user?.id,
            e,
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
      // masterfile: { ...Event.masterfile, invasions: Event.invasions },
      config: {
        map: {
          ...config.map,
          ...config.multiDomainsObj[req.headers.host],
          loginPage: !!config.map.loginPage.components.length,
          donationPage: undefined,
          messageOfTheDay: undefined,
          customFloatingIcons: undefined,
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
        // icons: { ...config.icons, styles: Event.uicons },
        gymValidDataLimit:
          Date.now() / 1000 - config.api.gymValidDataLimit * 86400,
      },
      extraUserFields: config.database.settings.extraUserFields,
      // available: { pokemon: [], pokestops: [], gyms: [], nests: [] },
    }

    // add user options here from the config that are structured as objects
    if (serverSettings.user.valid) {
      serverSettings.loggedIn = req.user

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

      if (
        serverSettings.user.perms.pokemon &&
        config.api.queryOnSessionInit.pokemon
      ) {
        Event.setAvailable('pokemon', 'Pokemon', Db, false)
      }
      if (
        config.api.queryOnSessionInit.raids &&
        (serverSettings.user.perms.raids || serverSettings.user.perms.gyms)
      ) {
        Event.setAvailable('gyms', 'Gym', Db, false)
      }
      if (
        config.api.queryOnSessionInit.quests &&
        (serverSettings.user.perms.quests ||
          serverSettings.user.perms.pokestops ||
          serverSettings.user.perms.invasions ||
          serverSettings.user.perms.lures)
      ) {
        Event.setAvailable('pokestops', 'Pokestop', Db, false)
      }
      if (
        serverSettings.user.perms.nests &&
        config.api.queryOnSessionInit.nests
      ) {
        Event.setAvailable('nests', 'Nest', Db, false)
      }
      if (Object.values(config.api.queryOnSessionInit).some((v) => v)) {
        Event.addAvailable()
      }

      serverSettings.defaultFilters = buildDefaultFilters(
        serverSettings.user.perms,
        Db,
      )

      // Backup in case there are Pokemon/Quests/Raids etc that are not in the masterfile
      // Primary for quest rewards that are form unset, despite normally have a set form

      serverSettings.ui = Utility.buildPrimaryUi(
        serverSettings.defaultFilters,
        serverSettings.user.perms,
      )

      serverSettings.menus = advMenus()

      const { clientValues, clientMenus } = Utility.buildClientOptions(
        serverSettings.user.perms,
      )

      serverSettings.userSettings = clientValues
      serverSettings.clientMenus = clientMenus
    }
    res.status(200).json({ serverSettings })
  } catch (error) {
    res.status(500).json({ error: error.message, status: 500 })
    next(error)
  }
})

module.exports = rootRouter
