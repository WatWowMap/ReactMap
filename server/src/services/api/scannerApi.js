// @ts-check
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const { userCache } = require('../initialization')
const Clients = require('../Clients')
const TelegramClient = require('../TelegramClient')
const DiscordClient = require('../DiscordClient')

const scannerQueue = {
  scanNext: {},
  scanZone: {},
}

const { backendConfig, ...scanModes } = config.getSafe('scanner')

const scanNextOptions = {
  routes: config.getSafe('scanner.scanNext.routes'),
  showcases: config.getSafe('scanner.scanNext.showcases'),
  pokemon: config.getSafe('scanner.scanNext.pokemon'),
  gmf: config.getSafe('scanner.scanNext.gmf'),
}

const scanZoneOptions = {
  routes: config.getSafe('scanner.scanZone.routes'),
  showcases: config.getSafe('scanner.scanZone.showcases'),
  pokemon: config.getSafe('scanner.scanZone.pokemon'),
  gmf: config.getSafe('scanner.scanZone.gmf'),
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'medium',
})

/**
 *
 * @param {import('packages/types/lib').ScanOnDemandReq['category']} category
 * @param {import('packages/types/lib').ScanOnDemandReq['method']} method
 * @param {import('packages/types/lib').ScanOnDemandReq['data']} data
 * @param {Partial<import('@rm/types').ExpressUser>} user
 * @returns
 */
async function scannerApi(
  category,
  method,
  data = null,
  user = { id: 0, username: 'a visitor' },
) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.getSafe('api.fetchTimeoutMs'))

  const coords =
    backendConfig.platform === 'mad'
      ? [
          parseFloat(data.scanCoords[0][0].toFixed(5)),
          parseFloat(data.scanCoords[0][1].toFixed(5)),
        ]
      : backendConfig.platform === 'dragonite' ||
        backendConfig.platform === 'custom'
      ? data.scanCoords?.map((coord) => [
          parseFloat(coord[0].toFixed(5)),
          parseFloat(coord[1].toFixed(5)),
        ]) || []
      : data.scanCoords?.map((coord) => ({
          lat: parseFloat(coord[0].toFixed(5)),
          lon: parseFloat(coord[1].toFixed(5)),
        })) || []

  try {
    const headers = Object.fromEntries(
      backendConfig.headers.map((header) => [
        typeof header === 'string' ? header : header.key || header.name,
        typeof header === 'string' ? header : header.value,
      ]),
    )
    switch (backendConfig.platform) {
      case 'mad':
      case 'rdm':
        Object.assign(headers, {
          Authorization: `Basic ${Buffer.from(
            `${backendConfig.apiUsername}:${backendConfig.apiPassword}`,
          ).toString('base64')}`,
        })
        break
      case 'dragonite':
      case 'custom':
        if (backendConfig.apiUsername || backendConfig.apiPassword) {
          Object.assign(headers, {
            Authorization: `Basic ${Buffer.from(
              `${backendConfig.apiUsername}:${backendConfig.apiPassword}`,
            ).toString('base64')}`,
          })
        }
        break
      default:
        break
    }
    const payloadObj =
      /** @type {{ url: string, options: import('node-fetch').RequestInit }} */ ({
        url: '',
        options: {},
      })
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
        switch (backendConfig.platform) {
          case 'mad':
            Object.assign(payloadObj, {
              url: `${
                backendConfig.apiEndpoint
              }/send_gps?origin=${encodeURIComponent(
                scanModes.scanNext.scanNextDevice,
              )}&coords=${JSON.stringify(coords)}&sleeptime=${
                scanModes.scanNext.scanNextSleeptime
              }`,
              options: { method, headers },
            })
            break
          case 'rdm':
            Object.assign(payloadObj, {
              url: `${
                backendConfig.apiEndpoint
              }/set_data?scan_next=true&instance=${encodeURIComponent(
                scanModes.scanNext.scanNextInstance,
              )}&coords=${JSON.stringify(coords)}`,
              options: { method, headers },
            })
            break
          case 'dragonite':
            Object.assign(payloadObj, {
              url: `${backendConfig.apiEndpoint}/v2`,
              options: {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  username: user.username,
                  locations: coords,
                  options: scanNextOptions,
                }),
              },
            })
            break
          case 'custom':
            Object.assign(payloadObj, {
              url: backendConfig.apiEndpoint,
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
        switch (backendConfig.platform) {
          case 'dragonite':
            Object.assign(payloadObj, {
              url: `${backendConfig.apiEndpoint}/v2`,
              options: {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  username: user.username,
                  locations: coords,
                  options: scanZoneOptions,
                }),
              },
            })
            break
          case 'custom':
            Object.assign(payloadObj, {
              url: backendConfig.apiEndpoint,
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
                backendConfig.apiEndpoint
              }/set_data?scan_next=true&instance=${encodeURIComponent(
                scanModes.scanZone.scanZoneInstance,
              )}&coords=${JSON.stringify(coords)}`,
              options: { method, headers },
            })
            break
        }
        break
      case 'getQueue':
        if (
          scannerQueue[data.typeName].timestamp >
          Date.now() - backendConfig.queueRefreshInterval * 1000
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
        switch (backendConfig.platform) {
          case 'dragonite':
          case 'custom':
            Object.assign(payloadObj, {
              url: `${backendConfig.apiEndpoint}/queue`,
              options: { method, headers },
            })
            break
          default:
            Object.assign(payloadObj, {
              url: `${backendConfig.apiEndpoint}/get_data?${
                data.type
              }=true&queue_size=true&instance=${encodeURIComponent(
                scanModes[data.typeName][`${data.typeName}Instance`],
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
    const scannerResponse = await fetch(
      `${payloadObj.url}${payloadObj.url.includes('?') ? '&' : '?'}username=${
        user.username || user.id || 'a visitor'
      }`,
      {
        ...payloadObj.options,
        signal: controller.signal,
      },
    )

    if (!scannerResponse) {
      throw new Error('No data returned from server')
    }

    if (
      (scannerResponse.status === 200 || scannerResponse.status === 201) &&
      category === 'getQueue'
    ) {
      if (
        backendConfig.platform === 'dragonite' ||
        backendConfig.platform === 'custom'
      ) {
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

    if (backendConfig.sendTelegramMessage || backendConfig.sendDiscordMessage) {
      const capitalized = category.replace('scan', 'Scan ')
      const updatedCache = userCache.get(user.id)
      const trimmed = coords
        .filter((_c, i) => i < 25)
        .map((c) =>
          backendConfig.platform === 'dragonite' ||
          backendConfig.platform === 'custom'
            ? `${c[0]}, ${c[1]}`
            : typeof c === 'object'
            ? `${'lat' in c && c.lat}, ${'lon' in c && c.lon}`
            : c,
        )
        .join('\n')
      const client = Clients[user.rmStrategy]
      if (
        client instanceof TelegramClient &&
        backendConfig.sendTelegramMessage
      ) {
        client.sendMessage(
          `<b>${capitalized} Request</b>\nSize: ${
            data.scanSize
          }\nCoordinates: ${coords.length}\nCenter: ${data.scanLocation
            ?.map((c) => c.toFixed(5))
            .join(', ')}\n\n<b>User History</b>\nUsername: ${
            user.username || user.telegramId
          }\nTotal Requests: ${
            updatedCache?.requests || 0
          }\nTotal Coordinates: ${
            updatedCache?.coordinates || 0
          }\n\n${dateFormat.format(Date.now())}`,
          category === 'getQueue' ? 'main' : category,
        )
      } else if (
        client instanceof DiscordClient &&
        backendConfig.sendDiscordMessage
      ) {
        client.sendMessage(
          {
            title: `${capitalized} Request`,
            author: {
              name: user.username,
              icon_url: `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`,
            },
            thumbnail: {
              url:
                config
                  .getSafe('authentication.strategies')
                  .find((strategy) => strategy.name === user.rmStrategy)
                  ?.thumbnailUrl ??
                `https://user-images.githubusercontent.com/58572875/167069223-745a139d-f485-45e3-a25c-93ec4d09779c.png`,
            },
            description: `<@${user.discordId}>\n${capitalized} Size: ${data.scanSize}\nCoordinates: ${coords.length}\n`,
            fields: [
              {
                name: `User History`,
                value: `Total Requests: ${
                  updatedCache?.requests || 0
                }\nTotal Coordinates: ${updatedCache?.coordinates || 0}`,
                inline: true,
              },
              {
                name: 'Instance',
                value: `${
                  backendConfig.platform === 'mad'
                    ? `Device: ${scanModes.scanNext.scanNextDevice}`
                    : ''
                }\nName: ${
                  scanModes[category]?.[`${category}Instance`] || '-'
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
          category === 'getQueue' ? 'main' : category,
        )
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
            scanModes[category]?.[`${category}Instance`]
          } does not exist`,
        )
        return { status: 'error', message: 'scanner_no_instance' }
      case 416:
        log.info(
          HELPERS.scanner,
          `Error: instance ${
            scanModes[category]?.[`${category}Instance`]
          } has no device assigned`,
        )
        return { status: 'error', message: 'scanner_no_device_assigned' }
      case 500:
        log.info(
          HELPERS.scanner,
          `Error: device ${
            scanModes[category]?.[`${category}Device`]
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
