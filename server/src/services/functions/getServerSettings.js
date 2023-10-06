const config = require('@rm/config')

const clientOptions = require('../ui/clientOptions')
const advMenus = require('../ui/advMenus')
const generateUi = require('../ui/primary')

/**
 *
 * @param {import("express").Request} req
 */
function getServerSettings(req) {
  const user = {
    ...(req.user ? req.user : req.session),
    loggedIn: !!req.user,
  }

  const { clientValues, clientMenus } = clientOptions(user.perms)

  const validConfig = config.getMapConfig(req)
  const serverSettings = {
    api: {
      polling: config.api.polling,
      gymValidDataLimit:
        Date.now() / 1000 - config.api.gymValidDataLimit * 86400,
    },
    user,
    authReferences: {
      areaRestrictions: config.authentication.areaRestrictions.length,
      webhooks: config.webhooks.filter((w) => w.enabled).length,
      scanner: Object.values(config.scanner).filter((s) => s.enabled).length,
    },
    map: {
      ...validConfig,
      general: {
        ...validConfig.general,
        geoJsonFileName: undefined,
      },
      loginPage: !!config.map.loginPage.components.length,
      donationPage: undefined,
      messageOfTheDay: undefined,
      customFloatingIcons: undefined,
    },
    authentication: {
      loggedIn: !!req.user,
      excludeList: config.authentication.excludeFromTutorial,
      methods: config.authentication.methods,
    },
    database: {
      settings: {
        extraUserFields: config.database.settings.extraUserFields,
        userBackupLimits: config.database.settings.userBackupLimits,
      },
    },
    tileServers: config.tileServers,
    navigation: config.navigation,
    menus: advMenus(),
    userSettings: clientValues,
    clientMenus,
    ui: generateUi(req, user.perms),
  }

  return serverSettings
}

module.exports = getServerSettings
