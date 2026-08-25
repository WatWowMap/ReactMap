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
 * The empty answer for a caller, in the shape its schema declares.
 *
 * Query.geocoder is [Geocoder] and Gym.formatted is String, so an object here
 * makes GraphQL discard the field with "Expected Iterable" or "String cannot
 * represent value" rather than degrading to an empty result.
 * @param {boolean} reverse
 */
function emptyResult(reverse) {
  return reverse ? '' : []
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
  // The 404 body is matched on Javalin's own documentation URL rather than on
  // the generic title/status pair, because that pair is RFC 7807's shape: a
  // rate-limiting proxy in front of a healthy Nominatim answers
  // {"title":"Too Many Requests","status":429}, and diagnosing that as "your
  // provider is wrong" would turn a transient failure into advice to break a
  // working configuration permanently.
  const isPhoton =
    raw.type === 'FeatureCollection' ||
    (typeof raw.type === 'string' && raw.type.includes('javalin.io')) ||
    (typeof raw.message === 'string' &&
      raw.message.includes('Unknown query parameter'))

  if (isPhoton) {
    throw new Error(
      `${url} answered as a Photon instance rather than a Nominatim one. Set "geocoderProvider": "photon" on this webhook, or point the URL at a Nominatim instance.`,
    )
  }

  // Anything else object-shaped that carries no Nominatim result fields is an
  // upstream error body, such as RFC 7807 problem JSON from a proxy in front
  // of Nominatim. node-geocoder has already mapped it onto one blank entry by
  // the time it gets here, and letting that through hands the caller a result
  // with null coordinates -- Location.jsx pans the map to it. Rejecting keeps
  // geocoder()'s fallback shape ([] or ''), and the message stays generic
  // because this is a failing upstream, not a misconfigured provider.
  // {"error": ...} bodies never reach this: node-geocoder converts those to a
  // thrown Error itself. A genuine /reverse result always carries lat,
  // display_name and address (all 42 captured fixtures do).
  const isNominatimResult =
    'lat' in raw ||
    'display_name' in raw ||
    'address' in raw ||
    'place_id' in raw
  if (!isNominatimResult) {
    throw new Error(
      `${url} answered with an error body instead of a geocoding result: ${JSON.stringify(raw).slice(0, 200)}`,
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
      //
      // quarter is the fallback because Nominatim reports neighbourhood-level
      // data under that key for many places: 1521 N Hoyne Ave carries
      // quarter "Wicker Park" and no neighbourhood at all, and node-geocoder
      // only reads address.neighbourhood, leaving the pair empty.
      neighbourhood: formatted.neighbourhood || result.address?.quarter || '',
      neighborhood: formatted.neighbourhood || result.address?.quarter || '',
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
    //
    // The null check is load-bearing: typeof null is 'object', so a null search
    // would otherwise be taken for a coordinate pair and sent to /reverse with
    // no lat or lon at all.
    const isReverse = typeof search === 'object' && search !== null

    // Clearing the search box sends an empty string, and there is nothing to
    // look up. Photon rejects it outright with
    // {"message":"q parameter is required when no include categories are
    // specified"} and a 400, which now surfaces as an error and fills the log
    // with failures caused by a user deleting their own input. Answering
    // directly costs nothing and keeps a blank box quiet.
    if (!isReverse && !String(search ?? '').trim()) {
      return emptyResult(reverse)
    }

    const results =
      provider === 'photon'
        ? await photonGeocoder(nominatimUrl, search, isReverse)
        : await nominatimGeocoder(nominatimUrl, search, isReverse)
    return reverse
      ? formatter(format, results[0])
      : format
        ? // The mapped fields ride along rather than being rebuilt, because the
          // Geocoder GraphQL type resolves neighborhood, suburb and the rest
          // straight off this object. Returning only the formatted triple made
          // every other field null whenever an addressFormat was configured.
          results.map((result) => ({
            ...result,
            formatted: formatter(format, result),
          }))
        : results
  } catch (e) {
    log.warn(TAGS.geocoder, 'Unable to geocode for', search, e)
    return emptyResult(reverse)
  }
}

module.exports = { geocoder, formatter, nominatimGeocoder }
