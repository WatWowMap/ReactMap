import { beforeEach, expect, test } from 'bun:test'
import { useEntityStore } from './entity-store'
import type { DeltaMessage, RawEntity } from './wire'

function rawPokemon(overrides: RawEntity = {}): RawEntity {
  return {
    id: 'encounter-1',
    lat: 51.5,
    lon: -0.1,
    pokemon_id: 25,
    expire_timestamp: 1_700_000_000,
    expire_timestamp_verified: false,
    ...overrides,
  }
}

function delta(overrides: Partial<DeltaMessage> = {}): DeltaMessage {
  return {
    type: 'delta',
    category: 'pokemon',
    added: [],
    changed: [],
    removed: [],
    ...overrides,
  }
}

beforeEach(() => {
  useEntityStore.getState().clear()
})

test('applies added, changed and removed in one batch', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(
    delta({ added: [rawPokemon(), rawPokemon({ id: 'encounter-2' })] }),
  )
  expect(useEntityStore.getState().pokemon).toHaveLength(2)

  applyDelta(
    delta({
      changed: [rawPokemon({ id: 'encounter-1', pokemon_id: 26 })],
      removed: ['encounter-2'],
    }),
  )
  const { pokemon, pokemonById } = useEntityStore.getState()
  expect(pokemon).toHaveLength(1)
  expect(pokemonById['encounter-1']?.pokemonId).toBe(26)
  expect(pokemonById['encounter-2']).toBeUndefined()
})

test('re-delivering the same entity updates it rather than duplicating it', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(delta({ added: [rawPokemon()] }))
  applyDelta(delta({ added: [rawPokemon({ lat: 52 })] }))
  const { pokemon } = useEntityStore.getState()
  expect(pokemon).toHaveLength(1)
  expect(pokemon[0]?.lat).toBe(52)
})

test('an empty delta is acknowledged without touching the array', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(delta({ added: [rawPokemon()] }))
  const before = useEntityStore.getState().pokemon
  applyDelta(delta())
  expect(useEntityStore.getState().pokemon).toBe(before)
})

test('an empty gym delta is an acknowledgement, not an empty world', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(
    delta({
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 }],
    }),
  )
  applyDelta(delta({ category: 'gym' }))
  expect(useEntityStore.getState().gyms).toHaveLength(1)
})

test('a gym arriving only by webhook patch fills in over time', () => {
  const { applyDelta } = useEntityStore.getState()
  expect(useEntityStore.getState().gyms).toHaveLength(0)
  applyDelta(
    delta({
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 1 }],
    }),
  )
  applyDelta(
    delta({ category: 'gym', changed: [{ id: 'gym-1', in_battle: true }] }),
  )
  const gym = useEntityStore.getState().gymsById['gym-1']
  expect(gym).toEqual({
    kind: 'gym',
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 1,
    inBattle: true,
  })
})

test('one delta produces exactly one new array', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(delta({ added: [rawPokemon()] }))
  const first = useEntityStore.getState().pokemon
  expect(useEntityStore.getState().pokemon).toBe(first)
  applyDelta(delta({ added: [rawPokemon({ id: 'encounter-2' })] }))
  expect(useEntityStore.getState().pokemon).not.toBe(first)
})

test('a delta in one category leaves the other array alone', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(
    delta({
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 }],
    }),
  )
  const gyms = useEntityStore.getState().gyms
  applyDelta(delta({ added: [rawPokemon()] }))
  expect(useEntityStore.getState().gyms).toBe(gyms)
})

test('a verified expiry self-evicts on the client clock', () => {
  const { applyDelta, evictExpired } = useEntityStore.getState()
  applyDelta(
    delta({
      added: [
        rawPokemon({
          id: 'verified',
          expire_timestamp: 1_000,
          expire_timestamp_verified: true,
        }),
      ],
    }),
  )
  // expire_timestamp is seconds; expiresAt is milliseconds.
  evictExpired(1_000_001)
  expect(useEntityStore.getState().pokemon).toHaveLength(0)
})

test('an unverified expiry never self-evicts', () => {
  const { applyDelta, evictExpired } = useEntityStore.getState()
  applyDelta(
    delta({
      added: [
        rawPokemon({
          id: 'unverified',
          expire_timestamp: 1_000,
          expire_timestamp_verified: false,
        }),
      ],
    }),
  )
  evictExpired(999_999_999)
  expect(useEntityStore.getState().pokemon).toHaveLength(1)
})

test('eviction with nothing expired leaves the array reference alone', () => {
  const { applyDelta, evictExpired } = useEntityStore.getState()
  applyDelta(
    delta({
      added: [
        rawPokemon({
          expire_timestamp: 1_000,
          expire_timestamp_verified: true,
        }),
      ],
    }),
  )
  const before = useEntityStore.getState().pokemon
  evictExpired(500_000)
  expect(useEntityStore.getState().pokemon).toBe(before)
})

test('gyms never self-evict', () => {
  const { applyDelta, evictExpired } = useEntityStore.getState()
  applyDelta(
    delta({
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 }],
    }),
  )
  evictExpired(Number.MAX_SAFE_INTEGER)
  expect(useEntityStore.getState().gyms).toHaveLength(1)
})

test('an untranslatable row is dropped without disturbing the batch', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(
    delta({ added: [rawPokemon({ lat: null }), rawPokemon({ id: 'ok' })] }),
  )
  expect(useEntityStore.getState().pokemon).toHaveLength(1)
})

test('a re-fired webhook patch that changes nothing leaves the array alone', () => {
  const { applyDelta } = useEntityStore.getState()
  const gym = { id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2, in_battle: 0 }
  applyDelta(delta({ category: 'gym', added: [gym] }))
  const gyms = useEntityStore.getState().gyms
  const entity = useEntityStore.getState().gymsById['gym-1']

  // The shape `applyInjections` emits for a routine `fort_update` re-scan:
  // `changed`, because the gym is already in the connection's map, and with
  // every field identical to what the client holds.
  applyDelta(delta({ category: 'gym', changed: [{ ...gym }] }))
  expect(useEntityStore.getState().gyms).toBe(gyms)
  expect(useEntityStore.getState().gymsById['gym-1']).toBe(entity)

  // A partial patch that only re-states what is already known is the same
  // non-event, even though it carries fewer fields than the store holds.
  applyDelta(delta({ category: 'gym', changed: [{ id: 'gym-1', team_id: 2 }] }))
  expect(useEntityStore.getState().gyms).toBe(gyms)

  // A patch that genuinely moves the team still lands.
  applyDelta(delta({ category: 'gym', changed: [{ id: 'gym-1', team_id: 3 }] }))
  expect(useEntityStore.getState().gyms).not.toBe(gyms)
  expect(useEntityStore.getState().gymsById['gym-1']?.team).toBe(3)
})

test('an unchanged gym in a batch does not suppress a changed one', () => {
  const { applyDelta } = useEntityStore.getState()
  applyDelta(
    delta({
      category: 'gym',
      added: [
        { id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 },
        { id: 'gym-2', lat: 51.6, lon: -0.2, team_id: 1 },
      ],
    }),
  )
  const gyms = useEntityStore.getState().gyms
  applyDelta(
    delta({
      category: 'gym',
      changed: [
        { id: 'gym-1', team_id: 2 },
        { id: 'gym-2', team_id: 3 },
      ],
    }),
  )
  expect(useEntityStore.getState().gyms).not.toBe(gyms)
  expect(useEntityStore.getState().gymsById['gym-2']?.team).toBe(3)
})

test('a batch with rows the translator refuses says how many it discarded', () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)

  try {
    useEntityStore.getState().applyDelta(
      delta({
        added: [
          rawPokemon({ id: 'kept' }),
          // A renamed or retyped Golbat field arrives looking like this.
          // Nothing can key it, so it never reaches the map, and without a
          // warning that is indistinguishable from an empty area.
          rawPokemon({ id: undefined }),
          rawPokemon({ id: 'no-species', pokemon_id: undefined }),
        ],
      }),
    )
  } finally {
    console.warn = original
  }

  expect(useEntityStore.getState().pokemon).toHaveLength(1)
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toContain('discarded 2 of 3 pokemon rows')
})

test('a batch every row of which translated says nothing', () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)

  try {
    useEntityStore
      .getState()
      .applyDelta(delta({ added: [rawPokemon({ id: 'a' })] }))
  } finally {
    console.warn = original
  }

  expect(warnings).toHaveLength(0)
})
