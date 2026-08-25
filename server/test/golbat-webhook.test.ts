import { describe, expect, test } from 'bun:test'
import {
  parseGolbatWebhookBatch,
  secretMatches,
} from '../src/services/golbat-webhook'

/** golbat/decoder/gym_state.go:165-195 (RaidWebhook json tags). */
function raidMessage(overrides: Record<string, any> = {}) {
  return {
    gym_id: 'gym-1',
    gym_name: 'Fixture Gym',
    gym_url: 'https://example.invalid/gym.png',
    latitude: 12.34,
    longitude: 56.78,
    team_id: 1,
    spawn: 1_700_000_000,
    start: 1_700_000_100,
    end: 1_700_002_700,
    level: 5,
    pokemon_id: 150,
    cp: 12345,
    gender: 1,
    form: 0,
    alignment: 0,
    costume: 0,
    evolution: 0,
    move_1: 200,
    move_2: 13,
    ex_raid_eligible: 0,
    is_exclusive: 0,
    sponsor_id: 0,
    partner_id: '',
    power_up_points: 0,
    power_up_level: 0,
    power_up_end_timestamp: 0,
    ar_scan_eligible: 1,
    rsvps: null,
    raid_seed: null,
    ...overrides,
  }
}

/** golbat/decoder/gym_state.go:145-163 (GymDetailsWebhook json tags). */
function gymDetailsMessage(overrides: Record<string, any> = {}) {
  return {
    id: 'gym-2',
    name: 'Detailed Gym',
    url: 'https://example.invalid/gym2.png',
    latitude: 1.5,
    longitude: 2.5,
    team: 2,
    guard_pokemon_id: 99,
    slots_available: 3,
    ex_raid_eligible: 1,
    in_battle: true,
    sponsor_id: 0,
    partner_id: 0,
    power_up_points: 10,
    power_up_level: 1,
    power_up_end_timestamp: 1_700_003_000,
    ar_scan_eligible: 0,
    defenders: null,
    ...overrides,
  }
}

/** golbat/decoder/fort.go:23-38 (FortWebhook / FortChangeWebhook json tags). */
function fortWebhook(overrides: Record<string, any> = {}) {
  return {
    id: 'gym-3',
    type: 'gym',
    name: 'Renamed Gym',
    description: 'now with a description',
    image_url: 'https://example.invalid/gym3.png',
    location: { lat: 3.5, lon: 4.5 },
    ...overrides,
  }
}

describe('parseGolbatWebhookBatch: raid', () => {
  test('a raid payload becomes a gym upsert carrying the raid fields', () => {
    const injections = parseGolbatWebhookBatch([
      { type: 'raid', message: raidMessage() },
    ])

    expect(injections.length).toBe(1)
    const injection = injections[0] as any
    expect(injection.kind).toBe('upsert')
    expect(injection.category).toBe('gym')

    const gym = injection.entity
    expect(gym.id).toBe('gym-1')
    expect(gym.lat).toBe(12.34)
    expect(gym.lon).toBe(56.78)
    expect(gym.raid_level).toBe(5)
    expect(gym.raid_pokemon_id).toBe(150)
    expect(gym.raid_pokemon_cp).toBe(12345)
    expect(gym.raid_pokemon_move_1).toBe(200)
    expect(gym.raid_pokemon_move_2).toBe(13)
    expect(gym.raid_spawn_timestamp).toBe(1_700_000_000)
    expect(gym.raid_battle_timestamp).toBe(1_700_000_100)
    expect(gym.raid_end_timestamp).toBe(1_700_002_700)
    expect(gym.team_id).toBe(1)
    expect(gym.name).toBe('Fixture Gym')
    expect(gym.url).toBe('https://example.invalid/gym.png')
    expect(typeof gym.updated).toBe('number')
  })

  test('a raid payload carries no gym-details fields -- it is a patch, not a whole gym', () => {
    const [injection] = parseGolbatWebhookBatch([
      { type: 'raid', message: raidMessage() },
    ])
    const gym = (injection as any).entity
    expect('guarding_pokemon_id' in gym).toBe(false)
    expect('available_slots' in gym).toBe(false)
  })

  test('a raid with no gym_id is dropped rather than injected under an empty id', () => {
    expect(
      parseGolbatWebhookBatch([
        { type: 'raid', message: raidMessage({ gym_id: '' }) },
      ]),
    ).toEqual([])
  })
})

describe('parseGolbatWebhookBatch: gym_details', () => {
  test('gym_details uses `id`/`team`, not the raid payload`s `gym_id`/`team_id`', () => {
    const [injection] = parseGolbatWebhookBatch([
      { type: 'gym_details', message: gymDetailsMessage() },
    ])
    const gym = (injection as any).entity
    expect(gym.id).toBe('gym-2')
    expect(gym.team_id).toBe(2)
    expect(gym.lat).toBe(1.5)
    expect(gym.lon).toBe(2.5)
    expect(gym.guarding_pokemon_id).toBe(99)
    expect(gym.available_slots).toBe(3)
  })

  test('in_battle is a bool upstream and an int in the scan response shape', () => {
    const [injection] = parseGolbatWebhookBatch([
      { type: 'gym_details', message: gymDetailsMessage({ in_battle: true }) },
    ])
    expect((injection as any).entity.in_battle).toBe(1)
  })

  test('gym_details carries no raid fields', () => {
    const [injection] = parseGolbatWebhookBatch([
      { type: 'gym_details', message: gymDetailsMessage() },
    ])
    expect('raid_level' in (injection as any).entity).toBe(false)
  })
})

describe('parseGolbatWebhookBatch: fort_update', () => {
  test('an edit to a gym becomes an upsert of the fields fort_update actually tracks', () => {
    const [injection] = parseGolbatWebhookBatch([
      {
        type: 'fort_update',
        message: {
          change_type: 'edit',
          edit_types: ['name'],
          old: fortWebhook({ name: 'Old Name' }),
          new: fortWebhook(),
        },
      },
    ])
    const gym = (injection as any).entity
    expect(gym.id).toBe('gym-3')
    expect(gym.name).toBe('Renamed Gym')
    expect(gym.description).toBe('now with a description')
    expect(gym.url).toBe('https://example.invalid/gym3.png')
    expect(gym.lat).toBe(3.5)
    expect(gym.lon).toBe(4.5)
    // fort_update tracks name/description/image/location only.
    expect('raid_level' in gym).toBe(false)
  })

  test('a removal becomes a removal injection, not an upsert', () => {
    const [injection] = parseGolbatWebhookBatch([
      {
        type: 'fort_update',
        message: { change_type: 'removal', old: fortWebhook() },
      },
    ])
    expect(injection).toEqual({
      category: 'gym',
      kind: 'remove',
      id: 'gym-3',
    })
  })

  test('a new gym becomes an upsert', () => {
    const [injection] = parseGolbatWebhookBatch([
      {
        type: 'fort_update',
        message: { change_type: 'new', new: fortWebhook({ id: 'gym-4' }) },
      },
    ]) as any[]
    expect(injection.kind).toBe('upsert')
    expect((injection as any).entity.id).toBe('gym-4')
  })

  test('pokestop and station forts are ignored -- neither is a subscribable category yet', () => {
    expect(
      parseGolbatWebhookBatch([
        {
          type: 'fort_update',
          message: {
            change_type: 'new',
            new: fortWebhook({ type: 'pokestop' }),
          },
        },
        {
          type: 'fort_update',
          message: {
            change_type: 'removal',
            old: fortWebhook({ type: 'station' }),
          },
        },
      ]),
    ).toEqual([])
  })
})

describe('parseGolbatWebhookBatch: malformed and unhandled input', () => {
  test('a non-array body yields nothing rather than throwing', () => {
    expect(parseGolbatWebhookBatch({ type: 'raid' } as any)).toEqual([])
    expect(parseGolbatWebhookBatch(null as any)).toEqual([])
    expect(parseGolbatWebhookBatch('raid' as any)).toEqual([])
  })

  test('an unknown type string is skipped without killing the rest of the batch', () => {
    const injections = parseGolbatWebhookBatch([
      { type: 'not_a_real_golbat_type', message: { anything: true } },
      { type: 'raid', message: raidMessage() },
    ])
    expect(injections.length).toBe(1)
    expect((injections[0] as any).entity.id).toBe('gym-1')
  })

  test('known non-fort types are skipped -- no category subscribes to them yet', () => {
    expect(
      parseGolbatWebhookBatch([
        { type: 'pokemon', message: { pokemon_id: 1 } },
        { type: 'quest', message: {} },
        { type: 'weather', message: {} },
        { type: 'invasion', message: {} },
      ]),
    ).toEqual([])
  })

  test('entries with a missing or non-object message are skipped', () => {
    expect(
      parseGolbatWebhookBatch([
        { type: 'raid' },
        { type: 'raid', message: null },
        { type: 'raid', message: 'nope' },
        null,
        42,
      ] as any),
    ).toEqual([])
  })
})

describe('secretMatches', () => {
  test('an exact match passes', () => {
    expect(secretMatches('s3cret', 's3cret')).toBe(true)
  })

  test('a wrong secret of the same length fails', () => {
    expect(secretMatches('s3cret', 's3cres')).toBe(false)
  })

  test('a wrong secret of a different length fails without throwing', () => {
    expect(secretMatches('s3cret', 's3cretttttt')).toBe(false)
    expect(secretMatches('s3cret', 's')).toBe(false)
  })

  test('a missing header fails', () => {
    expect(secretMatches('s3cret', null)).toBe(false)
    expect(secretMatches('s3cret', '')).toBe(false)
  })

  test("Golbat's un-trimmed header value still matches", () => {
    // config/reader.go:163-175 splits on ':' and does not trim, so a
    // configured "X-Foo: bar" is sent as the value " bar".
    expect(secretMatches('s3cret', ' s3cret')).toBe(true)
  })
})
