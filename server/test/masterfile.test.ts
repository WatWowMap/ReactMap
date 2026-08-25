import { afterEach, expect, mock, test } from 'bun:test'

/**
 * `pogo-masterfile`'s real remote source is a 19MB game master. Every test
 * here only cares about two species existing (Raticate, Dratini), so the
 * package is replaced with a tiny fixture -- keeping these tests fast and
 * deterministic, and (just as importantly) keeping `Masterfile.fromRemote`
 * off `globalThis.fetch` entirely, so the fetch-count tests below only
 * ever see the translations call they're named for.
 */
const FIXTURE_ENTRIES = [
  {
    templateId: 'V0020_POKEMON_RATICATE',
    data: {
      templateId: 'V0020_POKEMON_RATICATE',
      pokemonSettings: { pokemonId: 'RATICATE' },
    },
  },
  {
    templateId: 'V0147_POKEMON_DRATINI',
    data: {
      templateId: 'V0147_POKEMON_DRATINI',
      pokemonSettings: { pokemonId: 'DRATINI' },
    },
  },
]

mock.module('pogo-masterfile', () => ({
  Masterfile: {
    fromRemote: async () => ({
      pokemonSettings: { all: () => FIXTURE_ENTRIES },
    }),
  },
}))

const { listSpecies } = await import('../src/services/masterfile')

/**
 * `spyOnFetch`/`withFailingFetch` replace `globalThis.fetch` for the rest
 * of the process -- Bun's test runner shares one realm across every test
 * file in a run, so leaving the swap in place would break any later
 * file's real network calls. Restored after every test in this file,
 * whether or not that test touched it.
 */
const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

/**
 * Swaps `globalThis.fetch` for a mock that resolves every call with a
 * tiny canned translations payload, and returns the mock so a test can
 * assert on it directly (`toHaveBeenCalledTimes`). Only the translations
 * fetch goes through `globalThis.fetch` at all -- `masterfile.ts`'s own
 * remote call uses a `fetch` reference captured before any test runs, so
 * it's untouched by this swap and this spy's count is exactly the
 * translations call count.
 */
function spyOnFetch() {
  const fetchSpy = mock(async () => Response.json({ poke_20: 'Raticate' }))
  globalThis.fetch = fetchSpy as unknown as typeof fetch
  return fetchSpy
}

/** Same swap, but every call rejects -- a translations endpoint that's down. */
function withFailingFetch(): void {
  globalThis.fetch = mock(async () => {
    throw new Error('network unreachable')
  }) as unknown as typeof fetch
}

test('species carry their forms with composed labels', async () => {
  const species = await listSpecies()
  const raticate = species.find((s) => s.id === 20)
  expect(raticate?.name).toBe('Raticate')
  expect(raticate?.forms.map((f) => f.label)).toContain('Raticate (Alola)')
})

test('the payload is the filtered subset, not the whole translations file', async () => {
  // en.json is 609 KB across 9,351 keys; poke_ and form_ are about 42 KB.
  const bytes = JSON.stringify(await listSpecies()).length
  expect(bytes).toBeLessThan(200_000)
})

test('translations are fetched once, not per request', async () => {
  const fetchSpy = spyOnFetch()
  await listSpecies('spy-once-locale')
  await listSpecies('spy-once-locale')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test('an unreachable translations endpoint degrades to ids rather than throwing', async () => {
  withFailingFetch()
  const species = await listSpecies('failing-fetch-locale')
  expect(species.find((s) => s.id === 20)?.name).toBe('#20')
})
