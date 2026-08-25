/**
 * The glow rings a rule paints around a marker, as their own icon set.
 *
 * These are deliberately NOT composited into the species sprite.
 * `iconKeyFor` already keys the species atlas on species, form, costume,
 * gender, badge, background and weather; multiplying that by every colour
 * combination a profile's rules can produce makes the atlas explode, and
 * every rule edit would re-key all of it. Keyed on the colour combination
 * alone, this atlas is a few dozen entries at most and is completely
 * independent of which species happen to be on screen.
 *
 * Colours are never blended. Two matching glow rules draw half a ring each
 * in their own colour rather than one ring in the average of the two -- a
 * colour nobody assigned is worse for everyone and much worse for
 * colourblind users, which is why the rules model rejected mixing.
 */

import { type IconDescriptor, LruCache } from './atlas'

/**
 * How many rings one marker can show. A fourth segment is roughly 20px of
 * arc at the largest rule size, which reads as noise rather than as a
 * colour; the popup still names every matching rule, so nothing is lost
 * beyond the marker itself.
 */
export const MAX_RINGS = 3

/** The gap between neighbouring segments, in radians. Enough that two
 * segments read as two colours rather than one gradient at 24px. */
export const RING_GAP_RADIANS = 0.18

/** The box a ring icon is drawn and packed into. Larger than the sprite's
 * 64 so the ring keeps its stroke width when scaled to sit around it. */
export const RING_ICON_SIZE = 96

/** How much bigger than the sprite the ring is drawn on the map. The ring
 * has to clear the artwork it surrounds without swallowing the marker's
 * neighbours at cluster density. */
export const RING_SIZE_SCALE = 1.35

/** Where a ring segment starts and ends, in canvas radians (0 is 3 o'clock). */
export interface RingSegment {
  start: number
  end: number
}

/** Segments start at the top so a single-colour half-ring is symmetric. */
const TOP = -Math.PI / 2

/**
 * Divides the ring into one arc per colour: one rule a full ring, two a
 * half each, three thirds. A single ring gets no gap, since there is no
 * neighbour to separate it from and a nicked circle just looks broken.
 */
export function ringSegments(count: number): RingSegment[] {
  const rings = Math.min(Math.max(count, 0), MAX_RINGS)
  if (rings === 0) return []
  if (rings === 1) return [{ start: TOP, end: TOP + Math.PI * 2 }]
  const span = (Math.PI * 2) / rings
  return Array.from({ length: rings }, (_, index) => {
    const start = TOP + index * span + RING_GAP_RADIANS / 2
    return { start, end: start + span - RING_GAP_RADIANS }
  })
}

/**
 * The cache key for one ring combination: the colours themselves, capped
 * and lower-cased, and nothing else. Order is kept because it is the order
 * the segments are drawn in -- `matched` order, which the popup names the
 * rings in too -- so two entities carrying the same colours the other way
 * round genuinely are two different pictures.
 */
export function ringKeyFor(rings: readonly string[]): string {
  if (rings.length === 0) return 'none'
  return rings
    .slice(0, MAX_RINGS)
    .map((color) => color.toLowerCase())
    .join('|')
}

/**
 * Draws the ring segments onto an `OffscreenCanvas` and hands back a data
 * URL. Same offscreen-then-bridge technique, and same reason, as
 * `drawPokemonIcon`: `OffscreenCanvas.convertToBlob` is promise-based and
 * this pipeline is synchronous, so a never-attached `<canvas>` is blitted
 * to purely for its synchronous `toDataURL`.
 *
 * Browser only -- `OffscreenCanvas` does not exist under `bun test`, which
 * is why the geometry and the key above are separate exported functions
 * rather than locals of this one.
 */
export function drawRingIcon(
  rings: readonly string[],
  key: string,
): IconDescriptor {
  const offscreen = new OffscreenCanvas(RING_ICON_SIZE, RING_ICON_SIZE)
  const ctx = offscreen.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable on OffscreenCanvas')

  const center = RING_ICON_SIZE / 2
  const lineWidth = RING_ICON_SIZE * 0.11
  const radius = center - lineWidth / 2 - 1

  ctx.lineWidth = lineWidth
  ctx.lineCap = 'butt'
  const segments = ringSegments(rings.length)
  segments.forEach((segment, index) => {
    ctx.strokeStyle = rings[index] as string
    ctx.beginPath()
    ctx.arc(center, center, radius, segment.start, segment.end)
    ctx.stroke()
  })

  const bridge = document.createElement('canvas')
  bridge.width = RING_ICON_SIZE
  bridge.height = RING_ICON_SIZE
  const bridgeCtx = bridge.getContext('2d')
  if (!bridgeCtx) throw new Error('2d context unavailable on bridge canvas')
  bridgeCtx.drawImage(offscreen, 0, 0)

  return {
    id: `ring:${key}`,
    url: bridge.toDataURL('image/png'),
    width: RING_ICON_SIZE,
    height: RING_ICON_SIZE,
  }
}

/** A colour combination is at most three of a handful of rule colours, so
 * this never grows the way the species atlas can. */
const DEFAULT_RING_CAPACITY = 64

export interface RingAtlasOptions {
  draw?: (rings: readonly string[], key: string) => IconDescriptor
  capacity?: number
}

/**
 * Cache-then-draw over ring combinations, the same shape as `createAtlas`
 * and injectable for the same reason: the cache is testable, the canvas is
 * not.
 */
export function createRingAtlas({
  draw = drawRingIcon,
  capacity = DEFAULT_RING_CAPACITY,
}: RingAtlasOptions = {}): {
  getRingIconFor: (rings: readonly string[]) => IconDescriptor
  cache: LruCache<string, IconDescriptor>
  clear: () => void
} {
  const cache = new LruCache<string, IconDescriptor>(capacity)

  function getRingIconFor(rings: readonly string[]): IconDescriptor {
    const key = ringKeyFor(rings)
    const cached = cache.get(key)
    if (cached) return cached
    const drawn = draw(rings.slice(0, MAX_RINGS), key)
    cache.set(key, drawn)
    return drawn
  }

  return { getRingIconFor, cache, clear: () => cache.clear() }
}
