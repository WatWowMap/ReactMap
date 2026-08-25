import { describe, expect, test } from 'bun:test'
import {
  computeDelta,
  getChangeStamp,
  selfEvicts,
} from '../src/services/delta-engine'

// ---------------------------------------------------------------------------
// getChangeStamp / selfEvicts -- the two field readers the diff is built on.
// ---------------------------------------------------------------------------
describe('getChangeStamp', () => {
  test('reads updated, not changed', () => {
    expect(getChangeStamp({ id: '1', updated: 100, changed: 999 })).toBe(100)
  })

  test('missing/non-numeric updated falls back to 0 rather than NaN', () => {
    expect(getChangeStamp({ id: '1' })).toBe(0)
    expect(getChangeStamp({ id: '1', updated: 'not-a-number' })).toBe(0)
  })
})

describe('selfEvicts', () => {
  test('true only when expire_timestamp_verified is exactly true', () => {
    expect(selfEvicts({ expire_timestamp_verified: true })).toBe(true)
    expect(selfEvicts({ expire_timestamp_verified: false })).toBe(false)
    expect(selfEvicts({ expire_timestamp_verified: 1 })).toBe(false)
    // Forts carry no such field at all -- they always fall through to an
    // explicit server-sent removal.
    expect(selfEvicts({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// computeDelta -- the pure diff, verification items 1-3 and 5-6 from the
// Task 4 brief.
// ---------------------------------------------------------------------------
describe('computeDelta', () => {
  test('1: first poll against an empty previous map returns everything as added', () => {
    const entities = [
      { id: 'a', updated: 1 },
      { id: 'b', updated: 1 },
    ]
    const { added, changed, removed, nextMap } = computeDelta(
      new Map(),
      entities,
    )
    expect(added).toEqual(entities)
    expect(changed).toEqual([])
    expect(removed).toEqual([])
    expect(nextMap.size).toBe(2)
    expect(nextMap.get('a')).toEqual({ stamp: 1, selfEvicts: false })
  })

  test('2: an unchanged second poll returns nothing at all', () => {
    const entities = [{ id: 'a', updated: 1 }]
    const first = computeDelta(new Map(), entities)
    const second = computeDelta(first.nextMap, entities)
    expect(second.added).toEqual([])
    expect(second.changed).toEqual([])
    expect(second.removed).toEqual([])
    expect(second.nextMap.get('a')).toEqual({ stamp: 1, selfEvicts: false })
  })

  test('3: appears -> added, stamp advances -> changed, absent from a complete poll -> removed', () => {
    const previous = new Map([
      ['stale', { stamp: 5, selfEvicts: false }],
      ['stable', { stamp: 5, selfEvicts: false }],
    ])
    const entities = [
      { id: 'stable', updated: 5 },
      { id: 'new', updated: 5 },
      { id: 'stale', updated: 9 },
    ]
    const { added, changed, removed } = computeDelta(previous, entities, {
      complete: true,
    })
    expect(added).toEqual([{ id: 'new', updated: 5 }])
    expect(changed).toEqual([{ id: 'stale', updated: 9 }])
    expect(removed).toEqual([])
  })

  test('an entity present previously and genuinely absent from a complete poll is removed', () => {
    const previous = new Map([['gone', { stamp: 5, selfEvicts: false }]])
    const { removed, nextMap } = computeDelta(previous, [], {
      complete: true,
    })
    expect(removed).toEqual(['gone'])
    expect(nextMap.has('gone')).toBe(false)
  })

  test('4: an incomplete (truncated) poll never produces a removal, even for a missing id', () => {
    const previous = new Map([['held', { stamp: 5, selfEvicts: false }]])
    const { removed, nextMap } = computeDelta(previous, [], {
      complete: false,
    })
    expect(removed).toEqual([])
    // Carried forward so a later complete poll still gets to decide.
    expect(nextMap.get('held')).toEqual({ stamp: 5, selfEvicts: false })
  })

  test('4b: added/changed still fire for entities an incomplete poll did return', () => {
    const previous = new Map([['a', { stamp: 1, selfEvicts: false }]])
    const { added, changed } = computeDelta(
      previous,
      [
        { id: 'a', updated: 2 },
        { id: 'b', updated: 1 },
      ],
      { complete: false },
    )
    expect(changed).toEqual([{ id: 'a', updated: 2 }])
    expect(added).toEqual([{ id: 'b', updated: 1 }])
  })

  test('5: a verified-expiry entity going missing is not sent as a removal', () => {
    const previous = new Map([['v', { stamp: 5, selfEvicts: true }]])
    const { removed, nextMap } = computeDelta(previous, [], {
      complete: true,
    })
    expect(removed).toEqual([])
    expect(nextMap.has('v')).toBe(false)
  })

  test('5b: an unverified-expiry entity going missing IS sent as a removal', () => {
    const previous = new Map([['u', { stamp: 5, selfEvicts: false }]])
    const { removed } = computeDelta(previous, [], { complete: true })
    expect(removed).toEqual(['u'])
  })

  test('6: a local predicate rejecting an entity keeps it out of added entirely', () => {
    const rejected = { id: 'excluded', updated: 1, pokemon_id: 13 }
    const kept = { id: 'kept', updated: 1, pokemon_id: 1 }
    const { added, nextMap } = computeDelta(new Map(), [rejected, kept], {
      localFilter: (e) => e.pokemon_id !== 13,
    })
    expect(added).toEqual([kept])
    expect(nextMap.has('excluded')).toBe(false)
    expect(nextMap.has('kept')).toBe(true)
  })

  test('6b: a local predicate rejecting a previously-tracked entity removes it, once, without adding it back', () => {
    // Simulates a rule change: the entity used to match, now fails locally.
    const previous = new Map([['x', { stamp: 1, selfEvicts: false }]])
    const stillReturnedByGolbat = { id: 'x', updated: 1, pokemon_id: 13 }
    const { added, changed, removed, nextMap } = computeDelta(
      previous,
      [stillReturnedByGolbat],
      { localFilter: (e) => e.pokemon_id !== 13, complete: true },
    )
    expect(added).toEqual([])
    expect(changed).toEqual([])
    expect(removed).toEqual(['x'])
    expect(nextMap.has('x')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 7: two connections with different rules against the same viewport --
// disjoint per-connection state (Map instances) plus per-connection
// localFilter is enough to guarantee this without any coalescing.
// ---------------------------------------------------------------------------
test('7: two connections with different rules receive disjoint added sets from one shared poll', () => {
  const upstreamResult = [
    { id: 'pidgey-1', updated: 1, pokemon_id: 16 },
    { id: 'rattata-1', updated: 1, pokemon_id: 19 },
  ]

  const connectionA = { map: new Map(), wantsSpecies: 16 } // tracks Pidgey only
  const connectionB = { map: new Map(), wantsSpecies: 19 } // tracks Rattata only

  const deltaA = computeDelta(connectionA.map, upstreamResult, {
    localFilter: (e) => e.pokemon_id === connectionA.wantsSpecies,
  })
  const deltaB = computeDelta(connectionB.map, upstreamResult, {
    localFilter: (e) => e.pokemon_id === connectionB.wantsSpecies,
  })

  expect(deltaA.added.map((e) => e.id)).toEqual(['pidgey-1'])
  expect(deltaB.added.map((e) => e.id)).toEqual(['rattata-1'])
  // Neither connection's map ever learns about the other's entity.
  expect(deltaA.nextMap.has('rattata-1')).toBe(false)
  expect(deltaB.nextMap.has('pidgey-1')).toBe(false)
})
