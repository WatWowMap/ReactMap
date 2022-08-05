/* eslint-disable no-console */
const config = require('../config')
const resolveQuickHook = require('./resolveQuickHook')
const fetchJson = require('./fetchJson')
const { Event } = require('../initialization')

module.exports = async function webhookApi(
  category,
  userId,
  method,
  webhookName,
  data = null,
) {
  try {
    const webhook = Event.webhookObj[webhookName]?.server
    if (!webhook) {
      throw new Error('Invalid Webhook selected: ', webhookName)
    }
    const headers = {}
    switch (webhook.provider) {
      case 'poracle':
        Object.assign(headers, { 'X-Poracle-Secret': webhook.poracleSecret })
        break
      default:
        break
    }
    const payloadObj = {}
    switch (category) {
      case 'start':
      case 'stop':
      case 'switchProfile':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${
            webhook.port
          }/api/humans/${userId}/${category}${data ? `/${data}` : ''}`,
          options: { method, headers },
          get: 'human',
        })
        break
      case 'setLocation':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${userId}/${category}/${data[0]}/${data[1]}`,
          options: { method, headers },
          get: 'human',
        })
        break
      case 'setAreas':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${userId}/${category}`,
          options: {
            method,
            headers,
            body: JSON.stringify(data),
          },
          get: 'human',
        })
        break
      case 'geojson':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/geofence/all/${category}`,
          options: { method, headers },
        })
        break
      case 'areaSecurity':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/geofence/${userId}`,
          options: { method, headers },
        })
        break
      case 'humans':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/humans/${userId}`,
          options: { method, headers },
        })
        break
      case 'profiles-add':
      case 'profiles-byProfileNo':
      case 'profiles-update':
      case 'profiles-copy':
      case 'profiles':
        {
          const [main, sub] = category.split('-')
          Object.assign(payloadObj, {
            url: `${webhook.host}:${webhook.port}/api/${main}/${userId}/${sub}${
              sub === 'copy' ? `/${data.from}/${data.to}` : ''
            }${method === 'DELETE' ? `/${data}` : ''}`,
            options: {
              method,
              headers,
              body:
                method === 'POST' && category !== 'profiles-copy'
                  ? JSON.stringify(data)
                  : undefined,
            },
            get: main,
          })
        }
        break
      case 'egg-delete':
      case 'invasion-delete':
      case 'lure-delete':
      case 'nest-delete':
      case 'pokemon-delete':
      case 'quest-delete':
      case 'raid-delete':
      case 'gym-delete':
        {
          const [main, sub] = category.split('-')
          Object.assign(payloadObj, {
            url: `${webhook.host}:${webhook.port}/api/tracking/${main}/${userId}/${sub}`,
            options: {
              method,
              headers,
              body: method === 'POST' ? JSON.stringify(data) : undefined,
            },
            get: main,
          })
        }
        break
      case 'egg':
      case 'invasion':
      case 'lure':
      case 'nest':
      case 'pokemon':
      case 'quest':
      case 'raid':
      case 'gym':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${
            webhook.port
          }/api/tracking/${category}/${userId}${
            method === 'DELETE' ? `/byUid/${data.uid}` : ''
          }`,
          options: {
            method,
            headers,
            body: method === 'POST' ? JSON.stringify(data) : undefined,
          },
          get: method === 'DELETE' ? undefined : category,
        })
        break
      case 'quickGym':
        return resolveQuickHook(category, userId, webhookName, data)
      case 'importWebhook':
        Object.assign(payloadObj, {
          url: `${webhook.host}:${webhook.port}/api/import/${userId}`,
          options: {
            method,
            headers,
            body: data ? JSON.stringify(data) : null,
          },
        })
        break
      default:
        Object.assign(payloadObj, {
          url: `${webhook.host}:${
            webhook.port
          }/api/tracking/${category}/${userId}${
            method === 'DELETE' ? `/byUid/${data.uid}` : ''
          }`,
          options: {
            method,
            headers,
            body: data ? JSON.stringify(data) : null,
          },
        })
        break
    }

    if (payloadObj.options.body) {
      Object.assign(payloadObj.options.headers, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      })
    }
    const post = await fetchJson(
      payloadObj.url,
      payloadObj.options,
      config.devOptions.enabled,
    )

    if (!post) {
      throw new Error('No data returned from server')
    }
    if (payloadObj.get) {
      const getUrl = (() => {
        switch (payloadObj.get) {
          case 'profiles':
            return `${webhook.host}:${webhook.port}/api/profiles/${userId}`
          case 'human':
            return `${webhook.host}:${webhook.port}/api/humans/one/${userId}`
          default:
            return `${webhook.host}:${webhook.port}/api/tracking/${payloadObj.get}/${userId}`
        }
      })()
      const get = await fetchJson(
        getUrl,
        { method: 'GET', headers },
        config.devOptions.enabled,
      )
      return { ...post, ...get }
    }
    return post
  } catch (e) {
    console.log(
      e.message,
      'There was a problem processing that webhook request',
    )
    return { status: 'error', message: 'webhook_error' }
  }
}
