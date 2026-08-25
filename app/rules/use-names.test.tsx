import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { setupDom, teardownDom } from '../test-setup'
import type { MasterfileClient, SpeciesEntry } from './use-names'
import { useNames } from './use-names'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const FIXTURE: SpeciesEntry[] = [
  {
    id: 20,
    name: 'Raticate',
    forms: [{ id: 48, name: 'Alola', label: 'Raticate (Alola)' }],
  },
  { id: 147, name: 'Dratini', forms: [] },
]

function fakeClient(species: SpeciesEntry[]): MasterfileClient {
  return { species: () => Promise.resolve(species) }
}

function renderUseNames(client: MasterfileClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  return renderHook(() => useNames({ client }), { wrapper })
}

test('before the catalog loads, every id falls back to its own #id', () => {
  const { result } = renderUseNames(fakeClient(FIXTURE))
  expect(result.current.species(20)).toBe('#20')
  expect(result.current.label(20, 48)).toBe('#20 (#48)')
})

test('a species with no form is just its name', async () => {
  const { result } = renderUseNames(fakeClient(FIXTURE))
  await waitFor(() => expect(result.current.species(147)).toBe('Dratini'))
  expect(result.current.label(147)).toBe('Dratini')
  expect(result.current.label(147, null)).toBe('Dratini')
})

test('a form label is read as the server composed it, not recomposed here', async () => {
  const { result } = renderUseNames(fakeClient(FIXTURE))
  await waitFor(() => expect(result.current.species(20)).toBe('Raticate'))
  expect(result.current.label(20, 48)).toBe('Raticate (Alola)')
})

test('a species id the catalog does not have is visible rather than empty', async () => {
  const { result } = renderUseNames(fakeClient(FIXTURE))
  await waitFor(() => expect(result.current.species(20)).toBe('Raticate'))
  expect(result.current.species(9999)).toBe('#9999')
  expect(result.current.label(9999, 48)).toBe('#9999 (#48)')
})
