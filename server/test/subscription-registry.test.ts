import { describe, expect, test } from 'bun:test'
import { createSubscriptionState } from '../src/services/map-subscription'
import { createSubscriptionRegistry } from '../src/services/subscription-registry'

const SMALL_VIEWPORT = { min: { lat: 0, lon: 0 }, max: { lat: 10, lon: 10 } }
const FAR_VIEWPORT = { min: { lat: 50, lon: 50 }, max: { lat: 60, lon: 60 } }

function gymState(viewport = SMALL_VIEWPORT, filters: object[] = []) {
  return createSubscriptionState({ category: 'gym', viewport, filters })
}

function upsert(id: string, lat: number, lon: number, extra: object = {}) {
  return {
    category: 'gym' as const,
    kind: 'upsert' as const,
    entity: { id, lat, lon, updated: 1000, ...extra },
  }
}

describe('createSubscriptionRegistry', () => {
  test('a pushed gym reaches a gym subscription whose viewport contains it', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState()
    registry.register({ category: 'gym', state })

    registry.dispatch([upsert('g1', 5, 5)])

    expect(state.injections.length).toBe(1)
    expect(state.wakePending).toBe(true)
  })

  test('a gym outside the viewport is not delivered', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState(FAR_VIEWPORT)
    registry.register({ category: 'gym', state })

    registry.dispatch([upsert('g1', 5, 5)])

    expect(state.injections).toEqual([])
    expect(state.wakePending).toBe(false)
  })

  test('a viewport crossing the antimeridian still contains the forts inside it', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState({
      min: { lat: 0, lon: 170 },
      max: { lat: 10, lon: -170 },
    })
    registry.register({ category: 'gym', state })

    registry.dispatch([upsert('inside', 5, 179), upsert('outside', 5, 0)])

    expect(state.injections.map((i: any) => i.entity.id)).toEqual(['inside'])
  })

  test("a gym the subscription's filters reject is not delivered", () => {
    const registry = createSubscriptionRegistry()
    const state = gymState(SMALL_VIEWPORT, [{ raid_level: [5] }])
    registry.register({ category: 'gym', state })

    registry.dispatch([upsert('g1', 5, 5, { raid_level: 1 })])

    expect(state.injections).toEqual([])
  })

  test('a pokemon subscription never sees a gym injection', () => {
    const registry = createSubscriptionRegistry()
    const state = createSubscriptionState({
      category: 'pokemon',
      viewport: SMALL_VIEWPORT,
    })
    registry.register({ category: 'pokemon', state })

    registry.dispatch([upsert('g1', 5, 5)])

    expect(state.injections).toEqual([])
  })

  test('a removal goes to every gym subscription -- only the loop knows who held it', () => {
    const registry = createSubscriptionRegistry()
    const near = gymState()
    const far = gymState(FAR_VIEWPORT)
    registry.register({ category: 'gym', state: near })
    registry.register({ category: 'gym', state: far })

    registry.dispatch([{ category: 'gym', kind: 'remove', id: 'g1' }])

    expect(near.injections.length).toBe(1)
    expect(far.injections.length).toBe(1)
  })

  test('a gym with no coordinates is delivered rather than silently dropped', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState()
    registry.register({ category: 'gym', state })

    registry.dispatch([
      {
        category: 'gym',
        kind: 'upsert',
        entity: { id: 'g1', updated: 1000, name: 'Renamed' },
      },
    ])

    expect(state.injections.length).toBe(1)
  })

  test('unregistering stops delivery -- a registry that only grows leaks on every disconnect', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState()
    const unregister = registry.register({ category: 'gym', state })
    expect(registry.size()).toBe(1)

    unregister()
    expect(registry.size()).toBe(0)

    registry.dispatch([upsert('g1', 5, 5)])
    expect(state.injections).toEqual([])
  })

  test('unregistering twice is harmless', () => {
    const registry = createSubscriptionRegistry()
    const unregister = registry.register({ category: 'gym', state: gymState() })
    unregister()
    unregister()
    expect(registry.size()).toBe(0)
  })

  test('one failing subscription does not cost the others their delivery', () => {
    const registry = createSubscriptionRegistry()
    const broken = gymState()
    // A socket that went away between the fan-out starting and this entry
    // being reached: whatever the failure is, the rest of the fan-out has
    // to complete.
    broken.wake = () => {
      throw new Error('socket is gone')
    }
    const healthy = gymState()
    registry.register({ category: 'gym', state: broken })
    registry.register({ category: 'gym', state: healthy })

    registry.dispatch([upsert('g1', 5, 5)])

    expect(healthy.injections.length).toBe(1)
  })

  test('an empty batch touches nothing', () => {
    const registry = createSubscriptionRegistry()
    const state = gymState()
    registry.register({ category: 'gym', state })

    registry.dispatch([])

    expect(state.injections).toEqual([])
    expect(state.wakePending).toBe(false)
  })
})
