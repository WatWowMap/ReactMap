// server/src/services/viewport-scanner.ts
//
// Rule 1 of the Task 4 brief, wired to a real Golbat client
// (golbat-client.js, Task 2): "limit_reached suppresses reconciliation and
// triggers subdivision." Golbat caps results (3,000 pokemon / 9,000 forts
// by default -- read the actual numbers from `GET /api/status`, see
// golbat-client.js's `init()`) and the cap cannot be raised from the
// client; `limit_reached: true` on a response means it is a TRUNCATED view
// of the bbox that was asked for, not the whole answer. Calling
// `delta-engine.js`'s `computeDelta` with `complete: true` against a
// truncated response would evict every live entity the client is holding
// that this one incomplete page simply didn't reach.
//
// So: on `limit_reached`, split the bbox into quarters and query each
// quarter. If a quarter is itself still truncated, split it again, up to
// `maxDepth`. Only when every leaf query came back un-truncated is the
// merged result "complete" -- the caller passes that flag straight through
// to `computeDelta`. If `maxDepth` is exhausted with a leaf still
// truncated, the merged result is honestly reported incomplete rather than
// silently declared done; a caller sees added/changed for what it did
// return (see delta-engine.js: those are safe on any result set, complete
// or not) and no removals are computed until a later poll manages to come
// back complete.
//
// This module is a thin layer around `golbat-client.js`'s `scanPokemon`/
// `scanForts`: no diffing lives here, only "keep asking Golbat in smaller
// pieces until the answer for this bbox is provably whole." No socket, no
// per-connection state -- that belongs to Task 5 and to the caller of this
// module, which passes in one bbox and gets back one merged, honestly
// flagged result.

import type { createGolbatClient } from './golbat-client'

const DEFAULT_MAX_DEPTH = 5

interface LatLon {
  lat: number
  lon: number
}

interface Bbox {
  min: LatLon
  max: LatLon
}

function quarterBbox(bbox: Bbox): Bbox[] {
  const midLat = (bbox.min.lat + bbox.max.lat) / 2
  const midLon = (bbox.min.lon + bbox.max.lon) / 2
  return [
    {
      min: { lat: bbox.min.lat, lon: bbox.min.lon },
      max: { lat: midLat, lon: midLon },
    },
    {
      min: { lat: bbox.min.lat, lon: midLon },
      max: { lat: midLat, lon: bbox.max.lon },
    },
    {
      min: { lat: midLat, lon: bbox.min.lon },
      max: { lat: bbox.max.lat, lon: midLon },
    },
    {
      min: { lat: midLat, lon: midLon },
      max: { lat: bbox.max.lat, lon: bbox.max.lon },
    },
  ]
}

/**
 * Dedupes by `id`, keeping the first occurrence -- a split on an exact
 * boundary coordinate is the only way one entity could show up in two
 * quarters, and this is only ever a merge safeguard, not the normal case.
 *
 */
function dedupeById(entities: any[]): any[] {
  const seen = new Set()
  const out: any[] = []
  for (const entity of entities) {
    if (seen.has(entity.id)) continue
    seen.add(entity.id)
    out.push(entity)
  }
  return out
}

/**
 * @param runQuery A single-bbox query, already bound to whatever
 *   filters/limit the caller wants. Returns one page's raw result plus
 *   `limitReached`, abstracted away from which Golbat endpoint it came from
 *   -- `scanPokemonComplete`/`scanFortsComplete` below supply this and a
 *   `mergeLeaves` to combine pages of that shape.
 * @param mergeLeaves Combines every leaf page (in subdivision order) into
 *   one merged result of the same shape.
 */
async function scanComplete<T>(
  runQuery: (bbox: Bbox) => Promise<{ leaf: T; limitReached: boolean }>,
  mergeLeaves: (leaves: T[]) => T,
  bbox: Bbox,
  options: { maxDepth?: number } = {},
): Promise<{ result: T; complete: boolean; subdivided: boolean }> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH

  async function recurse(
    box: Bbox,
    depth: number,
  ): Promise<{ leaves: T[]; complete: boolean; subdivided: boolean }> {
    const { leaf, limitReached } = await runQuery(box)
    if (!limitReached) {
      return { leaves: [leaf], complete: true, subdivided: depth > 0 }
    }
    if (depth >= maxDepth) {
      // Honestly incomplete -- do not pretend a maxed-out subdivision
      // reached the whole bbox.
      return { leaves: [leaf], complete: false, subdivided: depth > 0 }
    }
    const quarters = quarterBbox(box)
    const results = await Promise.all(
      quarters.map((quarter) => recurse(quarter, depth + 1)),
    )
    return {
      leaves: results.flatMap((r) => r.leaves),
      complete: results.every((r) => r.complete),
      subdivided: true,
    }
  }

  const result = await recurse(bbox, 0)
  return {
    result: mergeLeaves(result.leaves),
    complete: result.complete,
    subdivided: result.subdivided,
  }
}

async function scanPokemonComplete(
  golbatClient: Pick<ReturnType<typeof createGolbatClient>, 'scanPokemon'>,
  bbox: Bbox,
  params: { filters?: object[]; limit?: number } = {},
  options: { maxDepth?: number } = {},
): Promise<{ entities: any[]; complete: boolean; subdivided: boolean }> {
  const { result, complete, subdivided } = await scanComplete(
    async (box) => {
      const r = await golbatClient.scanPokemon({ ...params, ...box })
      return { leaf: r.pokemon, limitReached: r.limitReached }
    },
    (leaves) => dedupeById(leaves.flat()),
    bbox,
    options,
  )
  return { entities: result, complete, subdivided }
}

/**
 * Forts scan combines three families (gyms/pokestops/stations) in one
 * envelope with a single shared `limit_reached`, so subdivision treats a
 * quarter's whole fort page as one unit -- a gym-only truncation still
 * means the pokestops and stations in that same page came from a bbox that
 * had to be split, so all three are re-queried together. Each family stays
 * its own array in the result, though: `delta-engine.js`'s `computeDelta`
 * runs once per category, and merging ids across families here would only
 * make the caller re-split them by inspecting entity shape.
 */
async function scanFortsComplete(
  golbatClient: Pick<ReturnType<typeof createGolbatClient>, 'scanForts'>,
  bbox: Bbox,
  params: {
    gyms?: object | null
    pokestops?: object | null
    stations?: object | null
    limit?: number
  } = {},
  options: { maxDepth?: number } = {},
): Promise<{
  gyms: any[]
  pokestops: any[]
  stations: any[]
  complete: boolean
  subdivided: boolean
}> {
  const { result, complete, subdivided } = await scanComplete(
    async (box) => {
      const r = await golbatClient.scanForts({ ...params, ...box })
      return {
        leaf: { gyms: r.gyms, pokestops: r.pokestops, stations: r.stations },
        limitReached: r.limitReached,
      }
    },
    (leaves) => ({
      gyms: dedupeById(leaves.flatMap((l) => l.gyms)),
      pokestops: dedupeById(leaves.flatMap((l) => l.pokestops)),
      stations: dedupeById(leaves.flatMap((l) => l.stations)),
    }),
    bbox,
    options,
  )
  return { ...result, complete, subdivided }
}

export { quarterBbox, scanComplete, scanFortsComplete, scanPokemonComplete }
