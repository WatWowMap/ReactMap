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
    expect(after.headers.get('x-icon-fallback')).toBeNull()
    // Rebuilt on disk, so the corrupt bytes are gone rather than waiting
    // there for the next request. The rebuild costs no second round trip
    // while the source image is still memoised in this process.
    expect(Uint8Array.from(fs.readFileSync(cached))).toEqual(good)
    expect(h.calls.filter((c) => !c.endsWith('/index.json'))).toHaveLength(1)
  })

  it('refetches a corrupt cached file once the source is no longer memoised', async () => {
    const h = makeHarness({ sourceCacheLimit: 1 })
    const good = await bytesOf(await get(h, '/api/icons/pokemon/25.webp'))

    const cached = h.proxy.cachePathFor('pokemon/25.webp', 64, 'webp')
    fs.writeFileSync(cached, 'not an image at all')
    // Another file evicts the memoised source, so this really does go
    // back upstream rather than serving the corrupt bytes.
    await get(h, '/api/icons/pokemon/0.webp')
    const before = h.calls.length

    const after = await get(h, '/api/icons/pokemon/25.webp')

    expect(await bytesOf(after)).toEqual(good)
    expect(h.calls.length).toBe(before + 1)
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

describe('icon proxy upstream load', () => {
  it('fetches one source image once for every size and format', async () => {
    const h = makeHarness()
    const variants: string[] = []
    for (const size of [32, 64, 128]) {
      for (const format of ['webp', 'png', 'avif']) {
        variants.push(
          `/api/icons/pokemon/25.webp?size=${size}&format=${format}`,
        )
      }
    }

    const responses = await Promise.all(variants.map((url) => get(h, url)))

    expect(responses.every((res) => res.status === 200)).toBe(true)
    expect(
      responses.every((res) => res.headers.get('x-icon-fallback') === null),
    ).toBe(true)
    const sprites = h.calls.filter((url) => !url.endsWith('/index.json'))
    expect(sprites).toEqual([`${BASE_URL}/pokemon/25.webp`])
  })

  it('never has more than the configured number of fetches in flight', async () => {
    let live = 0
    let peak = 0
    const sprite = await upstreamSprite()
    const h = makeHarness({
      maxConcurrentFetches: 2,
      fetch: (async (input: string | URL | Request) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.endsWith('/index.json')) {
          return new Response(JSON.stringify(INDEX), { status: 200 })
        }
        live += 1
        peak = Math.max(peak, live)
        await Bun.sleep(20)
        live -= 1
        return new Response(sprite, { status: 200 })
      }) as typeof fetch,
    })

    // Three distinct files, so nothing here is deduped by the source cache
    // and every request is its own upstream round trip.
    const files = ['pokemon/25.webp', 'pokemon/0.webp', 'raid/egg/1.webp']
    const urls = [32, 64, 128].flatMap((size) =>
      files.map((file) => `/api/icons/${file}?size=${size}`),
    )
    const responses = await Promise.all(urls.map((url) => get(h, url)))

    expect(responses.every((res) => res.status === 200)).toBe(true)
    // Three distinct files would otherwise be in flight together, so this
    // is the gate and not the source dedupe doing the work.
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('serves the fallback rather than queueing without limit', async () => {
    const h = makeHarness({
      maxConcurrentFetches: 1,
      maxQueuedFetches: 1,
      fetch: (async (input: string | URL | Request) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.endsWith('/index.json')) {
          return new Response(JSON.stringify(INDEX), { status: 200 })
        }
        await Bun.sleep(30)
        return new Response(await upstreamSprite(), { status: 200 })
      }) as typeof fetch,
    })

    // Warm the index first, so all four sprite requests reach the gate in
    // the same tick rather than queueing behind the index load.
    await get(h, '/api/icons/index.json')
    const responses = await Promise.all(
      [32, 64, 128, 32].map((size, i) =>
        get(
          h,
          `/api/icons/pokemon/${i === 3 ? 0 : 25}.webp?size=${size}&format=png`,
        ),
      ),
    )

    expect(responses.every((res) => res.status === 200)).toBe(true)
    const refused = responses.filter(
      (res) => res.headers.get('x-icon-fallback') === '1',
    )
    expect(refused.length).toBeGreaterThan(0)
    expect(
      refused.every((res) => res.headers.get('cache-control') === 'no-store'),
    ).toBe(true)
  })
})

describe('the sprite cache does not grow without limit', () => {
  /** Total bytes of cached sprites, ignoring the index. */
  const cacheBytes = (dir: string): number => {
    let total = 0
    const walk = (at: string) => {
      for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
        const full = path.join(at, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name !== 'index.json') total += fs.statSync(full).size
      }
    }
    walk(dir)
    return total
  }

  const cachedFiles = (dir: string): string[] => {
    const out: string[] = []
    const walk = (at: string) => {
      for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
        const full = path.join(at, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name !== 'index.json') out.push(full)
      }
    }
    walk(dir)
    return out
  }

  it('evicts the least recently used sprites once past the cap', async () => {
    // The route only serves what the index lists, so the cache cannot grow
    // unbounded -- but its ceiling is the whole icon set, and an
    // unauthenticated caller can walk all of it. The cap is the whole fix.
    const h = makeHarness({ maxCacheBytes: 4_000 })
    for (const size of [32, 64, 128]) {
      for (const name of ['25.webp', '0.webp']) {
        await get(h, `/api/icons/pokemon/${name}?size=${size}`)
      }
    }
    const before = cacheBytes(h.cacheDir)
    expect(before).toBeGreaterThan(4_000)

    const dropped = await h.proxy.sweepCache()

    expect(dropped).toBeGreaterThan(0)
    expect(cacheBytes(h.cacheDir)).toBeLessThanOrEqual(4_000)
  })

  it('leaves the cache alone when it is under the cap', async () => {
    const h = makeHarness({ maxCacheBytes: 10 * 1024 * 1024 })
    await get(h, '/api/icons/pokemon/25.webp?size=64')
    const before = cachedFiles(h.cacheDir)

    expect(await h.proxy.sweepCache()).toBe(0)
    expect(cachedFiles(h.cacheDir)).toEqual(before)
  })

  it('keeps a sprite still being served, and drops a newer one that is not', async () => {
    // The discriminator: `hot` is written FIRST and every cold sprite after
    // it, so under eviction-by-age hot dies and the newest cold file lives.
    // Under real recency it is the other way round. Asserting only that hot
    // survives passes even with recency disabled, because a stable sort
    // leaves files in walk order -- so the cold file must be asserted too.
    const h = makeHarness({ maxCacheBytes: 3_000 })
    const hot = '/api/icons/pokemon/25.webp?size=64'
    await get(h, hot)

    const coldRequests = [
      '/api/icons/pokemon/0.webp?size=32',
      '/api/icons/pokemon/25.webp?size=32',
      '/api/icons/pokemon/0.webp?size=128',
      '/api/icons/pokemon/0.webp?size=64',
    ]
    for (const cold of coldRequests) {
      await get(h, cold)
      // Keep hot in use while every one of them arrives.
      await get(h, hot)
    }

    await h.proxy.sweepCache()

    const hotPath = h.proxy.cachePathFor('pokemon/25.webp', 64, 'webp')
    const newestCold = h.proxy.cachePathFor('pokemon/0.webp', 64, 'webp')
    expect(fs.existsSync(hotPath)).toBe(true)
    expect(fs.existsSync(newestCold)).toBe(false)
  })

  it('never evicts the index, which every client needs', async () => {
    const h = makeHarness({ maxCacheBytes: 1 })
    await get(h, '/api/icons/index.json')
    const indexPath = path.join(h.cacheDir, 'index.json')
    const existed = fs.existsSync(indexPath)

    await h.proxy.sweepCache()

    expect(fs.existsSync(indexPath)).toBe(existed)
  })
})
