import { afterEach, describe, expect, it } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  createIconProxy,
  FALLBACK_ICON_PNG,
  type IconProxy,
  type IconProxyConfig,
} from '../src/services/icon-proxy'

const BASE_URL = 'https://icons.example.test/set'

/** The stub uicons index every test in here is allowed to name files from. */
const INDEX = {
  pokemon: ['25.webp', '0.webp'],
  raid: { egg: ['1.webp'] },
  reward: { candy: ['1.webp'] },
}

/**
 * An "upstream" sprite that is deliberately not square, so a response built
 * from it can be told apart from the square fallback by its dimensions
 * alone rather than by trusting a header.
 */
async function upstreamSprite(): Promise<Uint8Array> {
  return new Bun.Image(FALLBACK_ICON_PNG)
    .resize(120, 100, { fit: 'fill' })
    .webp()
    .bytes()
}

interface Harness {
  proxy: IconProxy
  calls: string[]
  cacheDir: string
  /** Status returned for any sprite request; `200` serves the sprite. */
  spriteStatus: number
  indexStatus: number
}

let harnesses: Harness[] = []

function makeHarness(overrides: Partial<IconProxyConfig> = {}): Harness {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-icon-proxy-'))
  const harness: Harness = {
    proxy: undefined as unknown as IconProxy,
    calls: [],
    cacheDir,
    spriteStatus: 200,
    indexStatus: 200,
  }
  const sprite = upstreamSprite()
  const config: IconProxyConfig = {
    baseUrl: BASE_URL,
    cacheDir,
    timeoutMs: 1_000,
    indexTtlMs: 60_000,
    fetch: (async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input)
      harness.calls.push(url)
      if (url.endsWith('/index.json')) {
        return harness.indexStatus === 200
          ? new Response(JSON.stringify(INDEX), { status: 200 })
          : new Response('nope', { status: harness.indexStatus })
      }
      return harness.spriteStatus === 200
        ? new Response(await sprite, { status: 200 })
        : new Response('nope', { status: harness.spriteStatus })
    }) as typeof fetch,
    ...overrides,
  }
  harness.proxy = createIconProxy(config)
  harnesses.push(harness)
  return harness
}

const get = (h: Harness, url: string) =>
  h.proxy.handle(new Request(`http://localhost:8080${url}`))

/** Bun's `Response.bytes()` is not in the DOM lib this project typechecks against. */
const bytesOf = async (res: Response) => new Uint8Array(await res.arrayBuffer())

afterEach(() => {
  for (const h of harnesses) {
    fs.rmSync(h.cacheDir, { recursive: true, force: true })
  }
  harnesses = []
})

describe('icon proxy index', () => {
  it('serves the uicons index from our own origin', async () => {
    const h = makeHarness()
    const res = await get(h, '/api/icons/index.json')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual(INDEX)
  })

  it('fetches the index once and serves it from memory after', async () => {
    const h = makeHarness()
    await get(h, '/api/icons/index.json')
    await get(h, '/api/icons/index.json')

    expect(h.calls.filter((c) => c.endsWith('/index.json'))).toHaveLength(1)
  })

  it('gzips the index for a client that accepts it', async () => {
    const h = makeHarness()
    const res = await h.proxy.handle(
      new Request('http://localhost:8080/api/icons/index.json', {
        headers: { 'accept-encoding': 'gzip, deflate, br' },
      }),
    )

    expect(res.headers.get('content-encoding')).toBe('gzip')
    const raw = await bytesOf(res)
    expect(JSON.parse(new TextDecoder().decode(Bun.gunzipSync(raw)))).toEqual(
      INDEX,
    )
  })

  it('sends the index uncompressed to a client that did not ask for gzip', async () => {
    const h = makeHarness()
    const res = await get(h, '/api/icons/index.json')

    expect(res.headers.get('content-encoding')).toBeNull()
    expect(await res.json()).toEqual(INDEX)
  })

  it('degrades to 503 rather than throwing when the index cannot load', async () => {
    const h = makeHarness()
    h.indexStatus = 500
    const res = await get(h, '/api/icons/index.json')

    expect(res.status).toBe(503)
  })
})

describe('icon proxy allowlist', () => {
  it('refuses a file the index does not list, without any upstream request', async () => {
    const h = makeHarness()
    const res = await get(h, '/api/icons/pokemon/9999.webp')

    expect(res.status).toBe(404)
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(0)
  })

  it('refuses a category the index does not list', async () => {
    const h = makeHarness()
    expect((await get(h, '/api/icons/secrets/25.webp')).status).toBe(404)
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(0)
  })

  it('serves a nested category the index does list', async () => {
    const h = makeHarness()
    expect((await get(h, '/api/icons/raid/egg/1.webp')).status).toBe(200)
    expect((await get(h, '/api/icons/reward/candy/1.webp')).status).toBe(200)
  })

  it.each([
    '/api/icons/pokemon/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '/api/icons/%2e%2e/%2e%2e/etc/passwd',
    '/api/icons/pokemon/..%2F..%2Fetc%2Fpasswd',
    '/api/icons//evil.example.com/25.webp',
    '/api/icons/https:/evil.example.com/25.webp',
    '/api/icons/pokemon/25.webp%00.png',
    '/api/icons/a/b/c/d/25.webp',
    '/api/icons/25.webp',
  ])('refuses %s without an upstream request', async (bad) => {
    const h = makeHarness()
    const res = await get(h, bad)

    expect(res.status).toBe(404)
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(0)
  })

  it('never lets request input reach the upstream URL', async () => {
    const h = makeHarness()
    await get(h, '/api/icons/pokemon/25.webp')
    const sprites = h.calls.filter((c) => !c.endsWith('/index.json'))

    expect(sprites).toEqual([`${BASE_URL}/pokemon/25.webp`])
  })
})

describe('icon proxy size and format', () => {
  it('refuses a size outside the allowed set, without an upstream request', async () => {
    const h = makeHarness()
    for (const size of ['20000', '65', '-64', 'abc']) {
      const res = await get(h, `/api/icons/pokemon/25.webp?size=${size}`)
      expect(res.status).toBe(400)
    }
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(0)
  })

  it('refuses an unknown format', async () => {
    const h = makeHarness()
    expect((await get(h, '/api/icons/pokemon/25.webp?format=svg')).status).toBe(
      400,
    )
  })

  it('resizes into the requested box while keeping aspect ratio', async () => {
    const h = makeHarness()
    const res = await get(h, '/api/icons/pokemon/25.webp?size=64')
    const meta = await new Bun.Image(await bytesOf(res)).metadata()

    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(meta.width).toBe(64)
    expect(meta.height).toBe(53)
  })

  it('keys the cache by size so two sizes do not collide', async () => {
    const h = makeHarness()
    const small = await new Bun.Image(
      await bytesOf(await get(h, '/api/icons/pokemon/25.webp?size=32')),
    ).metadata()
    const large = await new Bun.Image(
      await bytesOf(await get(h, '/api/icons/pokemon/25.webp?size=128')),
    ).metadata()

    expect(small.width).toBe(32)
    expect(large.width).toBe(120)
  })
})

describe('icon proxy cache', () => {
  it('serves a cached file without refetching it', async () => {
    const h = makeHarness()
    const first = await get(h, '/api/icons/pokemon/25.webp')
    const second = await get(h, '/api/icons/pokemon/25.webp')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await bytesOf(second)).toEqual(await bytesOf(first))
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(1)
  })

  it('refetches rather than serving a corrupt cached file forever', async () => {
    const h = makeHarness()
    const res = await get(h, '/api/icons/pokemon/25.webp')
    const good = await bytesOf(res)

    const cached = h.proxy.cachePathFor('pokemon/25.webp', 64, 'webp')
    fs.writeFileSync(cached, 'not an image at all')

    const after = await get(h, '/api/icons/pokemon/25.webp')

    expect(await bytesOf(after)).toEqual(good)
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(2)
  })
})

describe('icon proxy failure modes', () => {
  it('serves a visible fallback when the upstream 404s', async () => {
    const h = makeHarness()
    h.spriteStatus = 404
    const res = await get(h, '/api/icons/pokemon/25.webp')
    const meta = await new Bun.Image(await bytesOf(res)).metadata()

    expect(res.status).toBe(200)
    expect(res.headers.get('x-icon-fallback')).toBe('1')
    expect(meta.width).toBe(64)
    expect(meta.height).toBe(64)
  })

  it('does not cache the fallback in place of the real sprite', async () => {
    const h = makeHarness()
    h.spriteStatus = 404
    await get(h, '/api/icons/pokemon/25.webp')
    h.spriteStatus = 200
    const res = await get(h, '/api/icons/pokemon/25.webp')
    const meta = await new Bun.Image(await bytesOf(res)).metadata()

    expect(res.headers.get('x-icon-fallback')).toBeNull()
    expect(meta.height).toBe(53)
  })

  it('serves the fallback rather than hanging when the upstream never answers', async () => {
    const h = makeHarness({
      timeoutMs: 25,
      fetch: ((input: string | URL | Request, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.endsWith('/index.json')) {
          return Promise.resolve(
            new Response(JSON.stringify(INDEX), { status: 200 }),
          )
        }
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          )
        })
      }) as typeof fetch,
    })
    const started = Date.now()
    const res = await get(h, '/api/icons/pokemon/25.webp')

    expect(res.status).toBe(200)
    expect(res.headers.get('x-icon-fallback')).toBe('1')
    expect(Date.now() - started).toBeLessThan(2_000)
  })
})
