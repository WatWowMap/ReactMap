// @ts-check
const config = require('@rm/config')

const { clientOptions } = require('../ui/clientOptions')
const { advMenus } = require('../ui/advMenus')
const { drawer } = require('../ui/drawer')
const { isTelegramOAuth } = require('./getTelegramStrategy')
const { getPersonalShinyMax } = require('./personalShinyLimits')
const playerIdLookup = require('../services/playerIdLookup')
const personalShiny = require('../services/personalShiny')

/**
 *
 * @param {import("express").Request} req
 */
function getServerSettings(req) {
  const user =
    /** @type {import('@rm/types').ExpressUser & { loggedIn: boolean; cooldown: number }} */ ({
      ...(req.user ? req.user : req.session),
      loggedIn: !!req.user,
      cooldown: req.session?.cooldown || 0,
    })
  user.personalShinyMax = getPersonalShinyMax(user.perms)
  // friend codes are turned into player ids by the server
  user.personalShinyLookup = playerIdLookup.enabled()
  // whether the player id behind a friend code is shown in the profile
  user.personalShinyShowId = !!config.getSafe(
    'authentication.perms.personalShiny.showPlayerId',
  )
  // whether the rates have backgrounds that can be predicted right now
  user.personalBackgrounds = personalShiny.backgroundsKnown()

  const { clientValues, clientMenus } = clientOptions(user.perms)

  const mapConfig = config.getMapConfig(req)
  const api = config.getSafe('api')
  const authentication = config.getSafe('authentication')
  const database = config.getSafe('database')

  const serverSettings = {
    api: {
      polling: api.polling,
      gymValidDataLimit: Date.now() / 1000 - api.gymValidDataLimit * 86400,
    },
    user,
    authReferences: {
      areaRestrictions: authentication.areaRestrictions.length,
      webhooks: config.getSafe('webhooks').filter((w) => w.enabled).length,
      scanner: Object.values(config.getSafe('scanner')).filter(
        (s) => 'enabled' in s && s.enabled,
      ).length,
    },
    map: {
      ...mapConfig,
      general: {
        ...mapConfig.general,
        geoJsonFileName: undefined,
      },
      loginPage: !!mapConfig.loginPage.components.length,
      donationPage: undefined,
      messageOfTheDay: undefined,
      customFloatingIcons: undefined,
    },
    authentication: {
      loggedIn: !!req.user,
      excludeList: authentication.excludeFromTutorial,
      methods: authentication.methods,
      // customRoutes is per domain, and each domain can point at a different
      // telegram strategy
      telegramOAuth: isTelegramOAuth(
        mapConfig.customRoutes.telegramAuthUrl,
        authentication.strategies,
      ),
    },
    database: {
      settings: {
        extraUserFields: database.settings.extraUserFields,
        userBackupLimits: database.settings.userBackupLimits,
      },
    },
    tileServers: config.getSafe('tileServers'),
    navigation: config.getSafe('navigation'),
    menus: advMenus(user.perms),
    userSettings: clientValues,
    clientMenus,
    ui: drawer(req, user.perms),
  }

  return serverSettings
}

module.exports = { getServerSettings }
