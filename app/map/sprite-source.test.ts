import { afterEach, expect, test } from 'bun:test'
import {
  loadSpriteIndex,
  resetSpriteIndex,
  SPRITE_BASE_URL,
  SPRITE_ICON_SIZE,
  type SpriteIndex,
  spriteIndex,
  spriteUrlFor,
} from './sprite-source'
import type { PokemonEntity } from './types'

/*
 * The drawing half of sprites needs a canvas and cannot run here (see
 * draw-icon.ts). What is tested is the half that decides WHICH url a marker
 * gets and how many times the index is fetched -- both plain data-in
 * data-out, and both the parts that go wrong quietly.
 */

const BASE: PokemonEntity = {
  kind: 'pokemon',
  spawnId: 'spawn-a',
  pokemonId: 25,
  form: 3,
  costume: 11,
  gender: 2,
  lat: 42.358,
  lon: -71.06,
  expiresAt: 1_000,
}

afterEach(resetSpriteIndex)

test('spriteUrlFor asks the index for the entity, not for a path it built itself', () => {
  const calls: unknown[][] = []
  const index: SpriteIndex = {
    pokemon: (...args) => {
      calls.push(args)
      return 'https://example.test/pokemon/25_f3_c11_g2.webp'
    },
  }
  expect(spriteUrlFor(index, BASE)).toBe(
    `https://example.test/pokemon/25_f3_c11_g2.webp?size=${SPRITE_ICON_SIZE}`,
  )
  expect(calls).toEqual([[25, 0, 3, 11, 2]])
})

test('spriteUrlFor reports no sprite when the index is not loaded yet', () => {
  expect(spriteUrlFor(null, BASE)).toBeUndefined()
})

test('spriteUrlFor treats an empty string from the index as no sprite, not as a url', () => {
  // uicons returns '' for every call made before its index is initialised.
  // Passing that through would hand deck.gl an icon with no image, which
  // renders an invisible marker rather than a visible fallback.
  const index: SpriteIndex = { pokemon: () => '' }
  expect(spriteUrlFor(index, BASE)).toBeUndefined()
})

test('loadSpriteIndex builds the index once however many callers ask', async () => {
  let built = 0
  const create = async (): Promise<SpriteIndex> => {
    built += 1
    return { pokemon: () => 'https://example.test/pokemon/0.webp' }
  }
  const [first, second] = await Promise.all([
    loadSpriteIndex(create),
    loadSpriteIndex(create),
  ])
  expect(built).toBe(1)
  expect(first).toBe(second)
  expect(await loadSpriteIndex(create)).toBe(first)
  expect(built).toBe(1)
  expect(spriteIndex()).toBe(first)
})

test('loadSpriteIndex degrades to placeholders instead of rejecting when the repository is unreachable', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const index = await loadSpriteIndex(async () => {
      throw new Error('offline')
    })
    expect(index).toBeNull()
    expect(spriteIndex()).toBeNull()
  } finally {
    console.warn = warn
  }
})

test('the sprite base is our own origin, not a third party', () => {
  // The whole point of the proxy: a firewalled or air-gapped deploy has to
  // be able to paint a map, and every absolute host here is a deploy that
  // cannot.
  expect(SPRITE_BASE_URL.startsWith('/')).toBe(true)
  expect(SPRITE_BASE_URL).not.toInclude('://')
})

test('spriteUrlFor asks for the size the atlas actually packs', () => {
  const index: SpriteIndex = { pokemon: () => '/api/icons/pokemon/25.webp' }
  expect(spriteUrlFor(index, BASE)).toBe(
    `/api/icons/pokemon/25.webp?size=${SPRITE_ICON_SIZE}`,
  )
})

test('loadSpriteIndex fetches the index from our own origin by default', async () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen.push(String(input))
    return new Response(JSON.stringify({ pokemon: ['0.webp'] }), {
      status: 200,
    })
  }) as typeof fetch
  try {
    await loadSpriteIndex()
    expect(seen).toEqual([`${SPRITE_BASE_URL}/index.json`])
  } finally {
    globalThis.fetch = realFetch
  }
})
