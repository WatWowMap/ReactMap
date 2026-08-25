import { describe, expect, test } from 'bun:test'
import {
  createSubscriptionState,
  GYM_POLL_INTERVAL_MS,
  POKEMON_POLL_INTERVAL_MS,
  pollIntervalForCategory,
  subscribeCategory,
  updateSubscription,
} from '../src/services/map-subscription'

const VIEWPORT_A = { min: { lat: 0, lon: 0 }, max: { lat: 1, lon: 1 } }
const VIEWPORT_B = { min: { lat: 10, lon: 10 }, max: { lat: 11, lon: 11 } }

/** A minimal fake `golbat-client.js` -- only the two methods `viewport-scanner.js` calls. */
function fakeGolbatClient({
  scanPokemon,
  scanForts,
}: {
  scanPokemon?: any
  scanForts?: any
} = {}) {
  return {
    scanPokemon:
      scanPokemon ?? (async () => ({ pokemon: [], limitReached: false })),
    scanForts:
      scanForts ??
      (async () => ({
        gyms: [],
        pokestops: [],
        stations: [],
        limitReached: false,
      })),
  }
}

/** Pulls `count` values off an async generator, then aborts via `signal`. */
async function take(generator: AsyncGenerator<any>, count: number) {
  const out: any[] = []
  for await (const value of generator) {
    out.push(value)
    if (out.length >= count) break
  }
  return out
}

describe('pollIntervalForCategory', () => {
  test('gyms poll slower than pokemon -- forts change rarely and never expire', () => {
    expect(pollIntervalForCategory('pokemon')).toBe(POKEMON_POLL_INTERVAL_MS)
    expect(pollIntervalForCategory('gym')).toBe(GYM_POLL_INTERVAL_MS)
  })
})

describe('createSubscriptionState / updateSubscription', () => {
  test('updateSubscription bumps generation and replaces viewport/filters', () => {
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
      filters: [],
    })
    expect(state.generation).toBe(0)
    updateSubscription(state, {
      viewport: VIEWPORT_B,
      filters: [{ pokemon: [{ id: 1 }] }],
    })
    expect(state.generation).toBe(1)
    expect(state.viewport).toBe(VIEWPORT_B)
    expect(state.filters).toEqual([{ pokemon: [{ id: 1 }] }])
  })

  test('updateSubscription calls a pending wake() to skip the rest of a sleep', () => {
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
    })
    let woken = false
    state.wake = () => {
      woken = true
    }
    updateSubscription(state, { viewport: VIEWPORT_B, filters: [] })
    expect(woken).toBe(true)
  })
})

describe('subscribeCategory', () => {
  test('the first yield is a real delta, even against an empty world', async () => {
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    const golbatClient = fakeGolbatClient()

    const [first] = await take(
      subscribeCategory({
        golbatClient,
        state,
        signal: controller.signal,
        pollIntervalMs: 10,
      }),
      1,
    )
    controller.abort()

    expect(first).toEqual({
      type: 'delta',
      category: 'pokemon',
      added: [],
      changed: [],
      removed: [],
    })
  })

  test('a later poll adds new entities and reports changed/removed for a stable viewport', async () => {
    let call = 0
    const golbatClient = fakeGolbatClient({
      scanPokemon: async () => {
        call += 1
        if (call === 1) {
          return {
            pokemon: [
              {
                id: 'a',
                pokemon_id: 1,
                updated: 1,
                expire_timestamp_verified: false,
              },
            ],
            limitReached: false,
          }
        }
        return {
          pokemon: [
            {
              id: 'a',
              pokemon_id: 1,
              updated: 2,
              expire_timestamp_verified: false,
            },
          ],
          limitReached: false,
        }
      },
    })
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()

    const [firstDelta, secondDelta] = await take(
      subscribeCategory({
        golbatClient,
        state,
        signal: controller.signal,
        pollIntervalMs: 10,
      }),
      2,
    )
    controller.abort()

    expect(firstDelta.added.map((e: any) => e.id)).toEqual(['a'])
    expect(secondDelta.added).toEqual([])
    expect(secondDelta.changed.map((e: any) => e.id)).toEqual(['a'])
    expect(secondDelta.removed).toEqual([])
  })

  test('a viewport change explicitly removes what the old viewport held, even when verified -- left the viewport, not expired', async () => {
    const golbatClient = fakeGolbatClient({
      scanPokemon: async ({ min }: { min: { lat: number; lon: number } }) => {
        if (min.lat >= 10) {
          return {
            pokemon: [
              {
                id: 'b',
                pokemon_id: 2,
                updated: 1,
                expire_timestamp_verified: true,
              },
            ],
            limitReached: false,
          }
        }
        return {
          pokemon: [
            {
              id: 'a',
              pokemon_id: 1,
              updated: 1,
              expire_timestamp_verified: true,
            },
          ],
          limitReached: false,
        }
      },
    })
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 5_000,
    })

    const first = await generator.next()
    expect((first.value as any).added.map((e: any) => e.id)).toEqual(['a'])

    // The generator is now asleep, waiting up to `pollIntervalMs` (5s) for
    // its next tick -- start that `.next()` call, then update the
    // subscription while it's pending so `state.wake()` short-circuits the
    // wait, rather than actually waiting out the full interval.
    const secondPending = generator.next()
    updateSubscription(state, { viewport: VIEWPORT_B, filters: [] })
    const second = await secondPending
    controller.abort()
    // Drain so the generator's `while` loop observes the abort and returns,
    // rather than leaving a dangling `setTimeout` behind.
    await generator.next().catch(() => {})

    expect((second.value as any).added.map((e: any) => e.id)).toEqual(['b'])
    // `a` never appears again after the viewport moved, and although its
    // fixture is verified-expiry (which `computeDelta` alone would treat as
    // silently the client's own problem), the viewport swap sends it as an
    // explicit removal -- see map-subscription.js's `subscribeCategory` doc
    // comment for why that departs from computeDelta's own rule 2.
    expect((second.value as any).removed).toEqual(['a'])
  })

  test('a truncated (limit_reached) poll never reports a removal', async () => {
    let call = 0
    const golbatClient = fakeGolbatClient({
      scanPokemon: async () => {
        call += 1
        if (call === 1) {
          return {
            pokemon: [
              {
                id: 'live',
                pokemon_id: 1,
                updated: 1,
                expire_timestamp_verified: false,
              },
            ],
            limitReached: false,
          }
        }
        // Every subdivided leaf still reports truncated -- viewport-scanner.js
        // subdivides up to its maxDepth and honestly reports `complete: false`.
        return { pokemon: [], limitReached: true }
      },
    })
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()

    const [firstDelta, secondDelta] = await take(
      subscribeCategory({
        golbatClient,
        state,
        signal: controller.signal,
        pollIntervalMs: 10,
      }),
      2,
    )
    controller.abort()

    expect(firstDelta.added.map((e: any) => e.id)).toEqual(['live'])
    expect(secondDelta.removed).toEqual([])
  })

  test('filters are enforced locally, not just trusted upstream', async () => {
    const golbatClient = fakeGolbatClient({
      scanPokemon: async () => ({
        pokemon: [
          {
            id: 'match',
            pokemon_id: 1,
            updated: 1,
            expire_timestamp_verified: false,
          },
          {
            id: 'no-match',
            pokemon_id: 99,
            updated: 1,
            expire_timestamp_verified: false,
          },
        ],
        limitReached: false,
      }),
    })
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: VIEWPORT_A,
      filters: [{ pokemon: [{ id: 1, form: null }] }],
    })
    const controller = new AbortController()

    const [delta] = await take(
      subscribeCategory({
        golbatClient,
        state,
        signal: controller.signal,
        pollIntervalMs: 10,
      }),
      1,
    )
    controller.abort()

    expect(delta.added.map((e: any) => e.id)).toEqual(['match'])
  })
})
