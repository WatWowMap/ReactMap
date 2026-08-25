import { expect, test } from 'bun:test'
import type { IconDescriptor } from './atlas'
import {
  createRingAtlas,
  MAX_RINGS,
  RING_GAP_RADIANS,
  ringKeyFor,
  ringSegments,
} from './ring-icon'

/*
 * `drawRingIcon` itself needs a canvas and cannot run under `bun test`.
 * Everything it decides before it touches one -- how the circle is divided,
 * and what counts as the same picture -- lives in the two functions below
 * so it can be checked here.
 */

const TWO_PI = Math.PI * 2

test('one glow rule paints a full ring', () => {
  const [only] = ringSegments(1)
  expect(only).toBeDefined()
  expect(
    (only as { end: number }).end - (only as { start: number }).start,
  ).toBeCloseTo(TWO_PI, 6)
})

test('two glow rules paint a half each, three paint thirds', () => {
  for (const count of [2, 3]) {
    const segments = ringSegments(count)
    expect(segments).toHaveLength(count)
    for (const segment of segments) {
      expect(segment.end - segment.start).toBeCloseTo(
        TWO_PI / count - RING_GAP_RADIANS,
        6,
      )
    }
  }
})

test('segments are separated by a gap and never overlap', () => {
  const segments = ringSegments(3)
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1] as { end: number }
    const current = segments[index] as { start: number }
    expect(current.start - previous.end).toBeCloseTo(RING_GAP_RADIANS, 6)
  }
})

test('a fourth glow rule is dropped rather than drawn as an unreadable sliver', () => {
  expect(ringSegments(4)).toHaveLength(MAX_RINGS)
  expect(ringSegments(9)).toHaveLength(MAX_RINGS)
})

test('no glow rules means no ring at all', () => {
  expect(ringSegments(0)).toEqual([])
})

test('the ring key is the colour combination and nothing else', () => {
  // The whole point of the separate layer: two different species carrying
  // the same rings share one ring icon.
  expect(ringKeyFor(['#ffc83d'])).toBe(ringKeyFor(['#FFC83D']))
  expect(ringKeyFor(['#ffc83d', '#4f8cff'])).not.toBe(ringKeyFor(['#ffc83d']))
})

test('the ring key keeps colour order, because the picture differs', () => {
  expect(ringKeyFor(['#ffc83d', '#4f8cff'])).not.toBe(
    ringKeyFor(['#4f8cff', '#ffc83d']),
  )
})

test('the ring key ignores colours past the cap, matching what is drawn', () => {
  expect(ringKeyFor(['#a', '#b', '#c', '#d'])).toBe(
    ringKeyFor(['#a', '#b', '#c']),
  )
})

test('an empty ring list has its own key rather than colliding with a colour', () => {
  expect(ringKeyFor([])).toBe('none')
})

const STUB: IconDescriptor = {
  id: 'ring-stub',
  url: 'data:image/png;base64,stub',
  width: 96,
  height: 96,
}

test('the ring atlas draws one icon per colour combination, not one per marker', () => {
  let drawn = 0
  const atlas = createRingAtlas({
    draw: () => {
      drawn += 1
      return STUB
    },
  })
  atlas.getRingIconFor(['#ffc83d'])
  atlas.getRingIconFor(['#ffc83d'])
  atlas.getRingIconFor(['#FFC83D'])
  expect(drawn).toBe(1)
  atlas.getRingIconFor(['#ffc83d', '#4f8cff'])
  expect(drawn).toBe(2)
  expect(atlas.cache.size).toBe(2)
})

test('the ring atlas hands the drawer only the colours that will be drawn', () => {
  const seen: string[][] = []
  const atlas = createRingAtlas({
    draw: (rings) => {
      seen.push([...rings])
      return STUB
    },
  })
  atlas.getRingIconFor(['#a', '#b', '#c', '#d'])
  expect(seen).toEqual([['#a', '#b', '#c']])
})

test('clearing the ring atlas drops every cached icon, as context loss requires', () => {
  const atlas = createRingAtlas({ draw: () => STUB })
  atlas.getRingIconFor(['#ffc83d'])
  atlas.clear()
  expect(atlas.cache.size).toBe(0)
})
