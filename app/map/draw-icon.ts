import type { IconDescriptor, IconDrawer } from './atlas'
import { SPRITE_ICON_SIZE, spriteIndex, spriteUrlFor } from './sprite-source'
import type { PokemonEntity } from './types'

const ICON_SIZE = 64

/**
 * Colours the fallback circle by whether the entity carries a badge or a
 * weather boost, the only two appearance modifiers a marker with no
 * artwork can still say something about (form and costume are exactly
 * what the missing sprite would have shown).
 */
function baseColorFor(entity: PokemonEntity): string {
  if (entity.weather !== undefined) return '#7dd3fc'
  if (entity.badge !== undefined) return '#fbbf24'
  return '#e5e7eb'
}

/**
 * The marker for a pokemon whose sprite could not be named: a circle in
 * `baseColorFor`'s colour with the species id centred on it, plus a ring
 * when the entity carries a badge.
 *
 * Visible on purpose. An entity with no artwork still has to be something
 * a person can see and click, not a hole in the map, and the species id
 * printed on it is what turns "this one is broken" into a bug report.
 *
 * Its `id` carries a `:placeholder` suffix so it can never be confused
 * with the real sprite for the same appearance key. deck.gl's icon manager
 * caches by icon id and does not re-fetch when only the url changes, so
 * reusing the key would leave placeholders on screen for the rest of the
 * session once the sprite index finished loading.
 *
 * `OffscreenCanvas` has no synchronous way to produce a data URL
 * (`convertToBlob` is promise-based, and `IconDrawer` is synchronous so the
 * atlas's cache-then-draw pipeline never has to deal with a pending
 * result). This draws on the offscreen surface, then blits that surface
 * onto a same-size, never-attached `<canvas>` purely to call its
 * synchronous `toDataURL`. All pixel compositing happens on the
 * `OffscreenCanvas`; the bridge canvas does no drawing of its own.
 *
 * Only runs in a browser: `OffscreenCanvas` does not exist in the `bun
 * test` environment, so this function is exercised by manual/browser
 * verification, not a unit test (see task-4-report.md).
 */
function drawPlaceholderIcon(
  entity: PokemonEntity,
  key: string,
): IconDescriptor {
  const offscreen = new OffscreenCanvas(ICON_SIZE, ICON_SIZE)
  const ctx = offscreen.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable on OffscreenCanvas')

  const center = ICON_SIZE / 2
  const radius = ICON_SIZE / 2 - 4

  ctx.fillStyle = baseColorFor(entity)
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fill()

  if (entity.badge !== undefined) {
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(center, center, radius - 1.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = '#111827'
  ctx.font = `${ICON_SIZE * 0.3}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(entity.pokemonId), center, center)

  const bridge = document.createElement('canvas')
  bridge.width = ICON_SIZE
  bridge.height = ICON_SIZE
  const bridgeCtx = bridge.getContext('2d')
  if (!bridgeCtx) throw new Error('2d context unavailable on bridge canvas')
  bridgeCtx.drawImage(offscreen, 0, 0)

  return {
    id: `${key}:placeholder`,
    url: bridge.toDataURL('image/png'),
    width: ICON_SIZE,
    height: ICON_SIZE,
  }
}

/**
 * One pokemon marker's species artwork: a remote uicons sprite, named by
 * the index `sprite-source.ts` loads once for the page.
 *
 * Nothing is composited here on the happy path. `IconDescriptor.url` may be
 * a remote URL, and deck.gl's `IconLayer` fetches it and packs it into its
 * own texture atlas, so real art needs no async plumbing on this side of
 * the seam - which is the whole reason `IconDrawer` can stay synchronous.
 *
 * Rings are NOT drawn here. They are their own layer beneath this one, for
 * the atlas-explosion reason `ring-icon.ts` explains at length.
 *
 * Falls through to `drawPlaceholderIcon` while the index is still loading
 * and for anything it cannot name.
 */
export const drawPokemonIcon: IconDrawer = (
  entity: PokemonEntity,
  key: string,
): IconDescriptor => {
  const url = spriteUrlFor(spriteIndex(), entity)
  if (url === undefined) return drawPlaceholderIcon(entity, key)
  return {
    id: key,
    url,
    width: SPRITE_ICON_SIZE,
    height: SPRITE_ICON_SIZE,
  }
}

const CLUSTER_ICON_ID = 'cluster-marker-mask'
let cachedClusterIcon: IconDescriptor | undefined

/**
 * The single mask icon every cluster bubble shares: a plain circle, same
 * pattern as `drawGymIcon` and for the same reason - a cluster's only
 * per-entity property is its count, which is rendered as text on top (see
 * `buildClusterTextLayer` in layers.ts), not baked into the icon itself.
 * `IconLayer.getColor` tints this per cluster by size bucket.
 */
export function drawClusterIcon(): IconDescriptor {
  if (cachedClusterIcon) return cachedClusterIcon

  const offscreen = new OffscreenCanvas(ICON_SIZE, ICON_SIZE)
  const ctx = offscreen.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable on OffscreenCanvas')

  const center = ICON_SIZE / 2
  const radius = ICON_SIZE / 2 - 4

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fill()

  const bridge = document.createElement('canvas')
  bridge.width = ICON_SIZE
  bridge.height = ICON_SIZE
  const bridgeCtx = bridge.getContext('2d')
  if (!bridgeCtx) throw new Error('2d context unavailable on bridge canvas')
  bridgeCtx.drawImage(offscreen, 0, 0)

  cachedClusterIcon = {
    id: CLUSTER_ICON_ID,
    url: bridge.toDataURL('image/png'),
    width: ICON_SIZE,
    height: ICON_SIZE,
  }
  return cachedClusterIcon
}

const GYM_ICON_ID = 'gym-marker-mask'
let cachedGymIcon: IconDescriptor | undefined

/**
 * The single mask icon every gym marker shares: a plain circle, drawn once
 * and cached at module scope rather than through Task 2's atlas, because a
 * gym has one shape regardless of team - there is nothing per-entity for a
 * cache keyed on appearance to do here. `IconLayer.getColor` tints this per
 * gym from `readTeamColor` (see layers.ts); the pixels drawn here carry no
 * colour of their own beyond full opacity, which is what makes tinting
 * work.
 */
export function drawGymIcon(): IconDescriptor {
  if (cachedGymIcon) return cachedGymIcon

  const offscreen = new OffscreenCanvas(ICON_SIZE, ICON_SIZE)
  const ctx = offscreen.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable on OffscreenCanvas')

  const center = ICON_SIZE / 2
  const radius = ICON_SIZE / 2 - 4

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fill()

  const bridge = document.createElement('canvas')
  bridge.width = ICON_SIZE
  bridge.height = ICON_SIZE
  const bridgeCtx = bridge.getContext('2d')
  if (!bridgeCtx) throw new Error('2d context unavailable on bridge canvas')
  bridgeCtx.drawImage(offscreen, 0, 0)

  cachedGymIcon = {
    id: GYM_ICON_ID,
    url: bridge.toDataURL('image/png'),
    width: ICON_SIZE,
    height: ICON_SIZE,
  }
  return cachedGymIcon
}

/**
 * Drops the module-level icon caches.
 *
 * These hold canvas-derived descriptors that die with the WebGL context, and
 * unlike the pokemon atlas they are plain module state with no owner to clear
 * them. A restore that leaves them populated hands deck.gl textures that no
 * longer exist, which renders nothing and reports nothing.
 */
export function resetSharedIconCaches() {
  cachedClusterIcon = undefined
  cachedGymIcon = undefined
}
