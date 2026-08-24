import { expect, test } from 'bun:test'
import type { PickingInfo } from '@deck.gl/core'
import { IconLayer } from '@deck.gl/layers'
import type { GymEntity, PokemonEntity } from './types'
import {
  anchorFor,
  buildOverlayProps,
  pickedEntityFrom,
  viewportFrom,
} from './use-map-libre'

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

test('overlay props omit onClick when none is given, so deck.gl skips picking work on every click', () => {
  const props = buildOverlayProps([])
  expect('onClick' in props).toBe(false)
})

test('overlay props carry the click handler through when one is given', () => {
  const onClick = () => {}
  const props = buildOverlayProps([], onClick)
  expect(props.onClick).toBe(onClick)
})

/*
 * Picking and reprojection themselves need a WebGL context and a mounted
 * MapLibre map, which this environment does not have (see the file-level
 * comment above). What is testable in isolation is the selection state
 * transition - a picking result in, an entity or null out - and the pure
 * coordinate lookup that decides what a popup anchors to.
 */

const POKEMON: PokemonEntity = {
  kind: 'pokemon',
  spawnId: 'spawn-1',
  pokemonId: 25,
  form: 0,
  costume: 0,
  gender: 1,
  lat: 51.5,
  lon: -0.1,
  expiresAt: 1_000,
}

const GYM: GymEntity = {
  kind: 'gym',
  gymId: 'gym-1',
  lat: 40.7,
  lon: -74,
  team: 2,
  inBattle: false,
}

function pickingInfoFor(object: PokemonEntity | GymEntity | undefined) {
  return { object } as PickingInfo
}

test('a picking hit on a pokemon selects that pokemon', () => {
  expect(pickedEntityFrom(pickingInfoFor(POKEMON))).toEqual(POKEMON)
})

test('a picking hit on a gym selects that gym', () => {
  expect(pickedEntityFrom(pickingInfoFor(GYM))).toEqual(GYM)
})

test('a picking miss (empty map, no object) clears the selection', () => {
  expect(pickedEntityFrom(pickingInfoFor(undefined))).toBeNull()
})

test('the anchor for a selected entity is exactly its coordinate', () => {
  expect(anchorFor(POKEMON)).toEqual({ lat: 51.5, lon: -0.1 })
})

test('the anchor for no selection is null', () => {
  expect(anchorFor(null)).toBeNull()
})

/*
 * The bounds-to-Bounds mapping is four accessors read in an order that is
 * easy to get wrong and renders without erroring when it is: a swapped west
 * and east gives a bbox supercluster quietly returns nothing for, which
 * looks exactly like an empty map. Values here are deliberately asymmetric
 * so a swap cannot pass.
 */
test('viewportFrom reads each edge of the camera bounds into its own field', () => {
  const viewport = viewportFrom({
    getBounds: () => ({
      getWest: () => -3,
      getSouth: () => 50,
      getEast: () => 1,
      getNorth: () => 54,
    }),
    getZoom: () => 11.4,
  })
  expect(viewport).toEqual({
    bounds: { west: -3, south: 50, east: 1, north: 54 },
    zoom: 11.4,
  })
})
