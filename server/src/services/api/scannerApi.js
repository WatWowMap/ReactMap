/* eslint-disable no-console */
const config = require('../config')
const fetchJson = require('./fetchJson')

module.exports = async function scannerApi(category, method, data = null) {
  try {
    const headers = {}
    switch (config.scanner.backendConfig.platform) {
      case 'rdm': Object.assign(headers, { Authorization: `Basic ${Buffer.from(`${config.scanner.backendConfig.apiUsername}:${config.scanner.backendConfig.apiPassword}`).toString('base64')}` }); break
      default: break
    }
    const payloadObj = {}
    switch (category) {
      case 'scanNext': {
        console.log(`[scannerApi] Request to scan new location by ${data.username}${data.userId ? ` (${data.userId})` : ''} - type ${data.scanNextType}: ${data.scanNextLocation[0].toFixed(5)},${data.scanNextLocation[1].toFixed(5)}`)
        const coords = JSON.stringify(data.scanNextCoords.map(coord => (
          { lat: parseFloat(coord[0].toFixed(5)), lon: parseFloat(coord[1].toFixed(5)) })))
        Object.assign(payloadObj, {
          url: `${config.scanner.backendConfig.apiEndpoint}/set_data?scan_next=true&instance_name=${encodeURIComponent(config.scanner.scanNext.scanNextInstance)}&coords=${coords}`,
          options: { method, headers },
        })
      } break
      default:
        console.warn('[scannerApi] Api call without category'); break
    }

    if (payloadObj.options.body) {
      Object.assign(payloadObj.options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
    }
    const post = await fetchJson(payloadObj.url, payloadObj.options, config.devOptions.enabled)

    if (!post) {
      throw new Error('[scannerApi] No data returned from server')
    }

    if (post.status === 'ok') {
      console.log(`[scannerApi] Request from ${data.username}${data.userId ? ` (${data.userId})` : ''} successful`)
    }
    return post
  } catch (e) {
    console.log('[scannerApi] There was a problem processing that scanner request')
    return { status: 'error', message: 'scanner_error' }
  }
}
