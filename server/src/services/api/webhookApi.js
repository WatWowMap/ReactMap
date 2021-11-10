/* eslint-disable no-console */
const config = require('../config')
const resolveQuickHook = require('./resolveQuickHook')
const fetchJson = require('./fetchJson')

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
    const payloadObj = {}
    switch (category) {
      case 'start':
      case 'stop':
      case 'switchProfile':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}/${category}${data ? `/${data}` : ''}`,
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
      case 'areaSecurity':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/geofence/${discordId}`,
          options: { method, headers },
        }); break
      case 'humans':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${discordId}`,
          options: { method, headers },
        }); break
      case 'profiles-add':
      case 'profiles-byProfileNo':
      case 'profiles-update':
      case 'profiles-copy':
      case 'profiles': {
        const [main, sub] = category.split('-')
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/${main}/${discordId}/${sub}${sub === 'copy' ? `/${data.from}/${data.to}` : ''}${method === 'DELETE' ? `/${data}` : ''}`,
          options: {
            method, headers, body: method === 'POST' && category !== 'profiles-copy' ? JSON.stringify(data) : undefined,
          },
          get: main,
        })
      } break
      case 'egg-delete':
      case 'invasion-delete':
      case 'lure-delete':
      case 'nest-delete':
      case 'pokemon-delete':
      case 'quest-delete':
      case 'raid-delete':
      case 'gym-delete': {
        const [main, sub] = category.split('-')
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/tracking/${main}/${discordId}/${sub}`,
          options: {
            method, headers, body: method === 'POST' ? JSON.stringify(data) : undefined,
          },
          get: main,
        })
      } break
      case 'egg':
      case 'invasion':
      case 'lure':
      case 'nest':
      case 'pokemon':
      case 'quest':
      case 'raid':
      case 'gym':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/tracking/${category}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`,
          options: {
            method, headers, body: method === 'POST' ? JSON.stringify(data) : undefined,
          },
          get: method === 'DELETE' ? undefined : category,
        }); break
      case 'quickGym': return resolveQuickHook(category, discordId, webhookName, data)
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
    const post = await fetchJson(payloadObj.url, payloadObj.options, config.devOptions.enabled)

    if (!post) {
      throw new Error('No data returned from server')
    }
    if (payloadObj.get) {
      const getUrl = (function getUrl() {
        switch (payloadObj.get) {
          case 'profiles':
            return `${webhook.host}:${webhook.port}/api/profiles/${discordId}`
          case 'human':
            return `${webhook.host}:${webhook.port}/api/humans/one/${discordId}`
          default:
            return `${webhook.host}:${webhook.port}/api/tracking/${payloadObj.get}/${discordId}`
        }
      }())
      const get = await fetchJson(getUrl, { method: 'GET', headers }, config.devOptions.enabled)
      return { ...post, ...get }
    }
    return post
  } catch (e) {
    console.log(e.message, 'There was a problem processing that webhook request')
    return { status: 'error', message: 'webhook_error' }
  }
}
