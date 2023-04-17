const fetchJson = require('./api/fetchJson')
const { log, HELPERS } = require('./logger')
const webhookUi = require('./ui/webhook')

module.exports = async function initWebhooks(webhook) {
  try {
    if (!webhook.name) {
      throw new Error('Webhook name property is required and must be unique')
    }
    if (webhook.enabled) {
      const options = {
        method: 'GET',
        headers: { 'X-Poracle-Secret': webhook.poracleSecret },
      }
      webhook.areasToSkip =
        webhook.areasToSkip?.map((x) => x.toLowerCase()) || []

      const hookConfig = await fetchJson(
        `${webhook.host}:${webhook.port}/api/config/poracleWeb`,
        options,
      )

      if (!hookConfig) {
        throw new Error(`Webhook [${webhook.name}] is not configured correctly`)
      }
      if (!hookConfig.version) {
        throw new Error(
          `No version found, webhook [${webhook.name}] is not configured correctly`,
        )
      }
      const [major, minor, patch] = hookConfig.version
        .split('.')
        .map((x) => parseInt(x))

      if (
        major < 4 ||
        (major === 4 && minor < 6) ||
        (major === 4 && minor === 6 && patch < 0)
      ) {
        throw new Error(
          `Poracle must be at least version 4.6.0, current version is ${hookConfig.version}`,
        )
      }

      const baseSettings = {
        name: webhook.name,
        platform: webhook.platform,
        addressFormat: webhook.addressFormat || hookConfig.addressFormat,
        fetched: Date.now(),
        leagues: [
          { name: 'great', cp: 1500, min: hookConfig.pvpFilterGreatMinCP },
          { name: 'ultra', cp: 2500, min: hookConfig.pvpFilterUltraMinCP },
        ],
        valid: Boolean(hookConfig),
        pvp: 'rdm',
        everything: hookConfig.everythingFlagPermissions === 'allow-any',
        gymBattles: hookConfig.gymBattles,
      }
      if (hookConfig?.pvpLittleLeagueAllowed) {
        baseSettings.leagues.push({
          name: 'little',
          cp: 500,
          min: hookConfig.pvpFilterLittleMinCP,
        })
        baseSettings.pvp = 'ohbem'
      }

      const templates = await fetchJson(
        `${webhook.host}:${webhook.port}/api/config/templates?names=true`,
        options,
      )
      const areas =
        (await fetchJson(
          `${webhook.host}:${webhook.port}/api/geofence/all/geojson`,
          options,
        )) || {}

      if (areas.geoJSON?.features) {
        areas.geoJSON.features = areas.geoJSON.features.filter(
          (x) => !webhook.areasToSkip.includes(x.properties.name.toLowerCase()),
        )
      } else {
        log.warn(HELPERS.webhooks, 'No geofences found')
      }

      if (templates) {
        ;['discord', 'telegram'].forEach((platform) => {
          if (templates[platform].monster) {
            templates[platform].pokemon = templates[platform].monster
            delete templates[platform].monster
          }
          if (templates[platform].monsterNoIv) {
            templates[platform].pokemonNoIv = templates[platform].monsterNoIv
            delete templates[platform].monsterNoIv
          }
        })
      }
      return {
        server: {
          provider: webhook.provider,
          platform: webhook.platform,
          host: webhook.host,
          port: webhook.port,
          poracleSecret: webhook.poracleSecret,
          discordRoles: webhook.discordRoles,
          nominatimUrl: hookConfig ? hookConfig.providerURL : null,
          areasToSkip: webhook.areasToSkip,
        },
        client: hookConfig
          ? {
              ...baseSettings,
              prefix: hookConfig.prefix,
              locale: hookConfig.locale,
              info: webhookUi(
                webhook.provider,
                hookConfig,
                baseSettings.pvp,
                baseSettings.leagues,
              ),
              areas: areas.geoJSON || { features: [] },
              templates,
            }
          : baseSettings,
      }
    }
    log.info(HELPERS.webhooks, `${webhook.name} webhook initialized`)
  } catch (e) {
    log.error(
      HELPERS.webhooks,
      'An error has occurred during webhook initialization',
      e,
    )
  }
  return {}
}
