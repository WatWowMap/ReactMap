// @ts-check

const { fetchJson } = require('../utils/fetchJson')

/**
 * Photon (https://github.com/komoot/photon) speaks GeoJSON rather than
 * Nominatim's JSON, so it cannot be driven through node-geocoder's
 * `openstreetmap` provider. This module talks to it directly and returns
 * entries in the same shape that provider produces, so everything downstream
 * (`formatter`, the webhook resolvers) is unaware of which backend answered.
 */

/**
 * The Photon properties this module reads. Photon returns more; anything not
 * listed here has no consumer in ReactMap.
 * @typedef {object} PhotonProperties
 * @property {string} [name] The result's own label
 * @property {string} [housenumber]
 * @property {string} [street]
 * @property {string} [postcode]
 * @property {string} [city]
 * @property {string} [county]
 * @property {string} [state]
 * @property {string} [country]
 * @property {string} [countrycode] Upper-case, e.g. "US"
 * @property {string} [osm_key] OSM tag key, e.g. "place" or "highway"
 * @property {string} [osm_value] OSM tag value, e.g. "city"
 */

/**
 * @typedef {object} PhotonFeature
 * @property {{ coordinates?: number[] }} [geometry] GeoJSON order: [lon, lat]
 * @property {PhotonProperties} [properties]
 */

/** Results requested from Photon for a forward search. */
const SEARCH_LIMIT = 10

/**
 * Photon reports a result's own label only in `properties.name`, and uses the
 * hierarchy fields purely for what *contains* the result. Nominatim echoes the
 * name into the matching address field, so searching "Denver" yields a city of
 * Denver. These are the OSM classifications where that echo matters, because
 * they are the ones `_formatResult` reads.
 * @type {Record<string, 'city' | 'town' | 'village' | 'hamlet'>}
 */
const PLACE_SELF_REFERENCE = {
  city: 'city',
  town: 'town',
  village: 'village',
  hamlet: 'hamlet',
}

/**
 * @param {string} base
 * @param {string} path
 * @param {Record<string, string | number>} params
 */
function buildUrl(base, path, params) {
  // Trailing slashes are tolerated here, unlike node-geocoder's own
  // `osmServer + '/search'` concatenation.
  const url = new URL(`${base.replace(/\/+$/, '')}${path}`)
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, String(value)),
  )
  return url.toString()
}

/**
 * Joins address components the way Nominatim renders `display_name`: most
 * specific first, comma separated, skipping absent parts and never repeating a
 * component. A postcode search puts the same value in both the result name and
 * the postcode field, and Nominatim shows it once.
 * @param {(string | undefined)[]} parts
 */
function joinComponents(parts) {
  const seen = new Set()
  return parts
    .map((part) => (part || '').trim())
    .filter((part) => {
      if (!part || seen.has(part)) return false
      seen.add(part)
      return true
    })
    .join(', ')
}

/**
 * Blanks any component that reappears later in the hierarchy, keeping the
 * broader of the two. A city sharing its state's name (the Statue of Liberty
 * sits in city "New York", state "New York") should keep the state: dropping it
 * would strip the state out of a US address line entirely.
 * @param {(string | undefined)[]} parts
 */
function preferBroader(parts) {
  return parts.map((part, i) =>
    part && parts.slice(i + 1).includes(part) ? undefined : part,
  )
}

/**
 * @param {PhotonProperties} properties
 * @param {string} locality
 */
function buildFormattedAddress(properties, locality) {
  const street = joinComponents([properties.housenumber, properties.street])

  // The result's own name leads. When it was already echoed into a hierarchy
  // field, joinComponents drops the repeat rather than printing it twice.
  return joinComponents([
    properties.name,
    ...preferBroader([
      street,
      locality,
      properties.county,
      properties.state,
      properties.postcode,
      properties.country,
    ]),
  ])
}

/**
 * Maps one Photon feature onto the entry shape node-geocoder's `openstreetmap`
 * provider produces, including the three fields ReactMap patches on top of it.
 *
 * Returns null for a feature without usable coordinates: `parseFloat` of an
 * absent value is NaN, and a NaN marker is worse than a missing result.
 *
 * `suburb` and `neighbourhood` are always empty. Photon's nearest field is
 * `district`, which is a different OSM concept, and equating them would be an
 * invention rather than a translation.
 * @param {PhotonFeature} feature
 */
function formatPhotonFeature(feature) {
  const coordinates = feature?.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  // GeoJSON is [longitude, latitude]. Never the other way around.
  const [longitude, latitude] = coordinates
  // A well behaved Photon sends two numbers, but the length check alone would
  // pass [null, null] straight through to an entry with a null latitude. Check
  // the values, not just the shape.
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  const properties = feature.properties || {}

  const selfReferenced = PLACE_SELF_REFERENCE[properties.osm_value]
  const isPlace = properties.osm_key === 'place' && !!selfReferenced
  const named = (/** @type {string} */ field) =>
    isPlace && selfReferenced === field ? properties.name : undefined

  const city = properties.city || named('city')
  const town = named('town')
  const village = named('village')
  const locality = city || town || village || named('hamlet') || ''

  return {
    latitude,
    longitude,
    formattedAddress: buildFormattedAddress(properties, locality),
    country: properties.country,
    // Mirrors _formatResult's own city/town/village/hamlet fallback.
    city: locality || undefined,
    state: properties.state,
    zipcode: properties.postcode,
    streetName:
      properties.street ||
      (properties.osm_key === 'highway' ? properties.name : undefined),
    streetNumber: properties.housenumber,
    // Photon already sends this upper-case, which is what node-geocoder
    // produces after upper-casing Nominatim's lower-case value.
    countryCode: properties.countrycode,
    neighbourhood: '',
    suburb: '',
    town: town || '',
    village: village || '',
  }
}

/**
 * @param {string} photonUrl
 * @param {string | { lat: number, lon: number }} search
 * @param {boolean} isReverse
 */
async function photonGeocoder(photonUrl, search, isReverse) {
  const url =
    isReverse && typeof search === 'object'
      ? buildUrl(photonUrl, '/reverse', {
          lat: search.lat,
          lon: search.lon,
          limit: 1,
        })
      : buildUrl(photonUrl, '/api', {
          q: String(search),
          limit: SEARCH_LIMIT,
        })

  const response = await fetchJson(url)
  // fetchJson answers a failed request with the Response rather than throwing,
  // so an absent features array covers both a network failure and an empty
  // result set.
  const features = Array.isArray(response?.features) ? response.features : []

  return features.map(formatPhotonFeature).filter(Boolean)
}

module.exports = {
  photonGeocoder,
  // Exported for the tests, which check the mapping without a Photon instance.
  formatPhotonFeature,
  joinComponents,
  preferBroader,
}
