/* eslint-disable no-console */
const fetchJson = require('./fetchJson')
const config = require('../config')

// const looper = (num, toLoop, staticData, skipZero) => {
//   const arr = []
//   for (let i = skipZero ? 1 : 0; i <= num; i += 1) {
//     arr.push({ ...staticData, [toLoop]: i })
//   }
//   return arr
// }

const getWildCards = (category) => {
  switch (category) {
    case 'gym': return { team: 4, slot_changes: true }
    case 'egg':
    case 'raid': return { level: 90 }
    default: return {}
  }
}

module.exports = async function resolveQuickHook(category, discordId, webhookName, data) {
  const webhook = config.webhookObj[webhookName]
  try {
    switch (category) {
      case 'quickGym': {
        const subCategories = ['raid', 'egg', 'gym']
        await Promise.all(subCategories.map(async subCategory => {
          const post = await fetchJson(`${webhook.server.host}:${webhook.server.port}/api/tracking/${subCategory}/${discordId}`, {
            method: 'POST',
            body: JSON.stringify({
              ...webhook.client.info[subCategory].defaults,
              ...getWildCards(subCategory),
              gym_id: data.id,
            }),
            headers: {
              'X-Poracle-Secret': webhook.server.poracleSecret,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          })
          if (!post) {
            throw new Error(`Failed to post ${subCategory} webhook`)
          }
        }))
      } break
      default: break
    }
    return {
      ...await fetchJson(`${webhook.server.host}:${webhook.server.port}/api/tracking/allProfiles/${discordId}`, {
        method: 'GET',
        headers: { 'X-Poracle-Secret': webhook.server.poracleSecret },
      }),
      status: 'success',
      message: 'Success',
    }
  } catch (e) {
    console.log(e.message, 'There was a problem processing that webhook request')
    return { status: 'error', message: e.message }
  }
}
