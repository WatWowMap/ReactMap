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
        form: 0,
        costume: 0,
        min_iv: 90,
        max_iv: 100,
        min_cp: 0,
        max_cp: 4096,
        min_level: 1,
        max_level: 40,
        atk: 0,
        max_atk: 15,
        def: 0,
        max_def: 15,
        sta: 0,
        max_sta: 15,
        gender: 0,
        min_weight: 0,
        max_weight: 9999999,
        min_time: 0,
        rarity: -1,
        max_rarity: 6,
        size: -1,
        max_size: 5,
        pvp_ranking_league: 0,
        pvp_ranking_best: 1,
        pvp_ranking_worst: 4096,
        pvp_ranking_min_cp: 1,
        pvp_ranking_cap: 0,
        override_location_label: null,
        description: 'Dragonite 90%+',
      },
    ],
    raid: [],
  },
  profiles: [{ profile_no: 2, name: 'default' }],
  locations: { locations: [{ label: 'work', latitude: 1, longitude: 2 }] },
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
    ivMax: 100,
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
