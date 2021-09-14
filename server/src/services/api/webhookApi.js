/* eslint-disable no-console */
const fetch = require('node-fetch')
const { webhooks } = require('../config')
const webhookConverter = require('../functions/webhookConverter')

const looper = (num, toLoop, staticData, skipZero) => {
  const arr = []
  for (let i = skipZero ? 1 : 0; i <= num; i += 1) {
    arr.push({ [toLoop]: i, ...staticData })
  }
  return arr
}

module.exports = async function webhookApi(category, discordId, method, data = null) {
  const headers = {}

  if (method === 'PATCH') method = 'POST'

  switch (webhooks.provider) {
    case 'poracle': Object.assign(headers, { 'X-Poracle-Secret': webhooks.poracleSecret }); break
    default: break
  }

  console.log(category)
  switch (category) {
    case 'switchProfile': {
      const post = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/${discordId}/${category}/${data}`, { method, headers })
        .then(res => res.json())
      const get = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/one/${discordId}`, { method: 'GET', headers })
        .then(res => res.json())
      return { ...post, ...get }
    }
    case 'setLocation': {
      const post = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/${discordId}/${category}/${data[0]}/${data[1]}`, { method, headers })
        .then(res => res.json())
      const get = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/one/${discordId}`, { method: 'GET', headers })
        .then(res => res.json())
      return { ...post, ...get }
    }
    case 'setAreas': {
      Object.assign(headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
      const post = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/${discordId}/${category}`, {
        method,
        headers,
        body: JSON.stringify(data),
      })
        .then(res => res.json())
      const get = await fetch(`${webhooks.host}:${webhooks.port}/api/humans/one/${discordId}`, { method: 'GET', headers })
        .then(res => res.json())
      return { ...post, ...get }
    }
    case 'areas': {
      const { areas } = await fetch(`${webhooks.host}:${webhooks.port}/api/geofence/all/hash`, {
        method,
        headers,
      })
        .then(res => res.json())
      return Object.keys(areas).map(a => a).sort()
    }
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

  try {
    return response
  } catch (e) {
    console.warn(e, `\nUnable to ${method} Poracle ${category} data for User ${discordId}`)
    return { status: false }
  }
}
