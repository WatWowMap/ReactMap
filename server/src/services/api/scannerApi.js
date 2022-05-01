/* eslint-disable no-console */
const fetch = require('node-fetch')
const { AbortError } = require('node-fetch')

const config = require('../config')

const scannerQueue = {
  scanNext: {},
  scanZone: {},
}

module.exports = async function scannerApi(category, method, data = null) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.api.fetchTimeoutMs)

  try {
    const headers = {}
    switch (config.scanner.backendConfig.platform) {
      case 'mad':
      case 'rdm': Object.assign(headers, { Authorization: `Basic ${Buffer.from(`${config.scanner.backendConfig.apiUsername}:${config.scanner.backendConfig.apiPassword}`).toString('base64')}` }); break
      default: break
    }
    const payloadObj = {}
    switch (category) {
      case 'scanNext': {
        console.log(`[scannerApi] Request to scan new location by ${data.username}${data.userId ? ` (${data.userId})` : ''} - type ${data.scanNextType}: ${data.scanNextLocation[0].toFixed(5)},${data.scanNextLocation[1].toFixed(5)}`)
        const coords = config.scanner.backendConfig.platform === 'mad' ? `${parseFloat(data.scanNextCoords[0][0].toFixed(5))},${parseFloat(data.scanNextCoords[0][1].toFixed(5))}`
          : JSON.stringify(data.scanNextCoords.map(coord => (
            { lat: parseFloat(coord[0].toFixed(5)), lon: parseFloat(coord[1].toFixed(5)) })))
        Object.assign(payloadObj, {
          url: config.scanner.backendConfig.platform === 'mad' ? `${config.scanner.backendConfig.apiEndpoint}/send_gps?origin=${encodeURIComponent(config.scanner.scanNext.scanNextDevice)}&coords=${coords}&sleeptime=${config.scanner.scanNext.scanNextSleeptime}`
            : `${config.scanner.backendConfig.apiEndpoint}/set_data?scan_next=true&instance=${encodeURIComponent(config.scanner.scanNext.scanNextInstance)}&coords=${coords}`,
          options: { method, headers },
        })
      } break
      case 'scanZone': {
        console.log(`[scannerApi] Request to scan new zone by ${data.username}${data.userId ? ` (${data.userId})` : ''} - size ${data.scanZoneSize}: ${data.scanZoneLocation[0].toFixed(5)},${data.scanZoneLocation[1].toFixed(5)}`)
        const coords = JSON.stringify(data.scanZoneCoords.map(coord => (
          { lat: parseFloat(coord[0].toFixed(5)), lon: parseFloat(coord[1].toFixed(5)) })))
        Object.assign(payloadObj, {
          url: `${config.scanner.backendConfig.apiEndpoint}/set_data?scan_next=true&instance=${encodeURIComponent(config.scanner.scanZone.scanZoneInstance)}&coords=${coords}`,
          options: { method, headers },
        })
      } break
      case 'getQueue':
        if (scannerQueue[data.typeName].timestamp
          > (Date.now() - config.scanner.backendConfig.queueRefreshInterval * 1000)) {
          console.log(`[scannerApi] Returning queue from memory for method ${data.typeName}: ${scannerQueue[data.typeName].queue}`)
          return { status: 'ok', message: scannerQueue[data.typeName].queue }
        }
        console.log(`[scannerApi] Getting queue for method ${data.typeName}`)
        Object.assign(payloadObj, {
          url: `${config.scanner.backendConfig.apiEndpoint}/get_data?${data.type}=true&queue_size=true&instance=${encodeURIComponent(config.scanner[data.typeName][`${data.typeName}Instance`])}`,
          options: { method, headers },
        }); break
      default:
        console.warn('[scannerApi] Api call without category'); break
    }

    if (payloadObj.options.body) {
      Object.assign(payloadObj.options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
    }
    const scannerResponse = await fetch(payloadObj.url, payloadObj.options)

    if (!scannerResponse) {
      throw new Error('[scannerApi] No data returned from server')
    }

    if (scannerResponse.status === 200 && category === 'getQueue') {
      const { data: queueData } = await scannerResponse.json()
      console.log(`[scannerApi] Returning received queue for method ${data.typeName}: ${queueData.size}`)
      scannerQueue[data.typeName] = { queue: queueData.size, timestamp: Date.now() }
      return { status: 'ok', message: queueData.size }
    }

    switch (scannerResponse.status) {
      case 200:
        console.log(`[scannerApi] Request from ${data.username}${data.userId ? ` (${data.userId})` : ''} successful`)
        return { status: 'ok', message: 'scanner_ok' }
      case 401:
        console.log('[scannerApi] Wrong credentials - check your scanner API settings in config')
        return { status: 'error', message: 'scanner_wrong_credentials' }
      case 404:
        console.log(`[scannerApi] Error: instance ${config.scanner[category][`${category}Instance`]} does not exist`)
        return { status: 'error', message: 'scanner_no_instance' }
      case 416:
        console.log(`[scannerApi] Error: instance ${config.scanner[category][`${category}Instance`]} has no device assigned`)
        return { status: 'error', message: 'scanner_no_device_assigned' }
      case 500:
        console.log(`[scannerApi] Error: device ${config.scanner[category][`${category}Device`]} does not exist`)
        return { status: 'error', message: 'scanner_no_device' }
      default:
        return { status: 'error', message: 'scanner_error' }
    }
  } catch (e) {
    if (e instanceof AbortError) {
      console.log('Request to the scanner timed out and was aborted')
    } else {
      console.log('[scannerApi] There was a problem processing that scanner request')
    }
    return { status: 'error', message: 'scanner_error' }
  } finally {
    clearTimeout(timeout)
  }
}
