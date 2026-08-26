import { expect, test } from 'bun:test'
import { toAlertsSnapshot } from './poracle-view'

const SNAPSHOT = {
  human: {
    id: '123',
    name: 'someone',
    enabled: 1,
    current_profile_no: 2,
    latitude: 42.35,
    longitude: -71.06,
    area: '["downtown"]',
    // Fields a client must never receive:
    admin_disable: 0,
    blocked_alerts: '[]',
    community_membership: '[]',
  },
  tracking: {
    pokemon: [
      {
        uid: 7,
        id: '123',
        profile_no: 2,
        ping: '<@123>',
        clean: 1,
        distance: 5000,
        template: 'default',
        pokemon_id: 149,
        // Every filter this rule does not use arrives as JSON `null`, never as
        // the stored sentinel: Poracle's v2 surface projects a column sitting
        // at its documented wildcard through `ptrUnless` before it answers
        // (`pokemonRowToRule`, PoracleNG's `v2_pokemon.go`, and the snapshot
        // endpoint reuses that same projection). A fixture full of `0`/`-1`/`6`
        // is a shape the wire cannot produce, and it hides the one case that
        // matters -- see the costume tests below.
        form: null,
        costume: null,
        min_iv: 90,
        max_iv: null,
        min_cp: null,
        max_cp: 4096,
        min_level: 1,
        max_level: 40,
        atk: null,
        max_atk: null,
        def: null,
        max_def: null,
        sta: null,
        max_sta: null,
        gender: null,
        min_weight: null,
        max_weight: null,
        min_time: null,
        rarity: null,
        max_rarity: null,
        size: null,
        max_size: null,
        pvp_ranking_league: null,
        pvp_ranking_best: null,
        pvp_ranking_worst: null,
        pvp_ranking_min_cp: 1,
        pvp_ranking_cap: null,
        override_location_label: null,
        description: 'Dragonite 90%+',
      },
    ],
    raid: [],
  },
  profiles: [{ profile_no: 2, name: 'default' }],
  // Poracle's real container: `{ default?, named[] }` (locations.go). The
  // default is the human's own latitude/longitude, which HumanView carries.
  locations: {
    default: { latitude: 3, longitude: 4 },
    named: [{ label: 'work', latitude: 1, longitude: 2 }],
  },
  summaries: [],
  mutes: [],
}

test('maps a monster row into the view model', () => {
  const view = toAlertsSnapshot(SNAPSHOT)
  expect(view.alerts).toHaveLength(1)
  expect(view.alerts[0]).toMatchObject({
    uid: 7,
    pokemonId: 149,
    ivMin: 90,
    ivMax: null,
    clean: true,
    distance: 5000,
    description: 'Dragonite 90%+',
  })
})

test('drops every field the client has no business seeing', () => {
  // This is the whole point of the module. Under GraphQL, unknown fields were
  // pruned by the schema; tRPC returns whatever it is handed.
  const serialised = JSON.stringify(toAlertsSnapshot(SNAPSHOT))
  for (const leak of [
    'admin_disable',
    'blocked_alerts',
    'community_membership',
    'poracleSecret',
  ]) {
    expect(serialised).not.toContain(leak)
  }
})

test('the output carries exactly its declared keys and nothing else', () => {
  // The denylist above only catches fields somebody thought to name. This
  // catches the ones nobody did, which is the case that actually bites:
  // Poracle adds a column, the mapper spreads it through, and no test fails.
  const view = toAlertsSnapshot(SNAPSHOT)
  expect(Object.keys(view).sort()).toEqual([
    'alerts',
    'human',
    'locations',
    'profiles',
  ])
  expect(Object.keys(view.human).sort()).toEqual([
    'areas',
    'currentProfileNo',
    'enabled',
    'latitude',
    'longitude',
  ])
  expect(Object.keys(view.alerts[0] ?? {}).sort()).toEqual([
    'atkMax',
    'atkMin',
    'clean',
    'costume',
    'cpMax',
    'cpMin',
    'defMax',
    'defMin',
    'description',
    'distance',
    'form',
    'gender',
    'ivMax',
    'ivMin',
    'levelMax',
    'levelMin',
    'minTime',
    'overrideLocationLabel',
    'ping',
    'pokemonId',
    'profileNo',
    'pvpCap',
    'pvpLeague',
    'pvpMinCp',
    'pvpRankBest',
    'pvpRankWorst',
    'rarityMax',
    'rarityMin',
    'sizeMax',
    'sizeMin',
    'staMax',
    'staMin',
    'template',
    'uid',
    'weightMax',
    'weightMin',
  ])
  // Poracle's profile row carries the human's id, saved coordinates and area
  // alongside the two fields wanted here. A spreading mapper would put a
  // Discord id and a home location on the wire.
  expect(Object.keys(view.profiles[0] ?? {}).sort()).toEqual([
    'name',
    'profileNo',
  ])
  expect(Object.keys(view.locations[0] ?? {}).sort()).toEqual([
    'label',
    'latitude',
    'longitude',
  ])
})

test('a field Poracle adds later does not reach the client', () => {
  // The inverse of the mapping rule, stated directly. An implementation that
  // spreads the source row passes every other test in this file and fails
  // this one.
  const withNewField = {
    ...SNAPSHOT,
    human: { ...SNAPSHOT.human, some_future_column: 'leaked' },
    tracking: {
      ...SNAPSHOT.tracking,
      pokemon: [{ ...SNAPSHOT.tracking.pokemon[0], another_new_one: 'leaked' }],
    },
    profiles: [{ ...SNAPSHOT.profiles[0], id: 'leaked', latitude: 'leaked' }],
    locations: {
      named: [{ ...SNAPSHOT.locations.named[0], extra: 'leaked' }],
    },
  }
  expect(JSON.stringify(toAlertsSnapshot(withNewField))).not.toContain('leaked')
})

test('only the pokemon tracking type crosses the boundary', () => {
  // Pokemon only, per the spec. A raid array arriving must not appear.
  expect(JSON.stringify(toAlertsSnapshot(SNAPSHOT))).not.toContain('raid')
})

test('reads the human areas out of the JSON string Poracle stores', () => {
  expect(toAlertsSnapshot(SNAPSHOT).human.areas).toEqual(['downtown'])
})

test('a malformed area string yields no areas rather than throwing', () => {
  const bad = { ...SNAPSHOT, human: { ...SNAPSHOT.human, area: 'not json' } }
  expect(toAlertsSnapshot(bad).human.areas).toEqual([])
})

test('a rule Poracle did not stamp a profile onto is profile 0, not a guess', () => {
  // Poracle stamps profile_no only in the snapshot's all_profiles mode, which
  // is the mode this router reads in, so a rule without one is a rule from
  // some other response shape. 0 says "unknown" rather than quietly reading
  // the row's position in the list or the human's active profile, either of
  // which would be a profile number that looks real and is not.
  const snapshot = toAlertsSnapshot({
    human: { current_profile_no: 2 },
    tracking: {
      pokemon: [
        { uid: 1, pokemon_id: 25 },
        { uid: 2, pokemon_id: 26 },
        { uid: 3, profile_no: 4, pokemon_id: 27 },
      ],
    },
  })
  expect(snapshot.alerts.map((alert) => alert.profileNo)).toEqual([0, 0, 4])
})

test('a null costume stays null rather than collapsing to "no costume"', () => {
  // The one column where the wildcard and a real filter value are different
  // numbers: Poracle stores 9000 for "any costume" and 0 for "uncostumed", so
  // `null` on the wire means 9000, not 0 (`pokemonRowToRule`, and the matcher
  // in PoracleNG's `processor/internal/matching/pokemon.go`). Reading it with
  // the non-nullable `num()` turned every "any costume" rule into an
  // "uncostumed only" rule the moment it was read back and saved.
  expect(toAlertsSnapshot(SNAPSHOT).alerts[0]?.costume).toBeNull()
})

test('a costume of 0 is kept, because 0 is a filter and not an absence', () => {
  const uncostumed = {
    ...SNAPSHOT,
    tracking: {
      ...SNAPSHOT.tracking,
      pokemon: [{ ...SNAPSHOT.tracking.pokemon[0], costume: 0 }],
    },
  }
  expect(toAlertsSnapshot(uncostumed).alerts[0]?.costume).toBe(0)
})
