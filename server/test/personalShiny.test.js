const assert = require('node:assert/strict')
const { mock, test } = require('node:test')
const knexFactory = require('knex')

const config = require('@rm/config')

require('./stateMock')

const limits = [
  { roles: ['supporter'], max: 3 },
  { roles: ['muted'], max: 0 },
]
const { getSafe } = config
mock.method(config, 'getSafe', (key) => {
  switch (key) {
    case 'authentication.perms.personalShiny.limits':
      return limits
    case 'authentication.perms.personalShiny.defaultMax':
      return 1
    // loaded when the server starts
    case 'areas':
      return {}
    default:
      return getSafe(key)
  }
})

const { golbatCapabilities } = require('../src/services/GolbatCapabilities')
const {
  dnfifyIvFilter,
  jsifyIvFilter,
} = require('../src/filters/pokemon/functions')
const { PokemonFilter } = require('../src/filters/pokemon/Frontend')
const { Pokemon } = require('../src/models/Pokemon')
const {
  getPersonalShinyMax,
  personalShinyLimits,
} = require('../src/utils/personalShinyLimits')
const { toV3Filter } = require('../src/utils/personalShiny')
const {
  validatePlayerAccounts,
} = require('../src/utils/validatePlayerAccounts')
const { getGlowColor, getGlowRules } = require('../../src/utils/getGlowRules')

const MEM = 'http://golbat'
const PLAYERS = [{ playerId: 'p1', label: 'Main' }]
const PERMS = {
  pokemon: true,
  iv: true,
  pvp: false,
  personalShiny: true,
  areaRestrictions: [],
}

/** A wild Pokémon as Golbat returns it */
const wild = (id, iv, extra = {}) => ({
  id: `${id}`,
  lat: 0,
  lon: 0,
  pokemon_id: 25,
  form: 0,
  iv,
  ...extra,
})

/**
 * Runs a scan against a fake Golbat, which answers the v3 scan with `v3`
 * (an array of Pokémon, or anything else for a refusal) and the v2 scan with
 * `v2`, and records every request
 */
const scan = async (t, { filters, v3, v2 = [], players = PLAYERS, expert }) => {
  const knex = knexFactory({ client: 'mysql2' })
  const previousQuery = Pokemon.query
  Pokemon.query = () => knex('pokemon')
  t.after(async () => {
    Pokemon.query = previousQuery
    await knex.destroy()
  })
  t.mock.method(golbatCapabilities, 'supportsFilter', (mem, key) =>
    ['annotate_for', 'shiny_for'].includes(key),
  )
  /** @type {{ url: string, body: any }[]} */
  const requests = []
  t.mock.method(Pokemon, 'evalQuery', async (url, body) => {
    requests.push({ url, body: JSON.parse(body) })
    if (url.endsWith('/v3/scan')) {
      return Array.isArray(v3) ? { pokemon: v3 } : v3
    }
    return v2
  })
  const args = {
    minLat: 0,
    minLon: 0,
    maxLat: 1,
    maxLon: 1,
    personalShinyPlayers: players,
    filters: {
      onlyIvOr: { ...new PokemonFilter(), iv: [90, 100], adv: expert || '' },
      onlyLegacy: !!expert,
      onlyLinkGlobal: false,
      onlyAreas: [],
      ...filters,
    },
  }
  const results = await Pokemon[expert ? 'getLegacy' : 'getAll'](PERMS, args, {
    mem: MEM,
    secret: '',
    httpAuth: null,
    hasSize: true,
    hasHeight: true,
  })
  return { requests, results }
}

test('the shiny term is a condition in both halves of the expert grammar', () => {
  const pokemon = [{ id: 25, form: 0 }]
  assert.deepEqual(dnfifyIvFilter('shiny & 100', pokemon), [
    { pokemon, personal_shiny: true, iv: { min: 100, max: 100 } },
  ])
  assert.deepEqual(dnfifyIvFilter('90-100 | shiny', pokemon), [
    { pokemon, iv: { min: 90, max: 100 } },
    { pokemon, personal_shiny: true },
  ])
  assert.deepEqual(dnfifyIvFilter('100 shiny', pokemon), [])

  const shundo = jsifyIvFilter('shiny & 100')
  assert.equal(shundo({ iv: 100, personal_shiny: ['Main'] }), true)
  assert.equal(shundo({ iv: 100 }), false)
  assert.equal(jsifyIvFilter('!shiny')({}), true)
  assert.equal(jsifyIvFilter('100 shiny'), null)
})

test('v3 genders are only the real ones, and none left still matches nothing', () => {
  assert.deepEqual(toV3Filter({ gender: { min: 0, max: 1000000000 } }), {
    gender: [0, 1, 2, 3],
  })
  assert.deepEqual(
    toV3Filter({ iv: { min: 90, max: 100 }, gender: { min: 2, max: 2 } }),
    {
      iv: { min: 90, max: 100 },
      gender: [2],
    },
  )
  assert.deepEqual(toV3Filter({ gender: { min: 5, max: 9 } }), {
    iv: { min: 1, max: 0 },
  })
})

test('include adds the shinies next to every clause group and marks them', async (t) => {
  const { requests, results } = await scan(t, {
    filters: { onlyPersonalShiny: 'include', onlyHundoIv: true },
    v3: [wild(1, 10, { shiny_for: ['p1'] }), wild(2, 10), wild(3, 95)],
  })
  assert.equal(requests.length, 1)
  const [{ url, body }] = requests
  assert.equal(url, `${MEM}/api/pokemon/v3/scan`)
  assert.deepEqual(body.annotate_for, ['p1'])
  assert.deepEqual(body.filters.at(-1), {
    pokemon: [{ id: -1 }],
    shiny_for: ['p1'],
  })
  assert.deepEqual(
    results.map(({ id, personal_shiny: shiny }) => [id, shiny]),
    [
      ['1', ['Main']],
      ['3', undefined],
    ],
  )
})

test('only puts the condition in every clause and shows nothing else', async (t) => {
  const { requests, results } = await scan(t, {
    filters: { onlyPersonalShiny: 'only', onlyHundoIv: true },
    v3: [wild(1, 95, { shiny_for: ['p1'] }), wild(2, 100), wild(3, 95)],
  })
  assert.equal(
    requests[0].body.filters.every((clause) => clause.shiny_for?.[0] === 'p1'),
    true,
  )
  assert.deepEqual(
    results.map(({ id }) => id),
    ['1'],
  )
})

test('off only marks the shinies the filters show', async (t) => {
  const { requests, results } = await scan(t, {
    filters: { onlyPersonalShiny: 'off' },
    v3: [
      wild(1, 95, { shiny_for: ['p1'] }),
      wild(2, 10, { shiny_for: ['p1'] }),
    ],
  })
  assert.deepEqual(requests[0].body.annotate_for, ['p1'])
  assert.equal(
    requests[0].body.filters.some((clause) => clause.shiny_for),
    false,
  )
  assert.deepEqual(
    results.map(({ id, personal_shiny: shiny }) => [id, shiny]),
    [['1', ['Main']]],
  )
})

test('a refused v3 scan falls back to the plain scan without the mode', async (t) => {
  const { requests, results } = await scan(t, {
    filters: { onlyPersonalShiny: 'only' },
    v3: { status: 503 },
    v2: [wild(1, 95), wild(2, 10)],
  })
  assert.deepEqual(
    requests.map(({ url }) => url),
    [`${MEM}/api/pokemon/v3/scan`, `${MEM}/api/pokemon/v2/scan`],
  )
  assert.equal(requests[1].body.annotate_for, undefined)
  assert.equal(
    requests[1].body.filters.some((clause) => clause.shiny_for),
    false,
  )
  assert.deepEqual(
    results.map(({ id }) => id),
    ['1'],
  )
})

test('without active players the scan stays on v2 and the mode is off', async (t) => {
  const { requests, results } = await scan(t, {
    filters: { onlyPersonalShiny: 'only' },
    players: [],
    v2: [wild(1, 95)],
  })
  assert.deepEqual(
    requests.map(({ url }) => url),
    [`${MEM}/api/pokemon/v2/scan`],
  )
  assert.deepEqual(
    results.map(({ id }) => id),
    ['1'],
  )
})

test('the expert shiny term asks Golbat, or matches nothing without players', async (t) => {
  const withPlayers = await scan(t, {
    expert: 'shiny & 100',
    v3: [wild(1, 100, { shiny_for: ['p1'] }), wild(2, 100)],
  })
  assert.deepEqual(withPlayers.requests[0].body.filters, [
    { shiny_for: ['p1'], iv: { min: 100, max: 100 } },
  ])
  assert.deepEqual(
    withPlayers.results.map(({ id }) => id),
    ['1'],
  )

  const without = await scan(t, {
    expert: 'shiny & 100',
    players: [],
    v2: [],
  })
  assert.deepEqual(without.requests[0].body.filters, [
    { iv: { min: 1, max: 0 } },
  ])
})

test('the player cap is the highest matching limit, else the default', () => {
  assert.deepEqual(personalShinyLimits(['supporter', 'muted']), [3, 0])
  assert.equal(getPersonalShinyMax({ personalShiny: false }), 0)
  assert.equal(
    getPersonalShinyMax({ personalShiny: true, personalShinyLimits: [] }),
    1,
  )
  assert.equal(
    getPersonalShinyMax({ personalShiny: true, personalShinyLimits: [3, 0] }),
    3,
  )
  assert.equal(
    getPersonalShinyMax({ personalShiny: true, personalShinyLimits: [0] }),
    0,
  )
  assert.equal(getPersonalShinyMax({ personalShiny: true, admin: true }), 50)
})

test('saved accounts are checked and get default labels', () => {
  assert.deepEqual(
    validatePlayerAccounts(
      [
        { playerId: ' abc ', label: '', active: true },
        { playerId: 'def', label: 'Alt', active: false },
      ],
      2,
    ),
    {
      accounts: [
        { playerId: 'abc', label: 'Player 1', active: true },
        { playerId: 'def', label: 'Alt', active: false },
      ],
    },
  )
  assert.deepEqual(validatePlayerAccounts([{ playerId: 'a' }], 0), {
    error: 'too_many',
  })
  assert.deepEqual(
    validatePlayerAccounts([{ playerId: '1234 5678 9012' }], 1),
    { error: 'friend_code' },
  )
  assert.deepEqual(validatePlayerAccounts([{ playerId: ' ' }], 1), {
    error: 'invalid_id',
  })
  assert.deepEqual(validatePlayerAccounts([{ playerId: 'x'.repeat(257) }], 1), {
    error: 'invalid_id',
  })
  assert.deepEqual(
    validatePlayerAccounts([{ playerId: 'a' }, { playerId: 'a' }], 2),
    { error: 'duplicate' },
  )
  assert.deepEqual(
    validatePlayerAccounts([{ playerId: 'a', label: 'x'.repeat(25) }], 1),
    { error: 'label_too_long' },
  )
})

test('a shundo glows with its combined rule, other overlaps with Multiple', () => {
  const RULES = {
    Hundo: { perm: 'iv', op: '=', num: 100, value: '#ff1744' },
    'Top PVP Rank': { perm: 'pvp', op: '<=', num: 1, value: '#0000ff' },
    'Shiny for Me': { perm: 'personalShiny', value: '#ffd700' },
    Shundo: {
      perm: ['personalShiny', 'iv'],
      op: '=',
      num: 100,
      value: 'rainbow',
    },
    Multiple: { perm: 'pvp', value: '#800080' },
  }
  const colors = Object.fromEntries(
    Object.entries(RULES).map(([name, { value }]) => [name, value]),
  )
  const rules = getGlowRules(RULES)
  const glow = (pkmn) => getGlowColor(rules, pkmn, colors)
  assert.equal(glow({ iv: 98, personal_shiny: ['Main'] }), '#ffd700')
  assert.equal(glow({ iv: 100, personal_shiny: ['Main'] }), 'rainbow')
  assert.equal(glow({ iv: 100, bestPvp: 1 }), '#800080')
  assert.equal(glow({ iv: 50 }), undefined)
  assert.equal(
    getGlowColor(
      rules,
      { iv: 100, personal_shiny: ['Main'] },
      {
        ...colors,
        Shundo: '',
      },
    ),
    '#800080',
  )
})
