/* eslint-disable no-console */
const { webhooks } = require('../config')
// const webhookConverter = require('../functions/webhookConverter')
const fetchJson = require('./fetchJson')

const webhookObj = {}
webhooks.forEach(hook => {
  webhookObj[hook.name] = hook
})

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
  const webhook = webhookObj[webhookName]

  const headers = {}
  switch (webhook.provider) {
    case 'poracle': Object.assign(headers, { 'X-Poracle-Secret': webhook.poracleSecret }); break
    default: break
  }

  console.log(category)

  const payloadObj = {}
  switch (category) {
    case 'poracleWeb':
    case 'templates':
      Object.assign(payloadObj, {
        url: `${webhook.host}:${webhook.port}/api/config/${category}?names=true`,
        options: { method, headers },
      }); break
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
    case 'areas':
      Object.assign(payloadObj, {
        url: `${webhook.host}:${webhook.port}/api/geofence/all/hash`,
        options: { method, headers },
      }); break
    case 'humans':
      Object.assign(payloadObj, {
        url: `${webhook.host}:${webhook.port}/api/humans/${discordId}`,
        options: { method, headers },
      }); break
    case 'raid':
    case 'egg':
    case 'invasion':
    case 'lure':
    case 'pokemon':
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
        // get: category,
      }); break
  }

  if (payloadObj.options.body) {
    Object.assign(payloadObj.options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
  }
  if (method === 'PATCH') {
    method = 'POST'
  }

  try {
    const post = await fetchJson(payloadObj.url, payloadObj.options)

    if (category === 'templates') {
      post[webhook.platform].pokemon = post[webhook.platform].monster
      delete post[webhook.platform].monster
      post[webhook.platform].pokemonNoIv = post[webhook.platform].monsterNoIv
      delete post[webhook.platform].monsterNoIv
    }
    if (category === 'areas') {
      return Object.keys(post.areas).map(a => a).sort()
    }
    if (payloadObj.get) {
      const getUrl = payloadObj.get === 'human'
        ? `${webhook.host}:${webhook.port}/api/humans/one/${discordId}`
        : `${webhook.host}:${webhook.port}/api/tracking/${payloadObj.get}/${discordId}`
      // GETcategory(webhook, headers, discordId, payloadObj.get)
      const get = await fetchJson(getUrl, { method: 'GET', headers })
      return { ...post, ...get }
    }
    return post
  } catch (e) {
    console.error(e, 'Issue with fetching or getting data', payloadObj)
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
