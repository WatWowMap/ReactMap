// server/src/services/masterfile.ts
//
// The species/form catalog behind the three callers named in
// task-8-brief.md: the card's subject chip, the picker's tiles, and the
// popup. `pogo-masterfile` gives typed structure over the current game
// master -- which species exist, and per species which form strings it
// declares (`RATICATE_ALOLA`, ...) -- but the raw game master carries no
// numeric form id anywhere; both `pokemonSettings.form` and
// `formSettings.forms[].form` are bare strings. That matters because
// `rule-local-filter.ts` compares a rule's `formId` straight against
// Golbat's `pokemon.form`, which Golbat sets from the real Pokemon GO
// `Form` enum (`decoder/pokemon_decode.go`) -- a wrong numeric id here is a
// rule that can never match a real sighting, not a cosmetic miss.
//
// The already-configured `api.pogoApiEndpoints.masterfile` endpoint
// (`master-latest-react-map.json`, the same source `@rm/masterfile` uses
// for 1.x) carries exactly the numeric ids: `pokemon[pokedexId].forms` is
// keyed by the real form id. This module fetches it directly instead of
// going through `@rm/masterfile`'s `generate()`, which folds in 1.x-only
// rarity blending this task has no use for and which the plan's "nothing
// imports 1.x server code" rule doesn't clear for 2.0 server use anyway.
//
// Every word -- species and form alike -- comes from `names.ts`; this
// module never touches a `poke_`/`form_` key itself.

import config from '@rm/config'
import { log, TAGS } from '@rm/logger'
import { Masterfile } from 'pogo-masterfile'
import { loadNames } from './names'

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

interface RemoteFormEntry {
  name?: string
}

interface RemotePokemon {
  pokedexId: number
  defaultFormId?: number
  forms?: Record<string, RemoteFormEntry>
}

interface RemoteMasterfile {
  pokemon: Record<string, RemotePokemon>
}

/** `V0020_POKEMON_RATICATE` -> `20`, the national dex number every `pokemonSettings` templateId leads with. */
const DEX_ID_PATTERN = /^V(\d+)_POKEMON_/

/**
 * A direct reference to the platform `fetch`, captured once at module
 * load -- before any test can have swapped `globalThis.fetch` -- so a
 * test that targets the translations fetch (`names.ts`, which does the
 * ordinary dynamic `fetch(...)` lookup) never also intercepts this
 * module's own remote call for the form-id table.
 */
const nativeFetch: typeof fetch = globalThis.fetch.bind(globalThis)

async function fetchRemoteMasterfile(): Promise<RemoteMasterfile> {
  const endpoint = config.getSafe('api.pogoApiEndpoints.masterfile')
  const response = await nativeFetch(endpoint)
  if (!response.ok) {
    throw new Error(`GET ${endpoint} -> ${response.status}`)
  }
  return (await response.json()) as RemoteMasterfile
}

function currentDexIds(mf: Masterfile): number[] {
  const ids = new Set<number>()
  for (const entry of mf.pokemonSettings.all()) {
    const dexIdText = DEX_ID_PATTERN.exec(entry.templateId)?.[1]
    if (dexIdText) ids.add(Number(dexIdText))
  }
  return [...ids].sort((a, b) => a - b)
}

function formsFor(
  dexId: number,
  remote: RemoteMasterfile,
  names: Awaited<ReturnType<typeof loadNames>>,
): FormEntry[] {
  const pokemon = remote.pokemon[String(dexId)]
  if (!pokemon?.forms) return []
  const forms: FormEntry[] = []
  for (const formIdText of Object.keys(pokemon.forms)) {
    const formId = Number(formIdText)
    // The species' own default form is not a distinct pick -- "no form
    // set" already means it, via `label`'s `!formId` short-circuit.
    if (formId === pokemon.defaultFormId) continue
    forms.push({
      id: formId,
      name: names.form(formId),
      label: names.label(dexId, formId),
    })
  }
  return forms
}

async function fetchSpeciesEntries(locale?: string): Promise<SpeciesEntry[]> {
  const [mf, remote, names] = await Promise.all([
    Masterfile.fromRemote(),
    fetchRemoteMasterfile(),
    loadNames(locale),
  ])

  return currentDexIds(mf).map((id) => ({
    id,
    name: names.species(id),
    forms: formsFor(id, remote, names),
  }))
}

/**
 * One cached promise per locale, cleared on an interval rather than
 * re-fetched per request -- the game master and the form catalog change
 * on Niantic's schedule, not on request volume. Reuses the same
 * `map.misc.masterfileCacheHrs` config 1.x's own masterfile refresh runs
 * on, defaulting to that value's default (12h) if it's unset.
 */
const cache = new Map<string, Promise<SpeciesEntry[]>>()
const cacheHrs = Number(config.getSafe('map.misc.masterfileCacheHrs')) || 12
const REFRESH_MS = Math.max(1, cacheHrs) * 60 * 60 * 1000
let refreshTimer: ReturnType<typeof setInterval> | undefined

function scheduleRefresh(): void {
  if (refreshTimer) return
  refreshTimer = setInterval(() => cache.clear(), REFRESH_MS)
  refreshTimer.unref?.()
}

export function listSpecies(locale?: string): Promise<SpeciesEntry[]> {
  const key = locale ?? 'en'
  const cached = cache.get(key)
  if (cached) return cached

  scheduleRefresh()
  const promise = fetchSpeciesEntries(locale).catch((err: unknown) => {
    // A failed fetch should not poison the cache for the rest of the
    // refresh window -- the next request gets a chance to retry.
    cache.delete(key)
    log.error(TAGS.masterfile, 'species catalog fetch failed', err)
    throw err
  })
  cache.set(key, promise)
  return promise
}
