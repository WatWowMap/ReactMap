/* eslint-disable no-console */
const fetch = require('node-fetch')
const NodeCache = require('node-cache')

const Clients = require('../Clients')
const config = require('../config')

const scannerQueue = {
  scanNext: {},
  scanZone: {},
}

const userCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

module.exports = async function scannerApi(
  category,
  method,
  data = null,
  user = { id: 0, username: 'a visitor' },
) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.api.fetchTimeoutMs)

  const coords =
    config.scanner.backendConfig.platform === 'mad'
    ? [
      parseFloat(data.scanCoords[0][0].toFixed(5)),
      parseFloat(data.scanCoords[0][1].toFixed(5)),
    ]
    : config.scanner.backendConfig.platform === 'custom'
    ? [ data.scanCoords.map((coord) => [
        parseFloat(coord[0].toFixed(5)),
        parseFloat(coord[1].toFixed(5)),
      ])
    ]
    : data.scanCoords?.map((coord) => ({
      lat: parseFloat(coord[0].toFixed(5)),
      lon: parseFloat(coord[1].toFixed(5)),
    })) || []

  try {
    const headers = {}
    switch (config.scanner.backendConfig.platform) {
      case 'mad':
      case 'rdm':
        Object.assign(headers, {
          Authorization: `Basic ${Buffer.from(
            `${config.scanner.backendConfig.apiUsername}:${config.scanner.backendConfig.apiPassword}`,
          ).toString('base64')}`,
        })
        break
      case 'custom':
        if (config.scanner.backendConfig.apiUsername || config.scanner.backendConfig.apiPassword) {
          Object.assign(headers, {
            Authorization: `Basic ${Buffer.from(
                `${config.scanner.backendConfig.apiUsername}:${config.scanner.backendConfig.apiPassword}`,
            ).toString('base64')}`,
          })
        }
        break
      default:
        break
    }
    const payloadObj = {}
    const cache = userCache.has(user.id)
      ? userCache.get(user.id)
      : { coordinates: 0, requests: 0 }

    switch (category) {
      case 'scanNext':
        userCache.set(user.id, {
          coordinates: cache.coordinates + coords.length,
          requests: cache.requests + 1,
        })
        console.log(
          `[scannerApi] Request to scan new location by ${user.username}${
            user.id ? ` (${user.id})` : ''
          } - type ${data.scanNextType}: ${data.scanLocation[0].toFixed(
            5,
          )},${data.scanLocation[1].toFixed(5)}`,
        )
        switch (config.scanner.backendConfig.platform) {
          case 'mad':
            Object.assign(payloadObj, {
              url: `${
                config.scanner.backendConfig.apiEndpoint
              }/send_gps?origin=${encodeURIComponent(
                config.scanner.scanNext.scanNextDevice,
              )}&coords=${JSON.stringify(coords)}&sleeptime=${
                config.scanner.scanNext.scanNextSleeptime
              }`,
              options: { method, headers },
            })
            break
          case 'rdm':
            Object.assign(payloadObj, {
              url: `${
                config.scanner.backendConfig.apiEndpoint
              }/set_data?scan_next=true&instance=${encodeURIComponent(
                config.scanner.scanNext.scanNextInstance,
              )}&coords=${JSON.stringify(coords)}`,
              options: { method, headers },
            })
            break
          case 'custom':
            Object.assign(payloadObj, {
              url: config.scanner.backendConfig.apiEndpoint,
              options: {
                method: 'POST',
                headers,
                body: coords
              },
            })
            break
          default:
            break
        }
        break
      case 'scanZone':
        userCache.set(user.id, {
          coordinates: cache.coordinates + coords.length,
          requests: cache.requests + 1,
        })
        console.log(
          `[scannerApi] Request to scan new zone by ${user.username}${
            user.id ? ` (${user.id})` : ''
          } - size ${data.scanZoneSize}: ${data.scanLocation[0].toFixed(
            5,
          )},${data.scanLocation[1].toFixed(5)}`,
        )
        switch (config.scanner.backendConfig.platform) {
          case 'custom':
            Object.assign(payloadObj, {
              url: config.scanner.backendConfig.apiEndpoint,
              options: {
                method: 'POST',
                headers,
                body: coords
              },
            });
            break;
          default:
            Object.assign(payloadObj, {
              url: `${config.scanner.backendConfig.apiEndpoint}/set_data?scan_next=true&instance=${encodeURIComponent(config.scanner.scanZone.scanZoneInstance)}&coords=${JSON.stringify(coords)}`,
              options: { method, headers },
            });
            break;
        }
        break
      case 'getQueue':
        if (
          scannerQueue[data.typeName].timestamp >
          Date.now() - config.scanner.backendConfig.queueRefreshInterval * 1000
        ) {
          console.log(
            `[scannerApi] Returning queue from memory for method ${
              data.typeName
            }: ${scannerQueue[data.typeName].queue}`,
          )
          return { status: 'ok', message: scannerQueue[data.typeName].queue }
        }
        console.log(`[scannerApi] Getting queue for method ${data.typeName}`)
        switch (config.scanner.backendConfig.platform) {
          case 'custom':
            Object.assign(payloadObj, {
              url: `${config.scanner.backendConfig.apiEndpoint}/queue`,
              options: { method, headers },
            });
            break;
          default:
            Object.assign(payloadObj, {
              url: `${config.scanner.backendConfig.apiEndpoint}/get_data?${data.type}=true&queue_size=true&instance=${encodeURIComponent(config.scanner[data.typeName][`${data.typeName}Instance`])}`,
              options: { method, headers },
            });
            break;
        }
        break
      default:
        console.warn('[scannerApi] Api call without category')
        break
    }

    if (
      (payloadObj.options.body && category === 'scanNext') ||
      category === 'scanZone'
    ) {
      Object.assign(payloadObj.options.headers, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      })
    }
    const scannerResponse = await fetch(payloadObj.url, payloadObj.options)

    if (!scannerResponse) {
      throw new Error('[scannerApi] No data returned from server')
    }

    if (scannerResponse.status === 200 && category === 'getQueue') {
      if (config.scanner.backendConfig.platform === 'custom') {
        const { data: queueData } = await scannerResponse.json()
        console.log(
          `[scannerApi] Returning received queue for method ${data.typeName}: ${queueData.queue}`,
        )
        scannerQueue[data.typeName] = {
          queue: queueData.queue,
          timestamp: Date.now(),
        }
        return { status: 'ok', message: queueData.queue }
      } else {
        const { data: queueData } = await scannerResponse.json()
        console.log(
          `[scannerApi] Returning received queue for method ${data.typeName}: ${queueData.size}`,
        )
        scannerQueue[data.typeName] = {
          queue: queueData.size,
          timestamp: Date.now(),
        }
        return { status: 'ok', message: queueData.size }
      }
    }

    if (Clients[user.rmStrategy]) {
      const capitalized = category.replace('scan', 'Scan ')
      const updatedCache = userCache.get(user.id)
      const trimmed = coords
        .filter((_c, i) => i < 25)
        .map((c) => `${c.lat}, ${c.lon}`)
        .join('\n')
      switch (user.strategy) {
        case 'discord':
          await Clients[user.rmStrategy].sendMessage(
            {
              embed: {
                title: `${capitalized} Request`,
                author: {
                  name: user.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`,
                },
                thumbnail: {
                  url:
                    config.authentication.strategies.find(
                      (strategy) => strategy.name === user.rmStrategy,
                    )?.thumbnailUrl ??
                    `https://user-images.githubusercontent.com/58572875/167069223-745a139d-f485-45e3-a25c-93ec4d09779c.png`,
                },
                timestamp: new Date(),
                description: `<@${user.discordId}>\n${capitalized} Size: ${
                  category === 'scanNext'
                    ? data.scanNextType
                    : data.scanZoneSize
                }\nCoordinates: ${coords.length}\n`,
                color:
                  category === 'scanNext'
                    ? config.map.theme.primary
                    : config.map.theme.secondary,
                fields: [
                  {
                    name: `User History`,
                    value: `Total Requests: ${updatedCache.requests}\nTotal Coordinates: ${updatedCache.coordinates}`,
                    inline: true,
                  },
                  {
                    name: 'Instance',
                    value: `${
                      config.scanner.backendConfig.platform === 'mad'
                        ? `Device: ${config.scanner.scanNext.scanNextDevice}`
                        : ''
                    }\nName: ${
                      config.scanner[category]?.[`${category}Instance`]
                    }\nQueue: ${scannerQueue[category]?.queue || 0}`,
                    inline: true,
                  },
                  {
                    name: `Coordinates (${coords.length})`,
                    value:
                      coords.length > 25
                        ? `${trimmed}\n...${coords.length - 25} more`
                        : trimmed,
                  },
                ],
              },
            },
            category,
          )
          break
        default:
      }
    }

    switch (scannerResponse.status) {
      case 200:
        console.log(
          `[scannerApi] Request from ${user.username || 'a visitor'}${
            user.id ? ` (${user.id})` : ''
          } successful`,
        )
        return { status: 'ok', message: 'scanner_ok' }
      case 401:
        console.log(
          '[scannerApi] Wrong credentials - check your scanner API settings in config',
        )
        return { status: 'error', message: 'scanner_wrong_credentials' }
      case 404:
        console.log(
          `[scannerApi] Error: instance ${
            config.scanner[category][`${category}Instance`]
          } does not exist`,
        )
        return { status: 'error', message: 'scanner_no_instance' }
      case 416:
        console.log(
          `[scannerApi] Error: instance ${
            config.scanner[category][`${category}Instance`]
          } has no device assigned`,
        )
        return { status: 'error', message: 'scanner_no_device_assigned' }
      case 500:
        console.log(
          `[scannerApi] Error: device ${
            config.scanner[category][`${category}Device`]
          } does not exist`,
        )
        return { status: 'error', message: 'scanner_no_device' }
      default:
        return { status: 'error', message: 'scanner_error' }
    }
  } catch (e) {
    if (e instanceof Error) {
      console.log(
        '[scannerApi] There was a problem processing that scanner request',
        e,
      )
    }
    return { status: 'error', message: 'scanner_error' }
  } finally {
    clearTimeout(timeout)
  }
}
