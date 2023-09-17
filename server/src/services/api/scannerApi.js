/* eslint-disable no-nested-ternary */
const { default: fetch } = require('node-fetch')
const NodeCache = require('node-cache')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const Clients = require('../Clients')

const scannerQueue = {
  scanNext: {},
  scanZone: {},
}

const userCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

async function scannerApi(
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
      ? data.scanCoords?.map((coord) => [
          parseFloat(coord[0].toFixed(5)),
          parseFloat(coord[1].toFixed(5)),
        ]) || []
      : data.scanCoords?.map((coord) => ({
          lat: parseFloat(coord[0].toFixed(5)),
          lon: parseFloat(coord[1].toFixed(5)),
        })) || []

  try {
    const headers = Object.fromEntries(config.scanner.backendConfig.headers)
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
        if (
          config.scanner.backendConfig.apiUsername ||
          config.scanner.backendConfig.apiPassword
        ) {
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
        log.info(
          HELPERS.scanner,
          `Request to scan new location by ${user.username}${
            user.id ? ` (${user.id})` : ''
          } - type ${data.scanSize}: ${data.scanLocation[0].toFixed(
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
                body: JSON.stringify(coords),
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
        log.info(
          HELPERS.scanner,
          `Request to scan new zone by ${user.username}${
            user.id ? ` (${user.id})` : ''
          } - size ${data.scanSize}: ${data.scanLocation[0].toFixed(
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
                body: JSON.stringify(coords),
              },
            })
            break
          default:
            Object.assign(payloadObj, {
              url: `${
                config.scanner.backendConfig.apiEndpoint
              }/set_data?scan_next=true&instance=${encodeURIComponent(
                config.scanner.scanZone.scanZoneInstance,
              )}&coords=${JSON.stringify(coords)}`,
              options: { method, headers },
            })
            break
        }
        break
      case 'getQueue':
        if (
          scannerQueue[data.typeName].timestamp >
          Date.now() - config.scanner.backendConfig.queueRefreshInterval * 1000
        ) {
          log.info(
            HELPERS.scanner,
            `Returning queue from memory for method ${data.typeName}: ${
              scannerQueue[data.typeName].queue
            }`,
          )
          return { status: 'ok', message: scannerQueue[data.typeName].queue }
        }
        log.info(HELPERS.scanner, `Getting queue for method ${data.typeName}`)
        switch (config.scanner.backendConfig.platform) {
          case 'custom':
            Object.assign(payloadObj, {
              url: `${config.scanner.backendConfig.apiEndpoint}/queue`,
              options: { method, headers },
            })
            break
          default:
            Object.assign(payloadObj, {
              url: `${config.scanner.backendConfig.apiEndpoint}/get_data?${
                data.type
              }=true&queue_size=true&instance=${encodeURIComponent(
                config.scanner[data.typeName][`${data.typeName}Instance`],
              )}`,
              options: { method, headers },
            })
            break
        }
        break
      default:
        log.warn(HELPERS.scanner, 'Api call without category')
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
    const scannerResponse = await fetch(payloadObj.url, {
      ...payloadObj.options,
      signal: controller.signal,
    })

    if (!scannerResponse) {
      throw new Error('No data returned from server')
    }

    if (
      (scannerResponse.status === 200 || scannerResponse.status === 201) &&
      category === 'getQueue'
    ) {
      if (config.scanner.backendConfig.platform === 'custom') {
        const { queue } = await scannerResponse.json()
        log.info(
          HELPERS.scanner,
          `Returning received queue for method ${data.typeName}: ${queue}`,
        )
        scannerQueue[data.typeName] = {
          queue,
          timestamp: Date.now(),
        }
        return { status: 'ok', message: queue }
      }
      const { data: queueData } = await scannerResponse.json()
      log.info(
        HELPERS.scanner,
        `Returning received queue for method ${data.typeName}: ${queueData.size}`,
      )
      scannerQueue[data.typeName] = {
        queue: queueData.size,
        timestamp: Date.now(),
      }
      return { status: 'ok', message: queueData.size }
    }

    if (
      Clients[user.rmStrategy]?.sendMessage &&
      config.scanner.backendConfig.sendDiscordMessage
    ) {
      const capitalized = category.replace('scan', 'Scan ')
      const updatedCache = userCache.get(user.id)
      const trimmed = coords
        .filter((_c, i) => i < 25)
        .map((c) =>
          config.scanner.backendConfig.platform === 'custom'
            ? `${c[0]}, ${c[1]}`
            : `${c.lat}, ${c.lon}`,
        )
        .join('\n')
      switch (user.strategy) {
        case 'discord':
          Clients[user.rmStrategy].sendMessage(
            {
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
              description: `<@${user.discordId}>\n${capitalized} Size: ${data.scanSize}\nCoordinates: ${coords.length}\n`,
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
                    config.scanner[category]?.[`${category}Instance`] || '-'
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
            category,
          )
          break
        default:
      }
    }

    switch (scannerResponse.status) {
      case 200:
      case 201:
        log.info(
          HELPERS.scanner,
          `Request from ${user.username || 'a visitor'}${
            user.id ? ` (${user.id})` : ''
          } successful`,
        )
        return { status: 'ok', message: 'scanner_ok' }
      case 401:
        log.info(
          HELPERS.scanner,
          'Wrong credentials - check your scanner API settings in config',
        )
        return { status: 'error', message: 'scanner_wrong_credentials' }
      case 404:
        log.info(
          HELPERS.scanner,
          `Error: instance ${
            config.scanner[category][`${category}Instance`]
          } does not exist`,
        )
        return { status: 'error', message: 'scanner_no_instance' }
      case 416:
        log.info(
          HELPERS.scanner,
          `Error: instance ${
            config.scanner[category][`${category}Instance`]
          } has no device assigned`,
        )
        return { status: 'error', message: 'scanner_no_device_assigned' }
      case 500:
        log.info(
          HELPERS.scanner,
          `Error: device ${
            config.scanner[category][`${category}Device`]
          } does not exist`,
        )
        return { status: 'error', message: 'scanner_no_device' }
      default:
        return { status: 'error', message: 'scanner_error' }
    }
  } catch (e) {
    if (e instanceof Error) {
      log.error(
        HELPERS.scanner,
        'There was a problem processing that scanner request',
        e,
      )
    }
    return { status: 'error', message: 'scanner_error' }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = scannerApi
