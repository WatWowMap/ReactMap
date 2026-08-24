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
      /{{(streetNumber|streetName|city|state|country|zipcode|latitude|longitude|countryCode|neighborhoods|neighborhood|neighbourhood|suburb|town|village)}}/g,
      (a, b) => result[b] || '',
    )
    .trim()
    .replace(/^,|,$/g, '')
    .trim()
}

/**
 * Fails loudly when the configured URL answered with something that is not a
 * Nominatim response.
 *
 * node-geocoder decides how to read a body by its shape: an array is treated as
 * a result list, and anything else is treated as a single result. Photon
 * answers with a GeoJSON object, so the whole FeatureCollection gets handed to
 * _formatResult as though it were one place. Nothing throws, because
 * node-geocoder guards the address lookup, so the caller silently receives one
 * entry with every field undefined.
 *
 * That is a misconfiguration rather than a geocoding failure, and it is
 * invisible in the results, so it is worth an error naming the fix.
 * @param {any} results
 * @param {string} url
 */
function assertNominatimResponse(results, url) {
  const raw = results?.raw
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return

  // Photon rarely gets far enough to answer with GeoJSON here, because
  // node-geocoder asks for routes and parameters it does not serve. Verified
  // against a live instance:
  //
  //   GET /search?q=..&format=json&addressdetails=1
  //     404 {"title":"Endpoint GET /search not found","status":404,...}
  //     Photon serves /api, not /search.
  //
  //   GET /reverse?lat=..&lon=..&format=json&addressdetails=1
  //     400 {"message":"Unknown query parameter 'format'. Allowed parameters
  //          are: [include, debug, dedupe, ...]"}
  //     Photon rejects anything outside its allow list, and format and
  //     addressdetails are forced onto every request by node-geocoder.
  //
  // node-geocoder ignores the status and parses the body regardless, so both
  // arrive here as an object with no address and format into a blank result.
  const isPhoton =
    raw.type === 'FeatureCollection' ||
    (typeof raw.title === 'string' && typeof raw.status === 'number') ||
    (typeof raw.message === 'string' &&
      raw.message.includes('Unknown query parameter'))

  if (isPhoton) {
    throw new Error(
      `${url} answered as a Photon instance rather than a Nominatim one. Set "geocoderProvider": "photon" on this webhook, or point the URL at a Nominatim instance.`,
    )
  }
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
  stockGeocoder._geocoder._formatResult = ((original) => (result) => {
    const formatted = original(result)
    return {
      ...formatted,
      suburb: result.address?.suburb || '',
      town: result.address?.town || '',
      village: result.address?.village || '',
      // node-geocoder emits the British spelling. The GraphQL schema exposes
      // `neighborhood` and formatter() templates on `neighborhoods`, so the
      // value reached neither consumer. Carrying the alias is what makes it
      // visible without changing what node-geocoder itself produces.
      neighborhood: formatted.neighbourhood || '',
    }
  })(stockGeocoder._geocoder._formatResult)
  // Awaited rather than returned so the shape check runs here. A throw inside
  // _formatResult would not reach geocoder()'s catch at all: node-geocoder
  // resolves through bluebird's asCallback, so it surfaces as an uncaught
  // exception and takes the process down. Anything thrown from this function
  // rejects normally and is caught.
  const results = await (isReverse && typeof search === 'object'
    ? stockGeocoder.reverse(search)
    : stockGeocoder.geocode(String(search)))
  assertNominatimResponse(results, url)
  return results
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
    // The fallback has to match the shape the caller's schema expects.
    // Query.geocoder is [Geocoder] and Gym.formatted is String, so returning {}
    // made GraphQL discard the field with "Expected Iterable" or "String cannot
    // represent value" rather than degrading to an empty answer. The failure is
    // still reported: it is logged immediately above.
    return reverse ? '' : []
  }
}

module.exports = { geocoder, formatter, nominatimGeocoder }
