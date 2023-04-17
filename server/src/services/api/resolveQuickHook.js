const fetchJson = require('./fetchJson')
const { Event } = require('../initialization')
const { log, HELPERS } = require('../logger')

const getWildCards = (category, gymBattles) => {
  switch (category) {
    case 'gym':
      return { team: 4, slot_changes: true, battle_changes: gymBattles }
    case 'egg':
    case 'raid':
      return { level: 90 }
    default:
      return {}
  }
}

module.exports = async function resolveQuickHook(
  category,
  discordId,
  webhookName,
  data,
) {
  const webhook = Event.webhookObj[webhookName]
  try {
    switch (category) {
      case 'quickGym':
        {
          const subCategories = ['raid', 'egg', 'gym']
          await Promise.all(
            subCategories.map(async (subCategory) => {
              const post = await fetchJson(
                `${webhook.server.host}:${webhook.server.port}/api/tracking/${subCategory}/${discordId}`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    ...webhook.client.info[subCategory].defaults,
                    ...getWildCards(subCategory, webhook.client.gymBattles),
                    gym_id: data.id,
                  }),
                  headers: {
                    'X-Poracle-Secret': webhook.server.poracleSecret,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                },
              )
              if (!post) {
                throw new Error(`Failed to post ${subCategory} webhook`)
              }
            }),
          )
        }
        break
      default:
        break
    }
    return {
      ...(await fetchJson(
        `${webhook.server.host}:${webhook.server.port}/api/tracking/allProfiles/${discordId}`,
        {
          method: 'GET',
          headers: { 'X-Poracle-Secret': webhook.server.poracleSecret },
        },
      )),
      status: 'success',
      message: 'Success',
    }
  } catch (e) {
    log.info(
      HELPERS.webhooks,
      'There was a problem processing that webhook request',
      e,
    )
    return { status: 'error', message: e.message }
  }
}
