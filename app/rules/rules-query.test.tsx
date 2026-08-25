import { afterAll, afterEach, beforeAll, expect, test, vi } from 'bun:test'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { setupDom, teardownDom } from '../test-setup'
import { ruleMap } from './rule-fixtures'
import type { Rule } from './rule-types'
import {
  applyDeltaWithRules,
  createRulesQueryClient,
  type RulesClient,
  rulesQueryKey,
  useRules,
} from './rules-query'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const PROFILE_ID = 1

interface FakeRulesClient extends RulesClient {
  failNextList: () => void
  failNextUpdate: () => void
}

function createFakeClient(initial: Map<number, Rule>): FakeRulesClient {
  let rows = [...initial.values()]
  let failList = false
  let failUpdate = false
  return {
    async list() {
      if (failList) {
        failList = false
        throw new Error('rules fetch failed')
      }
      return rows
    },
    async update(ruleIds, patch) {
      if (failUpdate) {
        failUpdate = false
        throw new Error('rules update failed')
      }
      rows = rows.map((rule) =>
        ruleIds.includes(rule.id) ? { ...rule, ...patch } : rule,
      )
    },
    failNextList() {
      failList = true
    },
    failNextUpdate() {
      failUpdate = true
    },
  }
}

interface ActiveHarness {
  queryClient: QueryClient
  fake: FakeRulesClient
  result: { current: ReturnType<typeof useRules> }
}

// Set by the harness the two `failNext*` helpers below act on. Tests never
// run two harnesses concurrently, so one slot is enough -- the same shape
// `use-map-socket.test.tsx`'s `harness()` returns, just addressed by a
// module-level slot instead of a returned handle, to match the brief's
// zero-argument `failNextRulesFetch()`/`failNextMutation(fn)` calls.
let active: ActiveHarness | null = null

function renderHookWithRules({ initial }: { initial: Map<number, Rule> }) {
  const queryClient = createRulesQueryClient()
  const fake = createFakeClient(initial)
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  const rendered = renderHook(() => useRules(PROFILE_ID, { client: fake }), {
    wrapper,
  })
  active = { queryClient, fake, result: rendered.result }
  return rendered
}

function requireActive(): ActiveHarness {
  if (!active) {
    throw new Error('renderHookWithRules must run before this helper')
  }
  return active
}

/**
 * TanStack Query's `notifyManager` batches subscriber notifications
 * through a `setTimeout(0)`, a macrotask -- not a microtask `act()`'s
 * async form waits out on its own. One real tick after the awaited work
 * is what lets the resulting re-render land before the next assertion.
 */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Arms the fake client's next `list()` call to fail, then forces and awaits that refetch. */
async function failNextRulesFetch(): Promise<void> {
  const { fake, queryClient } = requireActive()
  fake.failNextList()
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: rulesQueryKey(PROFILE_ID) })
    await tick()
  })
}

/** Arms the fake client's next `update()` call to fail, then runs and awaits `run`. */
async function failNextMutation(run: () => Promise<void>): Promise<void> {
  const { fake } = requireActive()
  fake.failNextUpdate()
  await act(async () => {
    await run()
    await tick()
  })
}

test('an unknown matched id triggers exactly one rules refetch', () => {
  const invalidate = vi.fn()
  applyDeltaWithRules({
    matched: [999],
    rules: ruleMap([{ id: 7 }]),
    invalidate,
  })
  expect(invalidate).toHaveBeenCalledTimes(1)
})

test('a rulesVersion that differs from the fetched one triggers a refetch', () => {
  const invalidate = vi.fn()
  applyDeltaWithRules({
    matched: [7],
    rulesVersion: 42,
    fetchedAt: 41,
    rules: ruleMap([{ id: 7 }]),
    invalidate,
  })
  expect(invalidate).toHaveBeenCalledTimes(1)
})

test('a known matched id at the fetched version triggers nothing', () => {
  const invalidate = vi.fn()
  applyDeltaWithRules({
    matched: [7],
    rulesVersion: 41,
    fetchedAt: 41,
    rules: ruleMap([{ id: 7 }]),
    invalidate,
  })
  expect(invalidate).not.toHaveBeenCalled()
})

test('a failed rules refetch leaves the last good set in place', async () => {
  const { result } = renderHookWithRules({
    initial: ruleMap([{ id: 7, name: 'Hundos' }]),
  })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.rules.get(7)?.name).toBe('Hundos')

  await failNextRulesFetch()

  // A slightly stale map beats an empty one.
  expect(result.current.rules.get(7)?.name).toBe('Hundos')
  expect(result.current.error).toBeTruthy()
})

test('a failed mutation rolls back and the map keeps rendering', async () => {
  const { result } = renderHookWithRules({
    initial: ruleMap([{ id: 7, size: 'lg' }]),
  })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.rules.get(7)?.size).toBe('lg')

  await failNextMutation(() => result.current.update([7], { size: 'xl' }))

  expect(result.current.rules.get(7)?.size).toBe('lg')
  expect(result.current.error).toBeTruthy()
})

test('a successful update is applied optimistically', async () => {
  const { result } = renderHookWithRules({
    initial: ruleMap([{ id: 7, size: 'lg' }]),
  })
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  await act(async () => {
    await result.current.update([7], { size: 'xl' })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  expect(result.current.rules.get(7)?.size).toBe('xl')
  expect(result.current.error).toBeFalsy()
})
