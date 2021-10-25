/* eslint-disable no-console */
const config = require('../config')
const fetchJson = require('./fetchJson')

// const looper = (num, toLoop, staticData, skipZero) => {
//   const arr = []
//   for (let i = skipZero ? 1 : 0; i <= num; i += 1) {
//     arr.push({ [toLoop]: i, ...staticData })
//   }
//   return arr
// }

// const GETcategory = (webhook, headers, discordId, category) => ({
//   human: {
//     url: `${webhook.host}:${webhook.port}/api/humans/one/${discordId}`,
//     options: { method: 'GET', headers },
//   },
//   pokemon: {
//     url: `${webhook.host}:${webhook.port}/api/tracking/pokemon/${discordId}`,
//     options: { method: 'GET', headers },
//   },
// }[category])
module.exports = async function webhookApi(category, discordId, method, webhookName, data = null) {
  try {
    const webhook = config.webhookObj[webhookName]?.server
    if (!webhook) {
      throw new Error('Invalid Webhook selected: ', webhookName)
    }
    const headers = {}
    switch (webhook.provider) {
      case 'poracle': Object.assign(headers, { 'X-Poracle-Secret': webhook.poracleSecret }); break
      default: break
    }

    console.log(category)

    const payloadObj = {}
    switch (category) {
      case 'switchProfile':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}/${category}/${data}`,
          options: { method, headers },
          get: 'human',
        }); break
      case 'setLocation':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}/${category}/${data[0]}/${data[1]}`,
          options: { method, headers },
          get: 'human',
        }); break
      case 'setAreas':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}/${category}`,
          options: {
            method, headers, body: JSON.stringify(data),
          },
          get: 'human',
        }); break
      case 'geojson':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/geofence/all/${category}`,
          options: { method, headers },
        }); break
      case 'humans':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}`,
          options: { method, headers },
        }); break
      case 'egg':
      case 'invasion':
      case 'lure':
      case 'nest':
      case 'pokemon':
      case 'quest':
      case 'raid':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/tracking/${category}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`,
          options: {
            method, headers, body: method === 'POST' ? JSON.stringify(data) : undefined,
          },
          get: method === 'DELETE' ? undefined : category,
        }); break
      default:
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/tracking/${category}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`,
          options: {
            method, headers, body: data ? JSON.stringify(data) : null,
          },
        }); break
    }

    if (payloadObj.options.body) {
      Object.assign(payloadObj.options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
    }
    if (method === 'PATCH') {
      method = 'POST'
    }

    const post = await fetchJson(payloadObj.url, payloadObj.options, config.devOptions.enabled)

    if (payloadObj.get) {
      const getUrl = payloadObj.get === 'human'
        ? `${webhook.host}:${webhook.port}/api/humans/one/${discordId}`
        : `${webhook.host}:${webhook.port}/api/tracking/${payloadObj.get}/${discordId}`
      const get = await fetchJson(getUrl, { method: 'GET', headers }, config.devOptions.enabled)
      return { ...post, ...get }
    }
    return post
  } catch (e) {
    console.log(e, 'There was a problem processing that webhook request')
    return { status: false }
  }
}
// Coming back to this later :shrug:
// let sending
// if (method === 'POST') {
//   sending = webhookConverter(category, data)
//   if (category === 'gym') {
//     switch (true) {
//       case data.subCategories.teamChanges:
//         sending = looper(3, 'team', { gym_id: data.id, distance: data.distance, clean: data.clean }); break
//       case data.subCategories.allRaids:
//         category = ['raid', 'egg']
//         sending = looper(6, 'level', { gym_id: data.id, distance: data.distance, clean: data.clean }, true); break
//       default: break
//     }
//   } else if (category === 'pokestop') {
//     console.log('pokestop')
//   }
// }

// const fetcher = async (cat) => fetch(`${webhook.host}:${webhook.port}/api/tracking/${cat}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`, {
//   method,
//   body: sending ? JSON.stringify(sending) : null,
//   headers,
// }).then(res => res.json())

// const response = Array.isArray(category)
//   ? await Promise.all(category.map(cat => fetcher(cat)))
//   : await fetcher(category)
