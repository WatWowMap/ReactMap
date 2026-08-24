const assert = require('node:assert/strict')
const { test } = require('node:test')

const NodeGeocoder = require('node-geocoder')

const http = require('node:http')

const { PoracleAPI } = require('../src/services/Poracle')
const {
  formatter,
  geocoder,
  nominatimGeocoder,
} = require('../src/services/geocoder')
const {
  formatPhotonFeature,
  joinComponents,
  photonGeocoder,
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
    neighborhood: '',
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

// A house in a hamlet: Photon puts the containing settlement in `locality` and
// sends no `city` at all. Reading only `city` drops the settlement from both
// the entry and the formatted address, so a {{city}} format renders blank for
// every rural address.
// Captured verbatim from a live Photon index: reverse at 41.9088,-87.6796.
// Nominatim's own answer for the same building carries quarter "Wicker Park"
// and suburb "West Town", which is what fixes these two mappings.
const WICKER_PARK_REVERSE = {
  city: 'West Chicago Township',
  country: 'United States',
  countrycode: 'US',
  county: 'Cook County',
  district: 'West Town',
  housenumber: '1521',
  locality: 'Wicker Park',
  osm_key: 'building',
  osm_value: 'yes',
  postcode: '60647',
  state: 'Illinois',
  street: 'North Hoyne Avenue',
  type: 'house',
}

test("maps Photon's locality to neighbourhood and district to suburb", () => {
  const got = formatPhotonFeature(
    feature(WICKER_PARK_REVERSE, [-87.6796, 41.9088]),
  )
  assert.equal(got.neighbourhood, 'Wicker Park')
  assert.equal(got.suburb, 'West Town')
  // Neither is the settlement. Reporting a neighbourhood as the city would name
  // an area of Chicago as a town.
  assert.equal(got.city, 'West Chicago Township')
})

test('places locality and district between the street and the settlement', () => {
  const got = formatPhotonFeature(
    feature(WICKER_PARK_REVERSE, [-87.6796, 41.9088]),
  )
  assert.equal(
    got.formattedAddress,
    '1521, North Hoyne Avenue, Wicker Park, West Town, West Chicago Township, Cook County, Illinois, 60647, United States',
  )
})

// A hamlet does not arrive in `locality`. Live index, q=Bootjack California:
// osm_value=locality, type=other, name carries the hamlet, no locality field.
test('a place tagged as a locality keeps its name out of the address fields', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Bootjack',
      type: 'other',
      osm_key: 'place',
      osm_value: 'locality',
      county: 'Mariposa',
      state: 'California',
      country: 'United States',
      countrycode: 'US',
    }),
  )
  assert.equal(got.neighbourhood, '')
  assert.equal(
    got.formattedAddress,
    'Bootjack, Mariposa, California, United States',
  )
})

test('places the result name using the Photon type layer', () => {
  const cases = [
    { type: 'city', name: 'Denver', field: 'city' },
    { type: 'state', name: 'Illinois', field: 'state' },
    { type: 'country', name: 'United States', field: 'country' },
    { type: 'locality', name: 'Wicker Park', field: 'neighbourhood' },
    { type: 'street', name: 'Lake Shore Drive', field: 'streetName' },
  ]
  cases.forEach(({ type, name, field }) => {
    const got = formatPhotonFeature(
      feature({
        name,
        type,
        osm_key: 'boundary',
        osm_value: 'administrative',
      }),
    )
    assert.equal(got[field], name, `type=${type} should populate ${field}`)
  })
})

// The failure this prevents: a state search rendering as ", United States".
test('a state result keeps its own name in the formatted address', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Illinois',
      type: 'state',
      country: 'United States',
      countrycode: 'US',
      osm_key: 'boundary',
      osm_value: 'administrative',
    }),
  )
  assert.equal(got.state, 'Illinois')
  assert.equal(got.formattedAddress, 'Illinois, United States')
})

// A city carried as an administrative boundary is the common OSM shape.
test('an administrative city result still resolves its city', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Denver',
      type: 'city',
      county: 'Denver County',
      state: 'Colorado',
      country: 'United States',
      countrycode: 'US',
      osm_key: 'boundary',
      osm_value: 'administrative',
    }),
  )
  assert.equal(got.city, 'Denver')
  assert.equal(
    got.formattedAddress,
    'Denver, Denver County, Colorado, United States',
  )
})

// The type layer flattens town, village and hamlet into `city`, so the OSM tag
// stays the only source for the distinction node-geocoder reads.
test('the type layer does not cost the town and village distinction', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Lyman',
      type: 'city',
      osm_key: 'place',
      osm_value: 'town',
      state: 'Nebraska',
      country: 'United States',
      countrycode: 'US',
    }),
  )
  assert.equal(got.town, 'Lyman')
  assert.equal(got.city, 'Lyman')
  assert.equal(got.village, '')
})

// A value Photon supplied is never overwritten by the result's own name.
test('the type layer never overwrites a value Photon sent', () => {
  const got = formatPhotonFeature(
    feature({
      name: 'Denver',
      type: 'city',
      city: 'Aurora',
      state: 'Colorado',
    }),
  )
  assert.equal(got.city, 'Aurora')
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
test('leaves suburb and neighbourhood empty when Photon sends neither', () => {
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
  // Mirrors the patch in geocoder.js, alias included. The duplication is the
  // point: if the two drift apart, this test stops proving parity.
  stockGeocoder._geocoder._formatResult = ((original) => (result) => {
    const formatted = original(result)
    return {
      ...formatted,
      suburb: result.address?.suburb || '',
      town: result.address?.town || '',
      village: result.address?.village || '',
      neighborhood: formatted.neighbourhood || '',
    }
  })(stockGeocoder._geocoder._formatResult.bind(stockGeocoder._geocoder))

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

// A misconfigured webhook -- a Photon URL left on the Nominatim provider, or the
// reverse -- used to reach node-geocoder, which reads a GeoJSON object as a
// single result and hands the whole FeatureCollection to _formatResult. The
// unguarded address lookup in ReactMap's patch then threw, and because
// node-geocoder resolves through bluebird's asCallback the throw never reached
// geocoder()'s catch: it surfaced as an uncaught exception and killed the
// process.
const serveOnce = async (body) => {
  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
      }),
  }
}

const PHOTON_BODY = {
  type: 'FeatureCollection',
  features: [
    {
      geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] },
      properties: { name: 'Denver', type: 'city', countrycode: 'US' },
    },
  ],
}

const NOMINATIM_BODY = [
  {
    lat: '39.7392',
    lon: '-104.9903',
    display_name: 'Denver, Colorado, United States',
    address: { city: 'Denver', state: 'Colorado', country_code: 'us' },
  },
]

test('a Photon URL on the Nominatim provider fails without crashing', async () => {
  const server = await serveOnce(PHOTON_BODY)
  try {
    // geocoder() catches and returns {}. What matters is that the process
    // survives to get here at all.
    const result = await geocoder(server.url, 'Denver', false, '{{city}}')
    assert.deepEqual(result, [])
  } finally {
    await server.close()
  }
})

test('a Nominatim URL on the Photon provider fails without returning nothing silently', async () => {
  const server = await serveOnce(NOMINATIM_BODY)
  try {
    const result = await geocoder(
      server.url,
      'Denver',
      false,
      '{{city}}',
      'photon',
    )
    assert.deepEqual(result, [])
  } finally {
    await server.close()
  }
})

// The matched pairs still work, so the checks above are not rejecting valid
// responses.
test('a correctly configured Photon webhook still geocodes', async () => {
  const server = await serveOnce(PHOTON_BODY)
  try {
    const result = await geocoder(
      server.url,
      'Denver',
      false,
      '{{city}}',
      'photon',
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].formatted, 'Denver')
    assert.equal(result[0].latitude, 39.7392)
    assert.equal(result[0].longitude, -104.9903)
    // The mapped fields ride along with formatted: Geocoder resolves
    // neighborhood, suburb and the rest straight off this object.
    assert.equal(result[0].city, 'Denver')
  } finally {
    await server.close()
  }
})

test('a correctly configured Nominatim webhook still geocodes', async () => {
  const server = await serveOnce(NOMINATIM_BODY)
  try {
    const result = await geocoder(server.url, 'Denver', false, '{{city}}')
    assert.equal(result.length, 1)
    assert.equal(result[0].formatted, 'Denver')
    assert.equal(result[0].latitude, 39.7392)
    assert.equal(result[0].longitude, -104.9903)
    assert.equal(result[0].city, 'Denver')
  } finally {
    await server.close()
  }
})

// Nominatim answers /reverse with a single object rather than the array /search
// returns, and gym reverse geocoding is the path resolvers.js takes for every
// fort lookup. Checking only for an array let that mismatch through as an empty
// result set with no reason given.
const NOMINATIM_REVERSE_BODY = {
  place_id: 315787599,
  lat: '39.7392',
  lon: '-104.9903',
  display_name: '1437, Bannock Street, Denver, Colorado, 80202, United States',
  address: {
    house_number: '1437',
    road: 'Bannock Street',
    city: 'Denver',
    country_code: 'us',
  },
}

// Asserted against photonGeocoder rather than geocoder(), deliberately.
// geocoder() catches everything and returns {}, so a mismatch and a plain miss
// look identical from there -- the whole point of this change is which error
// reaches the log, and only the inner function exposes that.
// Behaves the way a real Nominatim host does, rather than answering the same
// JSON on every path. That distinction matters: a stub that always returns
// Nominatim JSON made these checks look like they worked when they did not.
//
//   /api      Photon's endpoint. Nominatim has none, so it answers 404.
//   /reverse  defaults to XML unless format=json is asked for.
//   /search   the array shape.
const serveNominatim = async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname === '/reverse') {
      if (url.searchParams.get('format') !== 'json') {
        res.writeHead(200, { 'Content-Type': 'text/xml' })
        res.end('<?xml version="1.0" encoding="UTF-8" ?><reversegeocode/>')
        return
      }
      json(200, NOMINATIM_REVERSE_BODY)
      return
    }
    if (url.pathname === '/search') {
      json(200, NOMINATIM_BODY)
      return
    }
    json(404, { title: '404 Not Found' })
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
      }),
  }
}

// Documents a limitation rather than a behaviour. Nominatim's /reverse answers
// XML unless format=json is asked for, and Photon rejects any parameter outside
// its allow list with a 400, so asking would break every correctly configured
// Photon. The body therefore fails to parse and is logged as a failed fetch.
// The forward path below is where this misconfiguration is actually reported.
// Nominatim's /reverse answers XML unless format=json is asked for, and Photon
// rejects any parameter outside its allow list with a 400, so asking would
// break every correctly configured Photon. The unparseable body is the signal
// instead.
test('a Nominatim reverse response on the Photon provider raises a provider error', async () => {
  const server = await serveNominatim()
  try {
    await assert.rejects(
      () => photonGeocoder(server.url, { lat: 39.7392, lon: -104.9903 }, true),
      /not a Photon instance|Photon provider|answers \/reverse with XML/,
    )
  } finally {
    await server.close()
  }
})

// The forward half of the same misconfiguration. Nominatim has no /api, so it
// answers 404 rather than a readable body, and the previous check could never
// have seen a Nominatim search array here.
test('a Nominatim host on the Photon provider raises an error on the forward path', async () => {
  const server = await serveNominatim()
  try {
    await assert.rejects(
      () => photonGeocoder(server.url, 'Denver', false),
      /not a Photon instance/,
    )
  } finally {
    await server.close()
  }
})

// The classifier only ever sees a JSON body because the request asks for one.
// Without format=json this endpoint answers XML, fetchJson cannot parse it, and
// the mismatch goes unreported.
// The request must carry nothing outside Photon's allow list. A live instance
// answers 400 to any unknown parameter, so an extra one added to help diagnose
// a misconfiguration would break every correctly configured deployment.
test('the outgoing requests send only parameters Photon accepts', async () => {
  const PHOTON_PARAMS = new Set([
    'include',
    'debug',
    'dedupe',
    'query_string_filter',
    'lon',
    'layer',
    'limit',
    'osm_tag',
    'distance_sort',
    'geometry',
    'exclude',
    'lang',
    'radius',
    'lat',
    'q',
  ])
  const seen = []
  const server = http.createServer((req, res) => {
    seen.push(req.url)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ type: 'FeatureCollection', features: [] }))
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    await photonGeocoder(url, 'Denver', false)
    await photonGeocoder(url, { lat: 39.7392, lon: -104.9903 }, true)
    seen.forEach((requested) => {
      const params = new URL(requested, 'http://127.0.0.1').searchParams
      params.forEach((_, key) => {
        assert.ok(
          PHOTON_PARAMS.has(key),
          `${key} is not a parameter Photon accepts (${requested})`,
        )
      })
    })
  } finally {
    await new Promise((resolve) => {
      server.close(resolve)
    })
  }
})

// A JSON array is still Nominatim's /search shape, whatever served it.
test('a Nominatim search array on the Photon provider raises a provider error', async () => {
  const server = await serveOnce(NOMINATIM_BODY)
  try {
    await assert.rejects(
      () => photonGeocoder(server.url, 'Denver', false),
      /Nominatim's format/,
    )
  } finally {
    await server.close()
  }
})

// A miss is not a mismatch. An unmatched reverse lookup carries no result
// fields, and an empty result is already the right outcome, so it must not be
// reported as a provider error.
test('a no-match reverse response is not mistaken for a provider mismatch', async () => {
  const server = await serveOnce({ error: 'Unable to geocode' })
  try {
    const results = await photonGeocoder(server.url, { lat: 0, lon: 0 }, true)
    assert.deepEqual(results, [])
  } finally {
    await server.close()
  }
})

// The matched pair still works on the reverse path.
test('a correctly configured Photon webhook still reverse geocodes', async () => {
  const server = await serveOnce({
    type: 'FeatureCollection',
    features: [
      {
        geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] },
        properties: { city: 'Denver', state: 'Colorado', countrycode: 'US' },
      },
    ],
  })
  try {
    const result = await geocoder(
      server.url,
      { lat: 39.7392, lon: -104.9903 },
      true,
      '{{city}}',
      'photon',
    )
    assert.equal(result, 'Denver')
  } finally {
    await server.close()
  }
})

// Captured from a live index, q=West Town Chicago. A suburb searched by name
// comes back as its own result: the label is in `name` and the containing
// `district` field is absent, so without a district entry in the type map the
// one value being asked for is the one missing from the answer.
test('a district searched by name populates suburb', () => {
  const got = formatPhotonFeature(
    feature(
      {
        city: 'West Chicago Township',
        country: 'United States',
        countrycode: 'US',
        county: 'Cook County',
        name: 'West Town',
        osm_key: 'place',
        osm_value: 'suburb',
        state: 'Illinois',
        type: 'district',
      },
      [-87.6796, 41.9088],
    ),
  )
  assert.equal(got.suburb, 'West Town')
  assert.equal(
    got.formattedAddress,
    'West Town, West Chicago Township, Cook County, Illinois, United States',
  )
})

// Query.geocoder is [Geocoder] and Gym.formatted is String. An object fallback
// makes GraphQL discard the field entirely rather than degrade to an empty
// answer, so a transient upstream failure has to keep the caller's shape.
test('a transient upstream failure keeps the shape the schema expects', async () => {
  const failing = http.createServer((_, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'overloaded' }))
  })
  await new Promise((resolve) => {
    failing.listen(0, '127.0.0.1', resolve)
  })
  const url = `http://127.0.0.1:${failing.address().port}`
  try {
    const forward = await geocoder(url, 'Denver', false, '{{city}}', 'photon')
    assert.ok(Array.isArray(forward), `forward returned ${typeof forward}`)
    assert.deepEqual(forward, [])

    const reverse = await geocoder(
      url,
      { lat: 39.7392, lon: -104.9903 },
      true,
      '{{city}}',
      'photon',
    )
    assert.equal(typeof reverse, 'string', 'reverse must stay a String')
    assert.equal(reverse, '')
  } finally {
    await new Promise((resolve) => {
      failing.close(resolve)
    })
  }
})

// Behaves like a real Photon instance rather than accepting anything: it serves
// /api and /reverse only, and rejects any parameter outside its allow list.
// node-geocoder forces format and addressdetails onto every request and calls
// /search, so a Photon URL left on the Nominatim provider never reaches a
// FeatureCollection at all. Captured from a live instance.
const servePhoton = async () => {
  const ALLOWED = new Set([
    'include',
    'debug',
    'dedupe',
    'query_string_filter',
    'lon',
    'layer',
    'limit',
    'osm_tag',
    'distance_sort',
    'geometry',
    'exclude',
    'lang',
    'radius',
    'lat',
    'q',
  ])
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname !== '/api' && url.pathname !== '/reverse') {
      json(404, {
        title: `Endpoint ${req.method} ${url.pathname} not found`,
        status: 404,
        type: 'https://javalin.io/documentation#endpointnotfound',
        details: {},
      })
      return
    }
    const bad = [...url.searchParams.keys()].find((k) => !ALLOWED.has(k))
    if (bad) {
      json(400, {
        message: `Unknown query parameter '${bad}'.  Allowed parameters are: [${[...ALLOWED].join(', ')}]`,
      })
      return
    }
    json(200, { type: 'FeatureCollection', features: [] })
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
      }),
  }
}

// The exact production misconfiguration: a Photon URL inherited from Poracle
// with no geocoderProvider set. It used to format into a single blank result.
test('a Photon URL on the Nominatim provider is reported on the forward path', async () => {
  const server = await servePhoton()
  try {
    await assert.rejects(
      () => nominatimGeocoder(server.url, 'Denver', false),
      /answered as a Photon instance/,
    )
  } finally {
    await server.close()
  }
})

test('a Photon URL on the Nominatim provider is reported on the reverse path', async () => {
  const server = await servePhoton()
  try {
    await assert.rejects(
      () =>
        nominatimGeocoder(server.url, { lat: 39.7392, lon: -104.9903 }, true),
      /answered as a Photon instance/,
    )
  } finally {
    await server.close()
  }
})

// The value has to reach the two consumers that actually exist: the GraphQL
// field is `neighborhood` and formatter() templates on `neighborhoods`, while
// node-geocoder produces `neighbourhood`.
test('locality reaches the public neighborhood contract', () => {
  const got = formatPhotonFeature(
    feature(WICKER_PARK_REVERSE, [-87.6796, 41.9088]),
  )
  assert.equal(got.neighbourhood, 'Wicker Park')
  assert.equal(got.neighborhood, 'Wicker Park')
  assert.equal(formatter('{{neighborhood}}', got), 'Wicker Park')
  assert.equal(formatter('{{neighbourhood}}', got), 'Wicker Park')
})

// The alias has to exist on the Nominatim path too. node-geocoder emits
// neighbourhood there, and the GraphQL field and formatter token both use the
// American spellings, so a Nominatim deployment had the same invisible value.
test('the Nominatim path also carries the neighborhood alias', async () => {
  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify([
        {
          lat: '41.9088',
          lon: '-87.6796',
          display_name: 'Wicker Park, Chicago',
          address: {
            neighbourhood: 'Wicker Park',
            city: 'Chicago',
            country_code: 'us',
          },
        },
      ]),
    )
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  try {
    const [entry] = await nominatimGeocoder(
      `http://127.0.0.1:${server.address().port}`,
      'Wicker Park',
      false,
    )
    assert.equal(entry.neighbourhood, 'Wicker Park')
    assert.equal(entry.neighborhood, 'Wicker Park')
    assert.equal(formatter('{{neighborhood}}', entry), 'Wicker Park')
  } finally {
    await new Promise((resolve) => {
      server.close(resolve)
    })
  }
})

// Clearing the search box sends an empty string. Photon rejects it with a 400,
// which surfaces as an error, so a user deleting their own input would fill the
// log with failures. Nothing should leave the process at all.
test('an empty search never reaches the upstream', async () => {
  const seen = []
  const server = http.createServer((req, res) => {
    seen.push(req.url)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ type: 'FeatureCollection', features: [] }))
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    const blank = ['', '   ', '\t\n', undefined, null]
    // eslint-disable-next-line no-restricted-syntax
    await Promise.all(
      blank.map(async (search) => {
        const photon = await geocoder(url, search, false, '{{city}}', 'photon')
        assert.deepEqual(
          photon,
          [],
          `photon returned a result for ${JSON.stringify(search)}`,
        )
        const nominatim = await geocoder(url, search, false, '{{city}}')
        assert.deepEqual(
          nominatim,
          [],
          `nominatim returned a result for ${JSON.stringify(search)}`,
        )
      }),
    )
    assert.deepEqual(seen, [], `requests were sent: ${seen.join(', ')}`)

    // A real query still goes out, so the guard is not swallowing everything.
    await geocoder(url, 'Denver', false, '{{city}}', 'photon')
    assert.equal(seen.length, 1)
  } finally {
    await new Promise((resolve) => {
      server.close(resolve)
    })
  }
})

// A reverse lookup at 0,0 is a real coordinate pair, not an empty search.
test('the empty guard does not swallow a zero coordinate', async () => {
  const seen = []
  const server = http.createServer((req, res) => {
    seen.push(req.url)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ type: 'FeatureCollection', features: [] }))
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  try {
    await geocoder(
      `http://127.0.0.1:${server.address().port}`,
      { lat: 0, lon: 0 },
      true,
      '{{city}}',
      'photon',
    )
    assert.equal(seen.length, 1, 'a reverse lookup at 0,0 must still be sent')
    assert.match(seen[0], /lat=0/)
  } finally {
    await new Promise((resolve) => {
      server.close(resolve)
    })
  }
})

// An RFC 7807 problem body is not a Photon signature. A rate-limiting proxy in
// front of a healthy Nominatim answers {"title":"Too Many Requests","status":
// 429}, and diagnosing that as a provider mismatch advises the operator to
// break a working configuration to fix a transient failure.
test('an RFC 7807 error from a Nominatim proxy is not diagnosed as Photon', async () => {
  const server = await serveOnce({ title: 'Too Many Requests', status: 429 })
  try {
    // The generic path resolves with a blank entry, as it always did. What must
    // not happen is the provider-mismatch throw, whose message tells the
    // operator to change geocoderProvider.
    const results = await nominatimGeocoder(server.url, 'Denver', false)
    assert.equal(results.length, 1)
  } finally {
    await server.close()
  }
})

// The Javalin signatures still fire, so narrowing did not disable the check.
test('the Javalin 404 body is still diagnosed as Photon', async () => {
  const server = await serveOnce({
    title: 'Endpoint GET /search not found',
    status: 404,
    type: 'https://javalin.io/documentation#endpointnotfound',
  })
  try {
    await assert.rejects(
      () => nominatimGeocoder(server.url, 'Denver', false),
      /Photon instance/,
    )
  } finally {
    await server.close()
  }
})

// Nominatim reports neighbourhood-level data under `quarter` for many places:
// 1521 N Hoyne Ave carries quarter "Wicker Park" and no neighbourhood key.
// node-geocoder only reads address.neighbourhood, so both spellings came out
// empty for exactly the responses the alias exists to surface.
test('a quarter-shaped Nominatim response populates both neighborhood spellings', async () => {
  const server = await serveOnce([
    {
      lat: '41.9088',
      lon: '-87.6796',
      display_name:
        '1521, North Hoyne Avenue, Wicker Park, West Town, Chicago, Illinois, 60622, United States',
      address: {
        house_number: '1521',
        road: 'North Hoyne Avenue',
        quarter: 'Wicker Park',
        suburb: 'West Town',
        city: 'Chicago',
        state: 'Illinois',
        postcode: '60622',
        country: 'United States',
        country_code: 'us',
      },
    },
  ])
  try {
    const results = await nominatimGeocoder(server.url, 'Denver', false)
    assert.equal(results[0].neighbourhood, 'Wicker Park')
    assert.equal(results[0].neighborhood, 'Wicker Park')
  } finally {
    await server.close()
  }
})

// When an addressFormat is configured, the resolver's list still resolves the
// Geocoder fields off these objects. Returning only the formatted triple made
// neighborhood, suburb and the rest null for every formatted call.
test('a formatted result keeps the mapped fields for the Geocoder type', async () => {
  const server = await serveOnce({
    type: 'FeatureCollection',
    features: [
      {
        geometry: { type: 'Point', coordinates: [-87.6796, 41.9088] },
        properties: {
          housenumber: '1521',
          street: 'North Hoyne Avenue',
          locality: 'Wicker Park',
          district: 'West Town',
          city: 'Chicago',
          state: 'Illinois',
          postcode: '60622',
          country: 'United States',
          countrycode: 'US',
          osm_key: 'building',
          osm_value: 'yes',
          type: 'house',
        },
      },
    ],
  })
  try {
    const results = await geocoder(
      server.url,
      '1521 N Hoyne',
      false,
      '{{city}}',
      'photon',
    )
    assert.equal(results[0].formatted, 'Chicago')
    assert.equal(results[0].neighborhood, 'Wicker Park')
    assert.equal(results[0].suburb, 'West Town')
    assert.equal(results[0].streetNumber, '1521')
  } finally {
    await server.close()
  }
})
