// server/src/services/names.ts
//
// The one module that knows a Pokemon GO species/form translation key looks
// like `poke_${id}` or `form_${id}`. 1.x hand-assembled that string in at
// least eight files, which is exactly how the form key drifted from the
// species name it decorates. Every other caller -- `masterfile.ts`, the
// client's `useNames` -- goes through the functions below instead.

import config from '@rm/config'
import { log, TAGS } from '@rm/logger'

export interface Names {
  species(id: number): string
  form(id: number): string
  /** The composed label: "Raticate (Alola)", or "Dratini" with no form. */
  label(speciesId: number, formId?: number | null): string
}

/**
 * Builds a `Names` over an already-fetched (and already filtered)
 * translations object. Pure and synchronous -- `loadNames` is the only
 * caller that has to think about the network.
 */
export function namesFrom(raw: Record<string, string>): Names {
  const species = (id: number) => raw[`poke_${id}`] ?? `#${id}`
  const form = (id: number) => raw[`form_${id}`] ?? `#${id}`
  return {
    species,
    form,
    label(speciesId, formId) {
      // form 0 is "Unset" upstream, which is not a form anyone chose.
      if (!formId) return species(speciesId)
      return `${species(speciesId)} (${form(formId)})`
    },
  }
}

/**
 * One cached `Names` promise per locale, held for the life of the process.
 * `loadNames` is called from a request path (`masterfile.species`, and
 * indirectly every render of a species chip/tile/popup), so this is what
 * keeps a translations fetch from happening once per request instead of
 * once per server.
 */
const cache = new Map<string, Promise<Names>>()

/**
 * Fetches `${locale}.json` from the translations endpoint, keeps only the
 * `poke_`/`form_` keys (discarding the other ~8,700 before they reach
 * memory), and hands the result to `namesFrom`. A network failure -- the
 * endpoint down, DNS, a bad response -- degrades to an empty translations
 * object rather than throwing: every `Names` method already falls back to
 * `#id`, so callers see ids instead of crashing.
 */
export function loadNames(locale = 'en'): Promise<Names> {
  const cached = cache.get(locale)
  if (cached) return cached

  const promise = fetchFilteredTranslations(locale)
    .catch((err) => {
      log.error(TAGS.masterfile, 'translations fetch failed', err)
      return {}
    })
    .then((raw) => namesFrom(raw))

  cache.set(locale, promise)
  return promise
}

async function fetchFilteredTranslations(
  locale: string,
): Promise<Record<string, string>> {
  const endpoint = config.getSafe('api.pogoApiEndpoints.translations')
  const response = await fetch(`${endpoint}/static/locales/${locale}.json`)
  if (!response.ok) {
    throw new Error(
      `GET ${endpoint}/static/locales/${locale}.json -> ${response.status}`,
    )
  }
  const all = (await response.json()) as Record<string, string>
  return Object.fromEntries(
    Object.entries(all).filter(
      ([key]) => key.startsWith('poke_') || key.startsWith('form_'),
    ),
  )
}
