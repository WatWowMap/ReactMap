/**
 * The client half of task 8: a lookup over whatever `masterfile.species`
 * already composed server-side. This module never touches a `poke_`/
 * `form_` key -- that rule lives in `server/src/services/names.ts` alone
 * -- and it never recomposes a label; `FormEntry.label` arrives
 * pre-composed, so this is a plain id -> string lookup.
 *
 * Same untyped-tRPC-client seam as `rules-query.ts`: `tsconfig.app.json`
 * only includes `app/**`, so a shared `AppRouter` import across the
 * server/client tsconfig boundary is the wrong fix.
 */

import { useQuery } from '@tanstack/react-query'
import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'
import { useMemo } from 'react'

export interface FormEntry {
  id: number
  name: string
  label: string
}

export interface SpeciesEntry {
  id: number
  name: string
  forms: FormEntry[]
}

/** The one RPC call this module needs -- a seam a test can fake without a network. */
export interface MasterfileClient {
  species(): Promise<SpeciesEntry[]>
}

function createDefaultMasterfileClient(): MasterfileClient {
  const client = createTRPCUntypedClient<AnyRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
  })
  return {
    species: () =>
      client.query('masterfile.species') as Promise<SpeciesEntry[]>,
  }
}

// Constructed once and reused across every `useNames` call that does not
// supply its own client -- one link chain, not one per mount.
let defaultClient: MasterfileClient | null = null
function getDefaultClient(): MasterfileClient {
  if (!defaultClient) defaultClient = createDefaultMasterfileClient()
  return defaultClient
}

export function masterfileSpeciesQueryKey() {
  return ['masterfile', 'species'] as const
}

export interface NamesLookup {
  species(id: number): string
  label(speciesId: number, formId?: number | null): string
}

/** A lookup with nothing loaded yet -- every id falls back to its own `#id`. */
const EMPTY_LOOKUP: NamesLookup = {
  species: (id) => `#${id}`,
  label: (speciesId, formId) =>
    formId ? `#${speciesId} (#${formId})` : `#${speciesId}`,
}

function buildLookup(species: SpeciesEntry[]): NamesLookup {
  if (species.length === 0) return EMPTY_LOOKUP

  const byId = new Map(species.map((entry) => [entry.id, entry]))
  return {
    species(id) {
      return byId.get(id)?.name ?? `#${id}`
    },
    label(speciesId, formId) {
      const entry = byId.get(speciesId)
      if (!formId) return entry?.name ?? `#${speciesId}`
      const form = entry?.forms.find((f) => f.id === formId)
      if (form) return form.label
      // A species we know with a form id the catalog doesn't -- still
      // show the species name rather than collapsing to raw ids.
      return entry ? `${entry.name} (#${formId})` : `#${speciesId} (#${formId})`
    },
  }
}

export interface UseNamesOptions {
  client?: MasterfileClient
}

/**
 * The catalog itself, for the one caller that needs the entries rather
 * than a name for an id: the exclusion picker, which renders a tile per
 * species. Same query key as `useNames`, so the two share one fetch.
 */
export function useSpeciesCatalog({
  client = getDefaultClient(),
}: UseNamesOptions = {}): SpeciesEntry[] {
  const { data } = useQuery({
    queryKey: masterfileSpeciesQueryKey(),
    queryFn: () => client.species(),
  })
  return data ?? []
}

export function useNames(options: UseNamesOptions = {}): NamesLookup {
  const species = useSpeciesCatalog(options)
  return useMemo(() => buildLookup(species), [species])
}
