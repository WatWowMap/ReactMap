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
        const hookConfig = await fetchJson(`${webhook.host}:${webhook.port}/api/config/poracleWeb`, options, config.devOptions.enabled)

        const baseSettings = {
          name: webhook.name,
          platform: webhook.platform,
          addressFormat: webhook.addressFormat || hookConfig.addressFormat,
          fetched: Date.now(),
          leagues: [{ name: 'great', cp: 1500 }, { name: 'ultra', cp: 2500 }],
          valid: Boolean(hookConfig),
        }
        if (hookConfig?.pvpLittleLeagueAllowed) {
          baseSettings.leagues.push({ name: 'little', cp: 500 })
        }

        const templates = await fetchJson(`${webhook.host}:${webhook.port}/api/config/templates?names=true`, options, config.devOptions.enabled)
        const areas = await fetchJson(`${webhook.host}:${webhook.port}/api/geofence/all/hash`, options, config.devOptions.enabled)

        if (templates) {
          templates[webhook.platform].pokemon = templates.monster
          delete templates[webhook.platform].monster
          templates[webhook.platform].pokemonNoIv = templates.monsterNoIv
          delete templates[webhook.platform].monsterNoIv
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
            pvp: hookConfig.pvpLittleLeagueAllowed ? 'ohbem' : 'rdm',
            info: webhookUi(webhook.provider, hookConfig, baseSettings.pvp, baseSettings.leagues),
            areas: areas ? Object.keys(areas.areas).map(a => a).sort() : [],
            template: templates[webhook.platform],
          } : baseSettings,
        }
      }
    }))
  } catch (e) {
    console.log(e, 'There has bene an error during webhook initialization')
  }
  return webhookObj
}
