import { afterAll, beforeAll, expect, test } from 'bun:test'
import { ruleFixture } from '../rules/rule-fixtures'
import { setupDom, teardownDom } from '../test-setup'
import type { IconDescriptor } from './atlas'
import {
  buildClusterIconLayer,
  buildClusterTextLayer,
  buildGymIconLayer,
  buildMapLayers,
  buildPokemonIconLayer,
  buildPokemonRingLayer,
  buildPokemonTextLayer,
  formatCountdown,
  GYM_CLUSTER_ICON_LAYER_ID,
  GYM_CLUSTER_LABEL_LAYER_ID,
  GYM_ICON_LAYER_ID,
  POKEMON_ICON_LAYER_ID,
  POKEMON_LABEL_LAYER_ID,
  POKEMON_RING_LAYER_ID,
  readClusterColor,
  readClusterLabelColor,
  readTeamColor,
} from './layers'
import { RING_SIZE_SCALE } from './ring-icon'
import type { GymEntity, PokemonEntity } from './types'

/*
 * Layers need a real WebGL context to render, which the test environment
 * lacks (see task-4-report.md). What is tested here is construction: given
 * entities, do the right layers come out with the right ids, counts and
 * accessors. Whether markers actually sit under street labels in an
 * interleaved MapLibre map is a claim only a browser can back; nothing
 * below asserts that.
 */

beforeAll(setupDom)
afterAll(teardownDom)

const POKEMON: PokemonEntity = {
  kind: 'pokemon',
  spawnId: 'spawn-1',
  pokemonId: 6,
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
  lat: 51.6,
  lon: -0.2,
  team: 2,
  inBattle: false,
}

const STUB_ICON: IconDescriptor = {
  id: 'stub',
  url: 'data:image/png;base64,stub',
  width: 64,
  height: 64,
}

test('formatCountdown counts down from a pinned now', () => {
  expect(formatCountdown(90_000, 0)).toBe('1:30')
  expect(formatCountdown(5_000, 0)).toBe('0:05')
})

test('formatCountdown clamps an already-expired entity to zero rather than going negative', () => {
  // This is the fixtures' actual situation: FIXTURE_EPOCH is a fixed past
  // instant, so every fixture pokemon's expiresAt is behind real
  // wall-clock now. A countdown must not read as a negative or wrap.
  expect(formatCountdown(1_000, 999_999)).toBe('0:00')
})

test('buildPokemonIconLayer produces one instance per entity with the atlas descriptor', () => {
  const layer = buildPokemonIconLayer([POKEMON], () => STUB_ICON)
  expect(layer.id).toBe(POKEMON_ICON_LAYER_ID)
  expect(layer.props.data).toHaveLength(1)
  const icon = (layer.props.getIcon as (entity: PokemonEntity) => unknown)(
    POKEMON,
  )
  expect(icon).toEqual({
    id: STUB_ICON.id,
    url: STUB_ICON.url,
    width: STUB_ICON.width,
    height: STUB_ICON.height,
  })
})

test('buildPokemonIconLayer calls getIconFor once per accessor invocation, not eagerly for the whole set', () => {
  let calls = 0
  const layer = buildPokemonIconLayer([POKEMON], () => {
    calls += 1
    return STUB_ICON
  })
  expect(calls).toBe(0)
  ;(layer.props.getIcon as (entity: PokemonEntity) => unknown)(POKEMON)
  expect(calls).toBe(1)
})

test('buildPokemonTextLayer renders iv and countdown together when iv is present', () => {
  const withIv: PokemonEntity = { ...POKEMON, iv: 82, expiresAt: 65_000 }
  const layer = buildPokemonTextLayer([withIv], 5_000)
  expect(layer.id).toBe(POKEMON_LABEL_LAYER_ID)
  const text = (layer.props.getText as (entity: PokemonEntity) => string)(
    withIv,
  )
  expect(text).toBe('82% 1:00')
})

test('buildPokemonTextLayer omits iv entirely when the entity has none', () => {
  const layer = buildPokemonTextLayer([POKEMON], 0)
  const text = (layer.props.getText as (entity: PokemonEntity) => string)(
    POKEMON,
  )
  expect(text).not.toContain('%')
})

test('buildPokemonTextLayer data count matches the visible set, one entry per timer', () => {
  const many = Array.from({ length: 12 }, (_, index) => ({
    ...POKEMON,
    spawnId: `spawn-${index}`,
  }))
  const layer = buildPokemonTextLayer(many, 0)
  expect(layer.props.data).toHaveLength(12)
})

test('readTeamColor resolves a token set on the given root element', () => {
  // happy-dom (and real browsers) only resolve computed style, custom
  // properties included, for an element actually attached to the document;
  // a detached element's getComputedStyle reads every property as empty,
  // which looks identical to a pruned token if this were skipped.
  const root = document.createElement('div')
  root.style.setProperty('--color-team-2', '#d83c22')
  document.body.appendChild(root)
  try {
    expect(readTeamColor(2, root)).toEqual([0xd8, 0x3c, 0x22, 255])
  } finally {
    root.remove()
  }
})

test('readTeamColor falls back to a visible grey, not a colourless value, when the token does not resolve', () => {
  const root = document.createElement('div')
  // No --color-team-1 set on this element: simulates the token being
  // pruned or the palette stylesheet not having loaded.
  const warn = console.warn
  let warned = false
  console.warn = () => {
    warned = true
  }
  try {
    const color = readTeamColor(1, root)
    expect(color).toEqual([128, 128, 128, 255])
    expect(warned).toBe(true)
  } finally {
    console.warn = warn
  }
})

test('buildGymIconLayer tints its shared mask icon per entity from the team token', () => {
  const root = document.createElement('div')
  root.style.setProperty('--color-team-2', '#d83c22')
  document.body.appendChild(root)
  try {
    const layer = buildGymIconLayer([GYM], () => STUB_ICON, root)
    expect(layer.id).toBe(GYM_ICON_LAYER_ID)
    expect(layer.props.data).toHaveLength(1)
    const color = (layer.props.getColor as (entity: GymEntity) => unknown)(GYM)
    expect(color).toEqual([0xd8, 0x3c, 0x22, 255])
  } finally {
    root.remove()
  }
})

test('buildGymIconLayer marks the shared icon as a mask so getColor actually tints it', () => {
  const layer = buildGymIconLayer([GYM], () => STUB_ICON)
  const getIcon = layer.props.getIcon as unknown as (entity: GymEntity) => {
    mask?: boolean
  }
  expect(getIcon(GYM).mask).toBe(true)
})

test('buildMapLayers returns gyms, pokemon icons and pokemon labels, in that draw order', () => {
  const { layers } = buildMapLayers({
    pokemon: [POKEMON],
    gyms: [GYM],
    getIconFor: () => STUB_ICON,
    getGymIcon: () => STUB_ICON,
    now: 0,
  })
  expect(layers.map((layer) => layer.id)).toEqual([
    GYM_ICON_LAYER_ID,
    POKEMON_ICON_LAYER_ID,
    POKEMON_LABEL_LAYER_ID,
  ])
})

test('buildMapLayers scales to the viewport-sized set the fixtures exist to exercise', () => {
  const pokemon = Array.from({ length: 500 }, (_, index) => ({
    ...POKEMON,
    spawnId: `spawn-${index}`,
  }))
  const { layers } = buildMapLayers({
    pokemon,
    gyms: [],
    getIconFor: () => STUB_ICON,
    getGymIcon: () => STUB_ICON,
    now: 0,
  })
  const iconLayer = layers.find((layer) => layer.id === POKEMON_ICON_LAYER_ID)
  expect(iconLayer?.props.data).toHaveLength(500)
})

/*
 * The point of the flag is that a capped map and an empty area look the same
 * on screen, so the flag has to reach a caller that can say which one it is.
 * An earlier pass computed it in clusterEntities and dropped it here, which
 * is the same as not computing it.
 */
test('buildMapLayers reports no cap when nothing was clustered', () => {
  const result = buildMapLayers({
    pokemon: [POKEMON],
    gyms: [GYM],
    getIconFor: () => STUB_ICON,
    getGymIcon: () => STUB_ICON,
    now: 0,
  })
  expect(result.limitHit).toEqual({ pokemon: false, gyms: false })
})

test('buildMapLayers carries limitHit out of the gym clusterer', () => {
  const gyms = Array.from({ length: 400 }, (_, index) => ({
    ...GYM,
    gymId: `gym-${index}`,
    lat: 51 + (index % 20) * 0.05,
    lon: -0.5 + Math.floor(index / 20) * 0.05,
  }))
  const result = buildMapLayers({
    pokemon: [],
    gyms,
    getIconFor: () => STUB_ICON,
    getGymIcon: () => STUB_ICON,
    now: 0,
    viewport: {
      bounds: { west: -1, south: 50, east: 1, north: 53 },
      zoom: 14,
    },
    clusterRules: {
      gyms: { zoomLevel: 13, forcedLimit: 50, minPoints: 2 },
    },
  })
  expect(result.limitHit.gyms).toBe(true)
  expect(result.limitHit.pokemon).toBe(false)
})

/*
 * Cluster bubbles read the same palette the gym layer does. These were
 * hardcoded RGBA literals in this file until the tokens existed, which is the
 * one thing the plan's colour constraint exists to prevent: a map colour that
 * cannot be changed from the palette is a map colour nothing can review.
 */
test('readClusterColor picks a bucket token by count and keeps the bubble alpha', () => {
  const root = document.createElement('div')
  root.style.setProperty('--color-cluster-small', '#6ecc39')
  root.style.setProperty('--color-cluster-medium', '#f0c20c')
  root.style.setProperty('--color-cluster-large', '#f18017')
  document.body.appendChild(root)
  try {
    expect(readClusterColor(12, root)).toEqual([0x6e, 0xcc, 0x39, 230])
    expect(readClusterColor(100, root)).toEqual([0xf0, 0xc2, 0x0c, 230])
    expect(readClusterColor(1000, root)).toEqual([0xf1, 0x80, 0x17, 230])
  } finally {
    root.remove()
  }
})

test('readClusterColor falls back to a visible grey when its token does not resolve', () => {
  const root = document.createElement('div')
  const warn = console.warn
  let warned = false
  console.warn = () => {
    warned = true
  }
  try {
    expect(readClusterColor(5, root)).toEqual([128, 128, 128, 230])
    expect(warned).toBe(true)
  } finally {
    console.warn = warn
  }
})

test('buildClusterIconLayer and buildClusterTextLayer take their colours from the palette', () => {
  const root = document.createElement('div')
  root.style.setProperty('--color-cluster-medium', '#f0c20c')
  root.style.setProperty('--color-cluster-label', '#111827')
  document.body.appendChild(root)
  const cluster = {
    kind: 'cluster' as const,
    id: 'cluster-1',
    lat: 51.5,
    lon: -0.1,
    count: 250,
  }
  try {
    const icons = buildClusterIconLayer(
      [cluster],
      GYM_CLUSTER_ICON_LAYER_ID,
      () => STUB_ICON,
      root,
    )
    const getColor = icons.props.getColor as (marker: typeof cluster) => unknown
    expect(getColor(cluster)).toEqual([0xf0, 0xc2, 0x0c, 230])

    const labels = buildClusterTextLayer(
      [cluster],
      GYM_CLUSTER_LABEL_LAYER_ID,
      root,
    )
    expect(labels.props.getColor).toEqual([0x11, 0x18, 0x27, 255])
  } finally {
    root.remove()
  }
})

test('readClusterLabelColor falls back to a visible grey when its token does not resolve', () => {
  const root = document.createElement('div')
  const warn = console.warn
  let warned = false
  console.warn = () => {
    warned = true
  }
  try {
    expect(readClusterLabelColor(root)).toEqual([128, 128, 128, 255])
    expect(warned).toBe(true)
  } finally {
    console.warn = warn
  }
})

/*
 * Rings and sizes: what the rule system actually asks a marker to look
 * like. The pixels are a browser's business, but which entity gets a ring,
 * which icon it asks for, and how big it draws are all decided here.
 */

const RULES = new Map([
  [7, ruleFixture({ id: 7, name: 'Hundos', size: 'xl', glow: '#ffc83d' })],
  [12, ruleFixture({ id: 12, name: 'Great League', glow: '#4f8cff' })],
  [30, ruleFixture({ id: 30, name: 'Big', size: 'lg' })],
])

test('marker size follows the rule that matched, largest wins, md when nothing did', () => {
  const layer = buildPokemonIconLayer(
    [POKEMON],
    () => STUB_ICON,
    new Map([
      [1, ruleFixture({ id: 1, size: 'sm' })],
      [2, ruleFixture({ id: 2, size: 'md' })],
      [3, ruleFixture({ id: 3, size: 'lg' })],
      [4, ruleFixture({ id: 4, size: 'xl' })],
    ]),
  )
  const getSize = layer.props.getSize as (entity: PokemonEntity) => number
  // 'sm' is reachable as a rule value but not as a resolved one:
  // resolveAppearance starts at 'md' and only ever takes the maximum, so a
  // small rule leaves the marker at the neutral default. The mapping still
  // has to carry it, since the sheet can store it.
  expect(getSize({ ...POKEMON, matched: [1] })).toBe(32)
  expect(getSize({ ...POKEMON, matched: [2] })).toBe(32)
  expect(getSize({ ...POKEMON, matched: [3] })).toBe(40)
  expect(getSize({ ...POKEMON, matched: [4] })).toBe(48)
  expect(getSize({ ...POKEMON, matched: [1, 4] })).toBe(48)
  expect(getSize(POKEMON)).toBe(32)
})

test('the ring layer carries only the pokemon a glow rule actually matched', () => {
  const glowing = { ...POKEMON, spawnId: 'glow', matched: [7] }
  const sized = { ...POKEMON, spawnId: 'sized', matched: [30] }
  const layer = buildPokemonRingLayer(
    [glowing, sized, POKEMON],
    () => STUB_ICON,
    RULES,
  )
  expect(layer.id).toBe(POKEMON_RING_LAYER_ID)
  expect(layer.props.data).toEqual([glowing])
})

test('the ring layer asks for an icon by colour combination, not by species', () => {
  const asked: string[][] = []
  const layer = buildPokemonRingLayer(
    [{ ...POKEMON, matched: [7, 12] }],
    (rings) => {
      asked.push([...rings])
      return STUB_ICON
    },
    RULES,
  )
  const getIcon = layer.props.getIcon as (entity: PokemonEntity) => unknown
  getIcon({ ...POKEMON, pokemonId: 6, matched: [7, 12] })
  getIcon({ ...POKEMON, pokemonId: 149, matched: [7, 12] })
  expect(asked).toEqual([
    ['#ffc83d', '#4f8cff'],
    ['#ffc83d', '#4f8cff'],
  ])
})

test('a ring draws larger than the sprite it surrounds, at every rule size', () => {
  const layer = buildPokemonRingLayer(
    [{ ...POKEMON, matched: [7] }],
    () => STUB_ICON,
    RULES,
  )
  const ringSize = (layer.props.getSize as (entity: PokemonEntity) => number)({
    ...POKEMON,
    matched: [7],
  })
  const spriteSize = (
    buildPokemonIconLayer([POKEMON], () => STUB_ICON, RULES).props.getSize as (
      entity: PokemonEntity,
    ) => number
  )({ ...POKEMON, matched: [7] })
  expect(ringSize).toBe(spriteSize * RING_SIZE_SCALE)
  expect(ringSize).toBeGreaterThan(spriteSize)
})

test('buildMapLayers draws rings beneath the sprites, and only when asked for', () => {
  const options = {
    pokemon: [POKEMON],
    gyms: [GYM],
    getIconFor: () => STUB_ICON,
    getGymIcon: () => STUB_ICON,
    now: 0,
  }
  expect(
    buildMapLayers({ ...options, getRingIcon: () => STUB_ICON }).layers.map(
      (layer) => layer.id,
    ),
  ).toEqual([
    GYM_ICON_LAYER_ID,
    POKEMON_RING_LAYER_ID,
    POKEMON_ICON_LAYER_ID,
    POKEMON_LABEL_LAYER_ID,
  ])
  expect(buildMapLayers(options).layers.map((layer) => layer.id)).not.toContain(
    POKEMON_RING_LAYER_ID,
  )
})
