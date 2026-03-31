// @ts-check
const config = require('@rm/config')

const { clientOptions } = require('../ui/clientOptions')
const { advMenus } = require('../ui/advMenus')
const { drawer } = require('../ui/drawer')
const { getAccessibleScanAreasMenu } = require('./getAccessibleScanAreasMenu')
const {
  getPublicAreaRestrictions,
  normalizeAreaRestrictions,
} = require('./areaPerms')

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
  const allowRequestScopedLegacyKeys =
    !!req.user && req.user.rmStrategy !== 'local'
  const normalizedPerms = user.perms
    ? {
        ...user.perms,
        areaRestrictions: normalizeAreaRestrictions(
          user.perms.areaRestrictions || [],
          req,
          allowRequestScopedLegacyKeys,
        ),
      }
    : user.perms

  const safeUser = {
    ...user,
    perms: normalizedPerms
      ? {
          ...normalizedPerms,
          areaRestrictions: getPublicAreaRestrictions(
            normalizedPerms.areaRestrictions,
          ),
        }
      : normalizedPerms,
  }

  const { clientValues, clientMenus } = clientOptions(safeUser.perms)

  const mapConfig = config.getMapConfig(req)
  const api = config.getSafe('api')
  const authentication = config.getSafe('authentication')
  const database = config.getSafe('database')

  const serverSettings = {
    api: {
      polling: api.polling,
      gymValidDataLimit: Date.now() / 1000 - api.gymValidDataLimit * 86400,
    },
    user: safeUser,
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
    },
    database: {
      settings: {
        extraUserFields: database.settings.extraUserFields,
        userBackupLimits: database.settings.userBackupLimits,
      },
    },
    tileServers: config.getSafe('tileServers'),
    navigation: config.getSafe('navigation'),
    menus: advMenus(safeUser.perms),
    scanAreasMenu: getAccessibleScanAreasMenu(req, normalizedPerms),
    userSettings: clientValues,
    clientMenus,
    ui: drawer(req, safeUser.perms),
  }

  return serverSettings
}

module.exports = { getServerSettings }
