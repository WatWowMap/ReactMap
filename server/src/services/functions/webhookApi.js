/* eslint-disable no-console */
const fetch = require('node-fetch')
const { webhooks } = require('../config')
const webhookConverter = require('./webhookConverter')

const looper = (num, toLoop, staticData, skipZero) => {
  const arr = []
  for (let i = skipZero ? 1 : 0; i <= num; i += 1) {
    arr.push({ [toLoop]: i, ...staticData })
  }
  return arr
}

module.exports = async function webhookApi(category, discordId, method, data = null) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }

  if (method === 'PATCH') method = 'POST'
  switch (webhooks.provider) {
    case 'poracle': Object.assign(headers, { 'X-Poracle-Secret': webhooks.poracleSecret }); break
    default: break
  }
  let sending
  if (method === 'POST') {
    sending = webhookConverter(category, data)
    if (category === 'gym') {
      switch (true) {
        case data.subCategories.teamChanges:
          sending = looper(3, 'team', { gym_id: data.id, distance: data.distance, clean: data.clean }); break
        case data.subCategories.allRaids:
          category = ['raid', 'egg']
          sending = looper(6, 'level', { gym_id: data.id, distance: data.distance, clean: data.clean }, true); break
        default: break
      }
    } else if (category === 'pokestop') {
      console.log('pokestop')
    }
  }

  const fetcher = async (cat) => fetch(`${webhooks.host}:${webhooks.port}/api/tracking/${cat}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`, {
    method,
    body: sending ? JSON.stringify(sending) : null,
    headers,
  }).then(res => res.json())

  const response = Array.isArray(category)
    ? await Promise.all(category.map(cat => fetcher(cat)))
    : await fetcher(category)

  // if (category === 'all') {
  //   response.gym.forEach(gym => {
  //     let count = 0
  //     response.raid.forEach(raid => {
  //       if (raid.gym_id === gym.id) count += 1
  //     })
  //     if (count === 6) {
  //       gym.allRaids = true
  //     }
  //   })
  // }

  try {
    return response
  } catch (e) {
    console.warn(e, `\nUnable to ${method} Poracle ${category} data for User ${discordId}`)
    return { status: false }
  }
}
