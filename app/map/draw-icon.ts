import type { IconDescriptor, IconDrawer } from './atlas'
import type { PokemonEntity } from './types'

const ICON_SIZE = 64

/**
 * Colours a pokemon's base circle by whether it carries a badge or weather
 * boost, the only two appearance modifiers this placeholder renders
 * distinctly (background and costume/form influence real sprite art, which
 * this project has none of yet). This is a stand-in for real species
 * artwork, not a claim that it is one; swapping in sprite sheets later
 * replaces this function's body without touching its signature or anyone
 * that calls it.
 */
function baseColorFor(entity: PokemonEntity): string {
  if (entity.weather !== undefined) return '#7dd3fc'
  if (entity.badge !== undefined) return '#fbbf24'
  return '#e5e7eb'
}

/**
 * Draws one pokemon marker's pixels onto an `OffscreenCanvas` - a circle in
 * `baseColorFor`'s colour with the species id centred on it, plus a ring
 * when the entity carries a badge - and hands back a data URL `IconLayer`
 * can fetch.
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
export const drawPokemonIcon: IconDrawer = (
  entity: PokemonEntity,
  key: string,
): IconDescriptor => {
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
    id: key,
    url: bridge.toDataURL('image/png'),
    width: ICON_SIZE,
    height: ICON_SIZE,
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
