// @ts-check

const NodeGeocoder = require('node-geocoder')
const { log, TAGS } = require('@rm/logger')

const { photonGeocoder } = require('./photonGeocoder')

/**
 * @param {string} addressFormat
 * @param {NodeGeocoder.Entry} result
 */
function formatter(addressFormat, result) {
  return addressFormat
    .replace(
      /{{(streetNumber|streetName|city|state|country|zipcode|latitude|longitude|countryCode|neighborhoods|suburb|town|village)}}/g,
      (_a, b) => result[b] || '',
    )
    .trim()
    .replace(/^,|,$/g, '')
    .trim()
}

/**
 * Nominatim, via node-geocoder's `openstreetmap` provider.
 * @param {string} url
 * @param {string | { lat: number, lon: number }} search
 * @param {boolean} isReverse
 */
async function nominatimGeocoder(url, search, isReverse) {
  const stockGeocoder = NodeGeocoder({
    provider: 'openstreetmap',
    osmServer: url,
    timeout: 5000,
  })
  stockGeocoder._geocoder._formatResult = ((original) => (result) => ({
    ...original(result),
    suburb: result.address.suburb || '',
    town: result.address.town || '',
    village: result.address.village || '',
  }))(stockGeocoder._geocoder._formatResult)
  return isReverse && typeof search === 'object'
    ? stockGeocoder.reverse(search)
    : stockGeocoder.geocode(String(search))
}

/**
 * @template {boolean} T
 * @param {string} nominatimUrl Base URL of the geocoding backend
 * @param {T extends true ? { lat: number, lon: number } : string} search
 * @param {T} reverse
 * @param {string} format
 * @param {'nominatim' | 'photon'} [provider] Defaults to nominatim
 * @returns
 */
async function geocoder(nominatimUrl, search, reverse, format, provider) {
  try {
    if (!nominatimUrl) {
      throw new Error('Geocoder url not provided')
    }
    // A coordinate pair means a reverse lookup. `reverse` separately controls
    // whether a single formatted string comes back, so the two are not
    // interchangeable.
    const isReverse = typeof search === 'object'
    const results =
      provider === 'photon'
        ? await photonGeocoder(nominatimUrl, search, isReverse)
        : await nominatimGeocoder(nominatimUrl, search, isReverse)
    return reverse
      ? formatter(format, results[0])
      : format
        ? results.map((result) => ({
            formatted: formatter(format, result),
            latitude: result.latitude,
            longitude: result.longitude,
          }))
        : results
  } catch (e) {
    log.warn(TAGS.geocoder, 'Unable to geocode for', search, e)
    return {}
  }
}

module.exports = { geocoder, formatter }
