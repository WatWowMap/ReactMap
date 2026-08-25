// @ts-check

const { Response } = require('node-fetch')

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
 * @property {string} [locality] The finest named area containing the result,
 *   equivalent to Nominatim's `neighbourhood` or `quarter`. Verified against a
 *   live index: Photon's `locality` for 1521 N Hoyne Ave is "Wicker Park", and
 *   Nominatim's `quarter` for the same building is "Wicker Park".
 * @property {string} [district] The city subdivision containing the result,
 *   equivalent to Nominatim's `suburb` or `borough`. Same building: Photon's
 *   `district` is "West Town", Nominatim's `suburb` is "West Town".
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
 * @type {Set<string>}
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
  // A search for a suburb by name comes back as type=district with the label in
  // `name` and no `district` field, so without this the result being asked for
  // is the one value missing from the answer. Live index, q=West Town Chicago:
  // {name: "West Town", type: "district", osm_key: "place", osm_value: "suburb"}
  district: 'district',
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

  // locality and district sit between the street and the settlement, which is
  // where Nominatim puts the levels they correspond to. For 1521 N Hoyne Ave it
  // renders "1521, North Hoyne Avenue, Wicker Park, West Town, ...", matching
  // the order of Nominatim's own quarter and suburb for that building.
  //
  // The result's own name leads. When it was already echoed into a hierarchy
  // field, joinComponents drops the repeat rather than printing it twice.
  return joinComponents([
    properties.name,
    ...preferBroader([
      street,
      properties.locality,
      properties.district,
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
  // properties.city covers both what Photon sent and what resolveSelfReference
  // placed there from the type layer; named('city') covers a place=city tagged
  // result that carries no type at all.
  //
  // `locality` is deliberately not in this chain. It is neighbourhood-level
  // rather than a smaller settlement: a live index returns locality "Wicker
  // Park" alongside a city, and a genuine hamlet such as Bootjack arrives as
  // osm_value=locality with its name in `name` and no `locality` field at all.
  // Reporting it as the city would name a neighbourhood as a town.
  const settlement =
    properties.city || named('city') || town || village || named('hamlet') || ''

  return {
    latitude,
    longitude,
    formattedAddress: buildFormattedAddress(properties, settlement),
    country: properties.country,
    // Mirrors _formatResult's own city/town/village/hamlet fallback.
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
    // Both verified against a live Photon index rather than inferred: for the
    // same building, Photon's locality and district carry the values Nominatim
    // returns as quarter and suburb.
    neighbourhood: properties.locality || '',
    // The same value under the spelling the GraphQL schema and formatter use.
    // Geocoder.neighborhood is American and formatter() templates on
    // neighborhoods, while node-geocoder emits neighbourhood, so without the
    // alias the mapped value reaches no consumer at all.
    neighborhood: properties.locality || '',
    suburb: properties.district || '',
    town: town || '',
    village: village || '',
  }
}

/**
 * Recognises a response that came from Nominatim rather than Photon.
 *
 * An array is Nominatim's /search shape. A single object carrying result fields
 * and no `features` is its /reverse shape. Both mean the URL and the configured
 * provider disagree.
 *
 * The test is deliberately positive: it looks for fields a Nominatim result
 * has, rather than treating anything without `features` as suspect. fetchJson
 * hands back a Response object on a failed request, and Nominatim answers a
 * miss with {"error":"Unable to geocode"} -- neither is a provider mismatch,
 * and an empty result set is already the right outcome for both.
 * @param {any} response
 */
function isNominatimResponse(response) {
  if (Array.isArray(response)) return true
  if (!response || typeof response !== 'object') return false
  if ('features' in response) return false
  return (
    'address' in response ||
    'display_name' in response ||
    'place_id' in response
  )
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

  let response
  try {
    response = await fetchJson(url)
  } catch (err) {
    // fetchJson does not catch this itself: it does `return response.json()`
    // inside its try block, so a body that fails to parse rejects the promise
    // it already returned and escapes its local catch.
    //
    // This is the reverse half of the provider mismatch. Nominatim's /reverse
    // defaults to XML and only sends JSON when asked, and Photon rejects any
    // parameter outside its allow list with a 400, so asking would break every
    // correctly configured Photon. Recognising the unparseable body instead
    // costs nothing and needs no extra parameter.
    throw new Error(
      `${photonUrl} returned a body that is not JSON. Nominatim answers /reverse with XML unless asked otherwise, so this is usually a Nominatim URL on the Photon provider. Remove "geocoderProvider": "photon" from this webhook, or point the URL at a Photon instance. (${err instanceof Error ? err.message : err})`,
    )
  }
  // The mirror of the Nominatim check. Both of Nominatim's shapes have to be
  // recognised: /search answers with an array, and /reverse answers with a
  // single object. Checking only the array would let gym reverse geocoding
  // fall through to an empty result set with no reason given, which is the
  // path resolvers.js takes for every fort lookup.
  // fetchJson hands back the Response itself when the request failed, so this
  // covers every non-2xx. Photon serves /api and a Nominatim host has no such
  // endpoint, so a forward search against a misconfigured webhook answers 404
  // and is reported here.

  if (response instanceof Response) {
    // Only a 404 on Photon's own route is evidence about the provider: Photon
    // serves /api, so a host without it is not a Photon instance. Any other
    // status -- a 429 or 500 from a healthy but struggling Photon, a 401/403
    // from an authentication proxy in front of one -- is an operational
    // failure, and advising the operator to remove geocoderProvider there
    // prompts them to break a working configuration to cure a transient error.
    if (response.status === 404) {
      throw new Error(
        `${photonUrl} answered 404 for Photon's /api endpoint, so it is not a Photon instance. Check the URL, or remove "geocoderProvider": "photon" from this webhook.`,
      )
    }
    throw new Error(
      `${photonUrl} answered ${response.status}; the upstream geocoder is failing, not misconfigured.`,
    )
  }
  if (isNominatimResponse(response)) {
    throw new Error(
      `${photonUrl} answered in Nominatim's format rather than Photon's. Remove "geocoderProvider": "photon" from this webhook, or point the URL at a Photon instance.`,
    )
  }
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
