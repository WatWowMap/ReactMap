/**
 * Where a pokemon marker's real artwork comes from.
 *
 * Sprite URLs are NOT built by hand. The uicons repository's file naming is
 * a fallback grammar, not a formula -- `20_b1_c11_g2_s.webp`,
 * `1_f897_a1_a1_s.webp` -- and the obvious guess 404s constantly
 * (`pokemon/25.webp` is 200, `pokemon/25_f1.webp` and `pokemon/20_f46.webp`
 * are both 404). `uicons.js` fetches the repository's `index.json` once and
 * resolves a request against what is actually there, walking the fallback
 * chain down to `pokemon/0.webp` when nothing more specific exists.
 *
 * That fetch happens exactly once for the page: `loadSpriteIndex` memoises
 * both the resolved index and the in-flight promise, so a second caller
 * joins the first request instead of starting another. Per-component or
 * per-entity initialisation would re-download the whole index, which is the
 * obvious way to make this slow.
 */

import { UICONS } from 'uicons.js'
import type { PokemonEntity } from './types'

/** The sprite set 1.0 ships against, and the one this index is verified on. */
export const UICONS_BASE_URL =
  'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main'

/**
 * The box deck.gl packs each remote sprite into. The source webp files are
 * not all one size, and `IconLayer` scales whatever it loads into the
 * width/height the descriptor declares, so this is the atlas cell size
 * rather than a measurement of any particular file. 64 matches the
 * placeholder that came before it, keeps a marker crisp at the largest
 * rule size (48px) on a 2x display, and stays small enough that a few
 * hundred species fit one texture.
 */
export const SPRITE_ICON_SIZE = 64

/**
 * The slice of `UICONS` this module actually uses. Structural, so tests
 * can hand in a stub and never touch the network -- the real class is a
 * whole icon repository and none of the rest is relevant here.
 */
export interface SpriteIndex {
  pokemon(
    pokemonId?: number,
    evolution?: number,
    form?: number,
    costume?: number,
    gender?: number,
    alignment?: number,
    bread?: number,
    shiny?: boolean,
  ): string
}

/**
 * The sprite for one entity, or `undefined` when the index cannot name one.
 *
 * `undefined` covers two cases that must both stay visible on the map: the
 * index has not finished loading (uicons returns an empty string until
 * then), and a genuinely unresolvable request. The caller draws its own
 * placeholder for both -- see `drawPokemonIcon`.
 *
 * Evolution, alignment, bread and shiny are passed as their defaults
 * because the live wire carries none of them (see `translate.ts`: only
 * `pokemon_id`, `form`, `costume`, `gender` and `weather` arrive). They are
 * named positionally rather than omitted so that adding one later is a
 * one-argument edit rather than a re-reading of the signature.
 */
export function spriteUrlFor(
  index: SpriteIndex | null,
  entity: PokemonEntity,
): string | undefined {
  if (!index) return undefined
  const url = index.pokemon(
    entity.pokemonId,
    0,
    entity.form,
    entity.costume,
    entity.gender,
  )
  return url === '' ? undefined : url
}

let loaded: SpriteIndex | null = null
let inFlight: Promise<SpriteIndex | null> | null = null

/** The index if it has finished loading, `null` until then. Synchronous by
 * design: `IconDrawer` is synchronous, so the drawing path can never await. */
export function spriteIndex(): SpriteIndex | null {
  return loaded
}

/**
 * Fetches the sprite index once per page. Resolves to `null` rather than
 * rejecting when the fetch fails: a repository that is down means markers
 * draw as placeholders, which is a degraded map, not a broken one.
 *
 * `create` exists so tests can count how many indexes were built without a
 * network round trip; nothing in the app passes it.
 */
export function loadSpriteIndex(
  create: () => Promise<SpriteIndex> = () =>
    new UICONS(UICONS_BASE_URL).remoteInit(),
): Promise<SpriteIndex | null> {
  if (loaded) return Promise.resolve(loaded)
  if (inFlight) return inFlight
  inFlight = create()
    .then((index) => {
      loaded = index
      return index
    })
    .catch((error: unknown) => {
      console.warn(
        '[map] sprite index failed to load, drawing placeholders',
        error,
      )
      return null
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Drops the memoised index. Tests only; nothing in the app unloads sprites. */
export function resetSpriteIndex(): void {
  loaded = null
  inFlight = null
}
