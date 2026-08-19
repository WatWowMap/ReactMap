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
 * @property {string} [locality] A settlement below Photon's city layer, such
 *   as the hamlet a rural address sits in. Present when `city` is not.
 * @property {string} [county]
 * @property {string} [state]
 * @property {string} [country]
 * @property {string} [countrycode] Upper-case, e.g. "US"
 * @property {string} [osm_key] OSM tag key, e.g. "place" or "highway"
 * @property {string} [osm_value] OSM tag value, e.g. "city"
 * @property {string} [type] The layer the result itself occupies: one of
 *   house, street, locality, district, city, county, state, country, other
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
const SETTLEMENT_OSM_VALUES = new Set(['city', 'town', 'village', 'hamlet'])

/**
 * The Photon property a result's own name belongs in, keyed by the layer Photon
 * reports in `properties.type`.
 *
 * `house` is absent on purpose: a building or POI name has no hierarchy field
 * to occupy, matching Nominatim filing it under a key node-geocoder ignores.
 */
const TYPE_TO_PROPERTY = {
  country: 'country',
  state: 'state',
  county: 'county',
  city: 'city',
  locality: 'locality',
  street: 'street',
}

/**
 * Fills the result's own name into the hierarchy field that describes it.
 *
 * Photon omits the result's own level from its containing hierarchy: a search
 * for Illinois comes back with the name in `properties.name` and no `state`.
 * Nominatim echoes it, and everything downstream reads the hierarchy fields, so
 * the name has to be placed or the level goes missing from both the entry and
 * the formatted address.
 *
 * `properties.type` is the authority rather than the OSM tags, because a city,
 * state or country is usually an administrative boundary in OSM and arrives as
 * osm_key=boundary, osm_value=administrative. Gating on osm_key=place would
 * miss the common case and keep only the exception.
 *
 * A value Photon already supplied always wins.
 * @param {PhotonProperties} properties
 */
function resolveSelfReference(properties) {
  const property = TYPE_TO_PROPERTY[properties.type]
  if (!properties.name || !property || properties[property]) return properties
  return { ...properties, [property]: properties.name }
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
 * @param {string} settlement The resolved city, town, village, hamlet or locality
 */
function buildFormattedAddress(properties, settlement) {
  const street = joinComponents([properties.housenumber, properties.street])

  // The result's own name leads. When it was already echoed into a hierarchy
  // field, joinComponents drops the repeat rather than printing it twice.
  return joinComponents([
    properties.name,
    ...preferBroader([
      street,
      settlement,
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
  const properties = resolveSelfReference(feature.properties || {})

  // The OSM tags are still consulted for settlements, because they are the only
  // thing separating a town from a village or a hamlet. Photon's city layer
  // flattens all three together, and node-geocoder reads them as distinct
  // fields.
  const settlementTag =
    properties.osm_key === 'place' &&
    SETTLEMENT_OSM_VALUES.has(properties.osm_value)
      ? properties.osm_value
      : undefined
  const named = (/** @type {string} */ value) =>
    settlementTag === value ? properties.name : undefined

  const town = named('town')
  const village = named('village')
  // Photon's hierarchy runs city > district > locality > street, so an address
  // whose containing settlement sits below the city layer carries that name in
  // `locality` and has no `city` at all. Without it a rural address loses its
  // settlement from both `city` and formattedAddress. Named `settlement` rather
  // than `locality` so it is not confused with the Photon field it falls back
  // to.
  // properties.city covers both what Photon sent and what resolveSelfReference
  // placed there from the type layer; named('city') covers a place=city tagged
  // result that carries no type at all.
  const settlement =
    properties.city ||
    named('city') ||
    town ||
    village ||
    named('hamlet') ||
    properties.locality ||
    ''

  return {
    latitude,
    longitude,
    formattedAddress: buildFormattedAddress(properties, settlement),
    country: properties.country,
    // Mirrors _formatResult's own city/town/village/hamlet fallback, with
    // Photon's locality layer appended to it.
    city: settlement || undefined,
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
