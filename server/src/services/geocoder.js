const NodeGeocoder = require('node-geocoder')
const { log, HELPERS } = require('./logger')

module.exports = async function geocoder(nominatimUrl, search, reverse) {
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
    const results = reverse
      ? await stockGeocoder.reverse(search)
      : await stockGeocoder.geocode(search)
    return reverse ? results[0] : results
  } catch (e) {
    log.warn(HELPERS.geocoder, 'Unable to geocode for', search, e)
    return {}
  }
}
