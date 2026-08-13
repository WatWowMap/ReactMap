const assert = require('node:assert/strict')
const { test } = require('node:test')

const NodeGeocoder = require('node-geocoder')

const { PoracleAPI } = require('../src/services/Poracle')
const {
  formatPhotonFeature,
  joinComponents,
  preferBroader,
} = require('../src/services/photonGeocoder')

/** @param {object} properties @param {number[]} [coordinates] */
const feature = (properties, coordinates = [-104.9903, 39.7392]) => ({
  geometry: { type: 'Point', coordinates },
  properties,
})

const DENVER = feature({
  name: 'Denver',
  county: 'Denver County',
  state: 'Colorado',
  country: 'United States',
  countrycode: 'US',
  osm_key: 'place',
  osm_value: 'city',
})

const STREET_ADDRESS = feature(
  {
    housenumber: '123A',
    street: 'Main Street',
    postcode: '62704',
    city: 'Springfield',
    county: 'Sangamon County',
    state: 'Illinois',
    country: 'United States',
    countrycode: 'US',
    osm_key: 'building',
    osm_value: 'yes',
  },
  [-89.6501, 39.7817],
)

test('maps a Photon city onto the geocoder entry shape', () => {
  assert.deepEqual(formatPhotonFeature(DENVER), {
    latitude: 39.7392,
    longitude: -104.9903,
    formattedAddress: 'Denver, Denver County, Colorado, United States',
    country: 'United States',
    city: 'Denver',
    state: 'Colorado',
    zipcode: undefined,
    streetName: undefined,
    streetNumber: undefined,
    countryCode: 'US',
    neighbourhood: '',
    suburb: '',
    town: '',
    village: '',
  })
})

test('maps a full street address', () => {
  const got = formatPhotonFeature(STREET_ADDRESS)
  assert.equal(got.streetNumber, '123A')
  assert.equal(got.streetName, 'Main Street')
  assert.equal(got.zipcode, '62704')
  assert.equal(got.city, 'Springfield')
  assert.equal(
    got.formattedAddress,
    '123A, Main Street, Springfield, Sangamon County, Illinois, 62704, United States',
  )
})

// GeoJSON is [longitude, latitude]. Reversing it puts every US result in the
// wrong hemisphere.
test('reads coordinates in GeoJSON order', () => {
  const got = formatPhotonFeature(DENVER)
  assert.equal(got.latitude, 39.7392)
  assert.equal(got.longitude, -104.9903)
})

test('drops a feature with no usable coordinates', () => {
  assert.equal(formatPhotonFeature(feature({ name: 'Nowhere' }, [])), null)
  assert.equal(formatPhotonFeature(feature({ name: 'Nowhere' }, [1])), null)
  assert.equal(formatPhotonFeature({ properties: { name: 'Nowhere' } }), null)
})

// A pair of the right length is not the same as a pair of usable numbers.
// Emitting these would put a null or NaN latitude on the map rather than
// dropping the result.
test('drops a feature whose coordinates are not finite numbers', () => {
  const unusable = [
    [null, null],
    [-104.9903, null],
    [null, 39.7392],
    ['-104.9903', '39.7392'],
    [undefined, undefined],
    [NaN, NaN],
    [Infinity, 39.7392],
  ]
  unusable.forEach((coordinates) => {
    assert.equal(
      formatPhotonFeature(feature({ name: 'Nowhere' }, coordinates)),
      null,
      `${JSON.stringify(coordinates)} should be dropped`,
    )
  })
})

// Photon reports a result's own label only in properties.name. Nominatim
// echoes it into the matching address field, and the whole locality fallback
// depends on that echo happening.
test('echoes the result name into its locality field', () => {
  const cases = [
    { osm_value: 'city', name: 'Denver', field: 'city' },
    { osm_value: 'town', name: 'Lyman', field: 'town' },
    { osm_value: 'village', name: 'Arcola', field: 'village' },
    { osm_value: 'hamlet', name: 'Bootjack', field: null },
  ]
  cases.forEach(({ osm_value, name, field }) => {
    const got = formatPhotonFeature(
      feature({ name, osm_key: 'place', osm_value }),
    )
    assert.equal(got.city, name, `${osm_value} should resolve city`)
    if (field)
      assert.equal(got[field], name, `${osm_value} should set ${field}`)
  })
})

test('uses the result name as the street for a road', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Lake Shore Drive',
      osm_key: 'highway',
      osm_value: 'trunk',
    }),
  )
  assert.equal(got.streetName, 'Lake Shore Drive')
})

test("Photon's own city wins over the echoed name", () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Denver',
      city: 'Aurora',
      osm_key: 'place',
      osm_value: 'city',
    }),
  )
  assert.equal(got.city, 'Aurora')
})

// Photon's nearest field is `district`, a different OSM concept. Equating them
// would be an invention rather than a translation.
test('leaves suburb and neighbourhood empty', () => {
  const got = formatPhotonFeature(STREET_ADDRESS)
  assert.equal(got.suburb, '')
  assert.equal(got.neighbourhood, '')
})

test('joinComponents skips absent parts and repeats', () => {
  assert.equal(
    joinComponents(['Denver', undefined, 'Colorado']),
    'Denver, Colorado',
  )
  assert.equal(joinComponents(['  ', '']), '')
  // A postcode search puts the same value in the name and the postcode field.
  assert.equal(
    joinComponents(['62704', 'Leland Grove', '62704', 'Illinois']),
    '62704, Leland Grove, Illinois',
  )
})

test('preferBroader keeps the later of two identical components', () => {
  assert.deepEqual(preferBroader(['New York', 'New York County', 'New York']), [
    undefined,
    'New York County',
    'New York',
  ])
})

// A city sharing its state's name must not cost the address line its state.
test('a city named after its state keeps the state', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Statue of Liberty',
      street: 'Flagpole Plaza',
      city: 'New York',
      county: 'New York County',
      state: 'New York',
      postcode: '10004',
      country: 'United States',
      countrycode: 'US',
      osm_key: 'tourism',
      osm_value: 'attraction',
    }),
  )
  assert.equal(
    got.formattedAddress,
    'Statue of Liberty, Flagpole Plaza, New York County, New York, 10004, United States',
  )
})

// The load-bearing test. Everything downstream of the geocoder service reads
// the entry shape node-geocoder's openstreetmap provider produces, so the
// Photon path has to produce that same shape rather than something similar.
// This builds the provider exactly as geocoder.js does, patch and all, and
// compares the keys it emits against the keys the Photon path emits.
test('the Photon path emits the same keys as the Nominatim path', () => {
  const stockGeocoder = NodeGeocoder({
    provider: 'openstreetmap',
    osmServer: 'http://127.0.0.1:0',
    timeout: 5000,
  })
  stockGeocoder._geocoder._formatResult = ((original) => (result) => ({
    ...original(result),
    suburb: result.address.suburb || '',
    town: result.address.town || '',
    village: result.address.village || '',
  }))(stockGeocoder._geocoder._formatResult.bind(stockGeocoder._geocoder))

  // The same place as STREET_ADDRESS, in Nominatim's response shape.
  const fromNominatim = stockGeocoder._geocoder._formatResult({
    lat: '39.7817',
    lon: '-89.6501',
    display_name:
      '123A, Main Street, Springfield, Sangamon County, Illinois, 62704, United States',
    address: {
      house_number: '123A',
      road: 'Main Street',
      city: 'Springfield',
      county: 'Sangamon County',
      state: 'Illinois',
      postcode: '62704',
      country: 'United States',
      country_code: 'us',
    },
  })
  const fromPhoton = formatPhotonFeature(STREET_ADDRESS)

  assert.deepEqual(
    Object.keys(fromPhoton).sort(),
    Object.keys(fromNominatim).sort(),
    'the two providers must produce the same fields',
  )
  // And for this address the values agree too, which is the point of the
  // exercise: ReactMap should not be able to tell which backend answered.
  assert.deepEqual(fromPhoton, fromNominatim)
})

// Event.webhookObj holds PoracleAPI instances, not the raw webhook config, and
// the constructor copies fields across one by one. A setting it forgets is
// undefined by the time the resolvers read it, so the whole feature silently
// takes the Nominatim branch. These cover that boundary rather than the
// mapping.
const webhookConfig = (overrides = {}) => ({
  name: 'test',
  host: 'http://127.0.0.1',
  port: 3030,
  enabled: true,
  nominatimUrl: 'http://127.0.0.1:2322',
  addressFormat: '{{city}}, {{state}}',
  ...overrides,
})

test('PoracleAPI carries the configured geocoder provider through to the resolvers', () => {
  const api = new PoracleAPI(webhookConfig({ geocoderProvider: 'photon' }))

  // The three values resolvers.js hands to geocoder().
  assert.equal(api.geocoderProvider, 'photon')
  assert.equal(api.nominatimUrl, 'http://127.0.0.1:2322')
  assert.equal(api.addressFormat, '{{city}}, {{state}}')
})

test('PoracleAPI leaves the provider undefined when it is not configured', () => {
  const api = new PoracleAPI(webhookConfig())

  // Undefined is what sends geocoder() down the Nominatim branch, which is the
  // correct default for every existing config.
  assert.equal(api.geocoderProvider, undefined)
  assert.equal(api.nominatimUrl, 'http://127.0.0.1:2322')
})
