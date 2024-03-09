const NodeGeocoder = require('node-geocoder')
const { log, HELPERS } = require('@rm/logger')

/**
 * @param {string} addressFormat
 * @param {NodeGeocoder.Entry} result
 */
function formatter(addressFormat, result) {
  return addressFormat
    .replace(
      /{{(streetNumber|streetName|city|state|country|zipcode|latitude|longitude|countryCode|neighborhoods|suburb|town|village)}}/g,
      (a, b) => result[b] || '',
    )
    .trim()
    .replace(/^,|,$/g, '')
    .trim()
}

/**
 * @template {boolean} T
 * @param {string} nominatimUrl
 * @param {T extends true ? { lat: number, lon: number } : string} search
 * @param {T} reverse
 * @param {string} format
 * @returns
 */
async function geocoder(nominatimUrl, search, reverse, format) {
  try {
    if (!nominatimUrl) {
      throw new Error('Nominatim url not provided')
    }
    const stockGeocoder = NodeGeocoder({
      provider: 'openstreetmap',
      osmServer: nominatimUrl,
      timeout: 5000,
    })
    stockGeocoder._geocoder._formatResult = ((original) => (result) => ({
      ...original(result),
      suburb: result.address.suburb || '',
      town: result.address.town || '',
      village: result.address.village || '',
    }))(stockGeocoder._geocoder._formatResult)
    const results =
      typeof search === 'object'
        ? await stockGeocoder.reverse(search)
        : await stockGeocoder.geocode(search)
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
    log.warn(HELPERS.geocoder, 'Unable to geocode for', search, e)
    return {}
  }
}

module.exports = { geocoder, formatter }
