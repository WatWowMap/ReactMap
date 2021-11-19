/* eslint-disable no-console */
const fetchJson = require('./api/fetchJson')
const webhookUi = require('./ui/webhook')

module.exports = async function initWebhooks(config) {
  const webhookObj = {}
  try {
    await Promise.all(config.webhooks.map(async webhook => {
      if (!webhook.name || webhookObj[webhook.name]) {
        throw new Error('Webhook name property is required and must be unique')
      }
      if (webhook.enabled) {
        const options = { method: 'GET', headers: { 'X-Poracle-Secret': webhook.poracleSecret } }
        webhook.areasToSkip = webhook.areasToSkip?.map(x => x.toLowerCase()) || []

        const hookConfig = await fetchJson(`${webhook.host}:${webhook.port}/api/config/poracleWeb`, options, config.devOptions.enabled)

        if (!hookConfig) {
          throw new Error(`Webhook ${webhook.name} is not configured correctly`)
        }
        const [major, minor, patch] = hookConfig.version.split('.').map(x => parseInt(x))

        if (major < 4 || (major === 4 && minor < 3) || (major === 4 && minor === 3 && patch < 2)) {
          throw new Error(`Poracle must be at least version 4.3.2. Current version is ${hookConfig.version}`)
        }

        const baseSettings = {
          name: webhook.name,
          platform: webhook.platform,
          addressFormat: webhook.addressFormat || hookConfig.addressFormat,
          fetched: Date.now(),
          leagues: [{ name: 'great', cp: 1500 }, { name: 'ultra', cp: 2500 }],
          valid: Boolean(hookConfig),
          pvp: 'rdm',
          everything: hookConfig.everythingFlagPermissions === 'allow-any',
        }
        if (hookConfig?.pvpLittleLeagueAllowed) {
          baseSettings.leagues.push({ name: 'little', cp: 500 })
          baseSettings.pvp = 'ohbem'
        }

        const templates = await fetchJson(`${webhook.host}:${webhook.port}/api/config/templates?names=true`, options, config.devOptions.enabled)
        const areas = await fetchJson(`${webhook.host}:${webhook.port}/api/geofence/all/geojson`, options, config.devOptions.enabled) || {}

        if (areas.geoJSON?.features) {
          areas.geoJSON.features = areas.geoJSON.features
            .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
            .filter(x => !webhook.areasToSkip.includes(x.properties.name.toLowerCase()))
        } else {
          console.warn('No geofences found')
        }

        if (templates) {
          ['discord', 'telegram'].forEach(platform => {
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

        webhookObj[webhook.name] = {
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
          client: hookConfig ? {
            ...baseSettings,
            prefix: hookConfig.prefix,
            locale: hookConfig.locale,
            info: webhookUi(webhook.provider, hookConfig, baseSettings.pvp, baseSettings.leagues),
            areas: areas.geoJSON || [],
            templates,
          } : baseSettings,
        }
      }
    }))
  } catch (e) {
    console.log(e, 'There has bene an error during webhook initialization')
  }
  return webhookObj
}
