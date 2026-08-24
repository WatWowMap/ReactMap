import { expect, test } from 'bun:test'
import { IconLayer } from '@deck.gl/layers'
import { buildOverlayProps } from './useMapLibre'

/*
 * Mounting a real MapLibre map needs a WebGL context the test environment
 * does not have, so `useMapLibre` itself is not exercised here. What is
 * asserted instead is the one setting that determines whether markers
 * render under or over MapLibre's street labels: `interleaved: true` on
 * the props `MapboxOverlay` is constructed with. Getting it wrong renders
 * without erroring, so this is the only automated guard against that
 * regressing; whether the interleaving visually looks right still needs a
 * browser (see task-4-report.md).
 */

test('overlay props request interleaved rendering', () => {
  const props = buildOverlayProps([])
  expect(props.interleaved).toBe(true)
})

test('overlay props carry whatever layers are passed through unchanged', () => {
  const layer = new IconLayer({
    id: 'probe',
    data: [],
    getPosition: () => [0, 0],
    getIcon: () => ({ id: 'x', url: 'u', width: 1, height: 1 }),
  })
  const props = buildOverlayProps([layer])
  expect(props.layers).toEqual([layer])
})
