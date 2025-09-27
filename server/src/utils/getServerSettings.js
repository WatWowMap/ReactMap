// @ts-check
const config = require('@rm/config')
const { knex } = require('knex')

const { clientOptions } = require('../ui/clientOptions')
const { advMenus } = require('../ui/advMenus')
const { drawer } = require('../ui/drawer')

/**
 *
 * @param {import("express").Request} req
 */
let accessDb

async function getServerSettings(req) {
  const user =
    /** @type {import('@rm/types').ExpressUser & { loggedIn: boolean; cooldown: number }} */ ({
      ...(req.user ? req.user : req.session),
      loggedIn: !!req.user,
      cooldown: req.session?.cooldown || 0,
    })

  // Optional: fetch accessType and accessExpiration from external access DB
  try {
    const accessCfg = config.getSafe('accessDatabase')
    if (accessCfg && accessCfg.host && accessCfg.database && accessCfg.table) {
      if (!accessDb) {
        accessDb = knex({
          client: 'mysql2',
          connection: {
            host: accessCfg.host,
            port: accessCfg.port || 3306,
            user: accessCfg.username,
            password: accessCfg.password,
            database: accessCfg.database,
          },
          pool: { min: 0, max: 5 },
        })
      }
      const matchBy = accessCfg.matchBy || 'discordId'
      const matchColumn = accessCfg.matchColumn || (matchBy === 'username' ? 'username' : 'discord_id')
      const typeColumn = accessCfg.typeColumn || 'access_type'
      const expirationColumn = accessCfg.expirationColumn || 'access_expiration'

      // Determine identifier to match on
      const identifier = matchBy === 'username' ? user.username : user.discordId
      if (identifier) {
        // eslint-disable-next-line no-underscore-dangle
        const row = await accessDb(accessCfg.table)
          .select([typeColumn, expirationColumn])
          .where(matchColumn, identifier)
          .first()
        user.accessType = row?.[typeColumn] ?? null
        user.accessExpiration = row?.[expirationColumn] ?? null
      } else {
        user.accessType = null
        user.accessExpiration = null
      }
    } else {
      user.accessType = null
      user.accessExpiration = null
    }
  } catch (e) {
    // Fail safe: do not break settings payload if access DB lookup fails
    user.accessType = null
    user.accessExpiration = null
  }

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
