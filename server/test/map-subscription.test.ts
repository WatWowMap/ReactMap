import { describe, expect, test } from 'bun:test'
import {
  createSubscriptionState,
  GYM_POLL_INTERVAL_MS,
  injectIntoSubscription,
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

describe('updateSubscription while the loop is not sleeping', () => {
  test('a wake that arrives between yield and the next poll is not lost -- the generator is suspended at `yield`, so `state.wake` is null', async () => {
    const golbatClient = fakeGolbatClient({
      scanPokemon: async ({ min }: { min: { lat: number; lon: number } }) => ({
        pokemon: [
          {
            id: min.lat >= 10 ? 'b' : 'a',
            pokemon_id: 1,
            updated: 1,
            expire_timestamp_verified: true,
          },
        ],
        limitReached: false,
      }),
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
      // Long enough that sleeping it out is indistinguishable from a hang:
      // if the wake is dropped, this test times out rather than passing slowly.
      pollIntervalMs: 60_000,
    })

    const first = await generator.next()
    expect((first.value as any).added.map((e: any) => e.id)).toEqual(['a'])

    // Awaiting the first `next()` leaves the generator parked on its `yield`,
    // which is BEFORE `sleepOrWake` runs -- so `state.wake` is null here, every
    // time, with no race to lose. A wake recorded now has to survive until the
    // loop reaches its sleep, or the viewport move waits out the full interval.
    updateSubscription(state, { viewport: VIEWPORT_B, filters: [] })

    const second = await generator.next()
    controller.abort()
    await generator.next().catch(() => {})

    expect((second.value as any).added.map((e: any) => e.id)).toEqual(['b'])
    expect((second.value as any).removed).toEqual(['a'])
  })
})

// ---------------------------------------------------------------------------
// Task 6: webhook injections. A fort change pushed by Golbat is delivered by
// the SAME generator, folded into the SAME previousMap the poll diffs
// against, so the reconciliation poll and the push path cannot fight.
// ---------------------------------------------------------------------------

/** One value off a running generator, typed loosely for assertions. */
async function nextValue(generator: AsyncGenerator<any>): Promise<any> {
  const { value } = await generator.next()
  return value
}

function raidInjection(id: string, updated: number, extra: object = {}) {
  return {
    category: 'gym' as const,
    kind: 'upsert' as const,
    entity: { id, updated, lat: 0.5, lon: 0.5, raid_level: 5, ...extra },
  }
}

describe('injectIntoSubscription', () => {
  test('queues the injection and wakes a sleeping loop', () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    let woken = false
    state.wake = () => {
      woken = true
    }
    injectIntoSubscription(state, [raidInjection('g1', 10)])
    expect(state.injections.length).toBe(1)
    expect(woken).toBe(true)
  })

  test('records a wake that arrives while the loop is awake, like updateSubscription', () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    expect(state.wake).toBe(null)
    injectIntoSubscription(state, [raidInjection('g1', 10)])
    expect(state.wakePending).toBe(true)
  })

  test('an empty batch neither queues nor wakes', () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    injectIntoSubscription(state, [])
    expect(state.injections.length).toBe(0)
    expect(state.wakePending).toBe(false)
  })
})

describe('subscribeCategory: webhook injections', () => {
  test('an injected gym is delivered without any fort scan', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    let fortScans = 0
    const golbatClient = fakeGolbatClient({
      scanForts: async () => {
        fortScans += 1
        return { gyms: [], pokestops: [], stations: [], limitReached: false }
      },
    })

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 60_000,
      initialDelayMs: 60_000,
    })

    // The subscribe acknowledgement, before any sweep.
    const ack = await nextValue(generator)
    expect(ack).toEqual({
      type: 'delta',
      category: 'gym',
      added: [],
      changed: [],
      removed: [],
    })

    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    const injected = await nextValue(generator)
    controller.abort()

    expect(injected.added.map((g: any) => g.id)).toEqual(['g1'])
    expect(injected.changed).toEqual([])
    expect(fortScans).toBe(0)
  })

  test('a poll landing right after an injection does not re-report the gym as added', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    const gym = { id: 'g1', updated: 1000, lat: 0.5, lon: 0.5, raid_level: 5 }
    const golbatClient = fakeGolbatClient({
      scanForts: async () => ({
        gyms: [gym],
        pokestops: [],
        stations: [],
        limitReached: false,
      }),
    })

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 5,
      initialDelayMs: 60_000,
    })

    await generator.next() // ack
    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    const injected = await nextValue(generator)
    expect(injected.added.map((g: any) => g.id)).toEqual(['g1'])

    // The very next tick is a real reconciliation poll returning the same
    // gym at the same change stamp. If the injection had not been folded
    // into previousMap this would report it as `added` all over again.
    const poll = await nextValue(generator)
    controller.abort()
    expect(poll).toEqual({
      type: 'delta',
      category: 'gym',
      added: [],
      changed: [],
      removed: [],
    })
  })

  test('an injection queued before a pan is not delivered after it', async () => {
    // The registry matches an injection against the viewport it sees when
    // the webhook lands. The client can pan before the loop drains it, so
    // the drain matches again -- otherwise the gym goes out as `added` for
    // a viewport the client has already left, and the next sweep takes it
    // straight back off.
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    const golbatClient = fakeGolbatClient()

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 60_000,
      initialDelayMs: 60_000,
    })
    await generator.next() // ack

    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    updateSubscription(state, { viewport: VIEWPORT_B })

    // VIEWPORT_B holds no gyms, so the next value is the reconciliation
    // sweep for the new viewport rather than an added-then-removed g1.
    const next = await nextValue(generator)
    controller.abort()
    expect(next).toEqual({
      type: 'delta',
      category: 'gym',
      added: [],
      changed: [],
      removed: [],
    })
  })

  test('a webhook removal evicts a gym the subscription is holding', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    const golbatClient = fakeGolbatClient()

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 60_000,
      initialDelayMs: 60_000,
    })
    await generator.next() // ack

    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    await generator.next()

    injectIntoSubscription(state, [
      { category: 'gym', kind: 'remove', id: 'g1' },
    ])
    const removal = await nextValue(generator)
    controller.abort()

    expect(removal.removed).toEqual(['g1'])
  })

  test('a removal for a gym this subscription never held yields nothing at all', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    let fortScans = 0
    const golbatClient = fakeGolbatClient({
      scanForts: async () => {
        fortScans += 1
        return { gyms: [], pokestops: [], stations: [], limitReached: false }
      },
    })

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 5,
      initialDelayMs: 60_000,
    })
    await generator.next() // ack

    injectIntoSubscription(state, [
      { category: 'gym', kind: 'remove', id: 'never-seen' },
    ])
    // Nothing to say about a gym this connection was not tracking, so the
    // next value is the reconciliation poll, not an empty removal message.
    const next = await nextValue(generator)
    controller.abort()
    expect(next.removed).toEqual([])
    expect(fortScans).toBe(1)
  })
})

describe('subscribeCategory: gyms without fort_in_memory', () => {
  test('no fort scan is attempted when Golbat has already said fort_in_memory is off', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    let fortScans = 0
    const golbatClient = {
      ...fakeGolbatClient({
        scanForts: async () => {
          fortScans += 1
          return { gyms: [], pokestops: [], stations: [], limitReached: false }
        },
      }),
      isFortInMemoryEnabled: () => false,
    }

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 5,
      initialDelayMs: 0,
    })

    // Still a live subscription: it acks, and it still delivers webhooks.
    await generator.next()
    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    const injected = await nextValue(generator)
    controller.abort()

    expect(injected.added.map((g: any) => g.id)).toEqual(['g1'])
    expect(fortScans).toBe(0)
  })

  test('a fort scan that fails does not kill the subscription', async () => {
    const state = createSubscriptionState({
      category: 'gym',
      viewport: VIEWPORT_A,
    })
    const controller = new AbortController()
    let attempts = 0
    const golbatClient = fakeGolbatClient({
      scanForts: async () => {
        attempts += 1
        throw new Error('fort_in_memory not enabled')
      },
    })

    const generator = subscribeCategory({
      golbatClient,
      state,
      signal: controller.signal,
      pollIntervalMs: 5,
      initialDelayMs: 0,
    })

    await generator.next() // ack

    // Let the loop take a failing scan or two before the webhook lands, so
    // the assertion is that a thrown scan did not end the generator.
    const pending = nextValue(generator)
    await new Promise((resolve) => setTimeout(resolve, 25))
    injectIntoSubscription(state, [raidInjection('g1', 1000)])
    const injected = await pending
    controller.abort()

    expect(attempts).toBeGreaterThan(0)
    expect(injected.added.map((g: any) => g.id)).toEqual(['g1'])
  })
})
