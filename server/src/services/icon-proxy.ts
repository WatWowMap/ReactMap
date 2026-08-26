/**
 * Serves the uicons sprite set from this origin instead of the client
 * fetching it straight from `raw.githubusercontent.com`.
 *
 * Three things this buys, in the order they matter:
 *
 * 1. A proxied, firewalled or air-gapped deploy can render a map. The
 *    index and every sprite used to be a third-party dependency at first
 *    paint; now the only host the browser talks to is ours.
 * 2. The source art is roughly 120x128 and deck.gl packs it into a 64px
 *    atlas cell, so the client used to download about twice the pixels it
 *    displays. Resizing here with `fit: "inside"` cuts that, and -- unlike
 *    the GPU stretching art into a square box -- it keeps the aspect ratio.
 * 3. Sprites are fetched lazily and cached on disk, so a cold start costs
 *    one upstream round trip per distinct icon rather than a bulk download
 *    of an 11,799-file repository almost none of which is ever asked for.
 *
 * There is deliberately no compositing here. `Bun.Image` has none -- the
 * methods are resize/rotate/flip/flop/modulate plus encoders, and
 * `bytes({format:'raw'})` hands back encoded bytes rather than raw RGBA, so
 * blending cannot be hand-rolled either. Ring segments stay client-side in
 * `app/map/draw-icon.ts` where an `OffscreenCanvas` can actually draw them.
 */

import fs from 'fs/promises'
import path from 'path'

/** The encoders this proxy will hand back, keyed by the `format` param. */
const CONTENT_TYPES = {
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
} as const

export type IconFormat = keyof typeof CONTENT_TYPES

/** The path every request this module answers starts with. */
export const ICON_ROUTE_PREFIX = '/api/icons/'

/**
 * The sizes a caller may ask for. A small closed set rather than an
 * arbitrary integer: an open `?size=` is an invitation to make this
 * process re-encode a 20000px image once per request, and the client only
 * ever wants the atlas cell size anyway.
 */
export const ALLOWED_ICON_SIZES = [32, 64, 128] as const

/**
 * One path segment of a sprite request. No leading dot (so `..` and `.`
 * are out), no slash, no colon, no percent -- which together rule out
 * traversal, an absolute URL, a host, and an encoded separator before the
 * value is ever compared against the index.
 */
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export interface IconProxyConfig {
  /** Upstream uicons repository root, no trailing slash. */
  baseUrl: string
  /** Directory the resized sprites are cached in. */
  cacheDir: string
  /** How long a single upstream request may take before it is abandoned. */
  timeoutMs: number
  /** How long the in-memory copy of the index is trusted for. */
  indexTtlMs: number
  sizes?: readonly number[]
  defaultSize?: number
  defaultFormat?: IconFormat
  /** Injectable so tests never touch the network. */
  fetch?: typeof globalThis.fetch
}

export interface IconProxy {
  /** Answers a request whose path starts with {@link ICON_ROUTE_PREFIX}. */
  handle(request: Request): Promise<Response>
  /** Where a given sprite lands on disk. Exposed for tests. */
  cachePathFor(key: string, size: number, format: IconFormat): string
}

/**
 * A 64px grey disc, used whenever a listed sprite cannot actually be
 * fetched or decoded. Visible on purpose: a marker with no art still has
 * to be something a person can see and click, and an invisible hole in the
 * map reads as a broken map rather than as one missing icon.
 *
 * Embedded rather than read from disk so it cannot itself become a
 * failure mode, and encoded through the same resize pipeline as a real
 * sprite so it arrives in whatever size and format was asked for.
 */
export const FALLBACK_ICON_PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA2klEQVR42u3bwRGCMBBAUfr1ZgU263iwCO1ACSRhs/syw93/5ALsbpvjTDu3++Oz5yoXnAqkV/RyGKPDw0LMDg8F0fpjn6/3ris8Qu/gXiBh4nuFH4G4NH5UeCtE6vhLECKFt0Ckj5+CED3+H0KJ+CEIq8V3RygNsGp8N4SV438hlPj3T98FGeJP3QWlATLFH0IAAKAwQMb4JgQAAAAAAAAAAICyAJ4FAAAA4J0gAK/FfRjxaczHUQAGJIzIGJIyJmdQ0qisYWnj8hYmrMxYmrI2Z3HS6qyT+3wBn/SBHW3WpZwAAAAASUVORK5CYII=',
    'base64',
  ),
)

/**
 * Every file the index lists, flattened to the `category/file` (or
 * `category/sub/file`) keys a request can name. This set is the allowlist:
 * nothing outside it is ever fetched, so a caller cannot steer this
 * process at a host or a path of their choosing.
 */
function collectFiles(node: unknown, prefix: string, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const file of node) {
      if (typeof file === 'string') out.add(`${prefix}/${file}`)
    }
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (!SEGMENT.test(key)) continue
      collectFiles(value, prefix ? `${prefix}/${key}` : key, out)
    }
  }
}

/**
 * A cheap magic-number check on cached bytes. A truncated or overwritten
 * cache entry must not be served for the rest of the deploy's life, and
 * re-decoding every hit to find out would throw away the point of caching.
 */
function looksLike(format: IconFormat, bytes: Uint8Array): boolean {
  if (bytes.byteLength < 16) return false
  if (format === 'png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    )
  }
  if (format === 'webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  )
}

function encode(
  source: Uint8Array,
  size: number,
  format: IconFormat,
): Promise<Uint8Array> {
  // `fit: "inside"` is the half of the squashing problem the server can
  // fix: the sprite lands inside a `size` box with its proportions intact,
  // rather than being stretched into a square atlas cell by the GPU.
  // `withoutEnlargement` stops art smaller than the box being blown up
  // into bytes that carry no extra detail.
  const resized = new Bun.Image(source).resize(size, size, {
    fit: 'inside',
    withoutEnlargement: true,
  })
  if (format === 'avif') return resized.avif().bytes()
  if (format === 'png') return resized.png().bytes()
  return resized.webp().bytes()
}

interface IndexState {
  /** The upstream document, verbatim, so the client parses what uicons wrote. */
  body: string
  files: Set<string>
  loadedAt: number
}

export function createIconProxy(config: IconProxyConfig): IconProxy {
  const {
    baseUrl,
    cacheDir,
    timeoutMs,
    indexTtlMs,
    sizes = ALLOWED_ICON_SIZES,
    defaultSize = 64,
    defaultFormat = 'webp',
    fetch: fetchImpl = globalThis.fetch,
  } = config

  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const indexCachePath = path.join(cacheDir, 'index.json')

  let index: IndexState | null = null
  let indexInFlight: Promise<IndexState | null> | null = null
  const spritesInFlight = new Map<string, Promise<Response>>()
  const fallbacks = new Map<string, Uint8Array>()

  const parseIndex = (body: string): IndexState => {
    const files = new Set<string>()
    collectFiles(JSON.parse(body), '', files)
    return { body, files, loadedAt: Date.now() }
  }

  const fetchIndex = async (): Promise<IndexState | null> => {
    try {
      const response = await fetchImpl(`${base}/index.json`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`upstream ${response.status}`)
      const state = parseIndex(await response.text())
      await fs.mkdir(cacheDir, { recursive: true })
      await fs.writeFile(indexCachePath, state.body)
      return state
    } catch {
      // A stale index still names real files, and a map drawn from one is
      // far better than a map with no art at all. Only a cold cache with
      // an unreachable upstream leaves the client with nothing -- and it
      // already falls back to placeholders for exactly that case.
      try {
        return parseIndex(await fs.readFile(indexCachePath, 'utf8'))
      } catch {
        return null
      }
    }
  }

  const loadIndex = (): Promise<IndexState | null> => {
    if (index && Date.now() - index.loadedAt < indexTtlMs) {
      return Promise.resolve(index)
    }
    if (indexInFlight) return indexInFlight
    indexInFlight = fetchIndex()
      .then((state) => {
        if (state) index = state
        return state ?? index
      })
      .finally(() => {
        indexInFlight = null
      })
    return indexInFlight
  }

  const cachePathFor = (key: string, size: number, format: IconFormat) =>
    path.join(cacheDir, format, String(size), key)

  const fallbackResponse = async (size: number, format: IconFormat) => {
    const cacheKey = `${size}.${format}`
    let bytes = fallbacks.get(cacheKey)
    if (!bytes) {
      bytes = await encode(FALLBACK_ICON_PNG, size, format)
      fallbacks.set(cacheKey, bytes)
    }
    return new Response(bytes, {
      headers: {
        'content-type': CONTENT_TYPES[format],
        // Never cached: the sprite behind it may well be there on the next
        // request, and baking one bad minute into a week of browser cache
        // is how a transient upstream blip becomes a permanent hole.
        'cache-control': 'no-store',
        'x-icon-fallback': '1',
      },
    })
  }

  const buildSprite = async (
    key: string,
    size: number,
    format: IconFormat,
  ): Promise<Response> => {
    const cachePath = cachePathFor(key, size, format)
    let source: Uint8Array
    try {
      const response = await fetchImpl(`${base}/${key}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`upstream ${response.status}`)
      source = new Uint8Array(await response.arrayBuffer())
    } catch {
      return fallbackResponse(size, format)
    }

    let bytes: Uint8Array
    try {
      bytes = await encode(source, size, format)
    } catch {
      return fallbackResponse(size, format)
    }

    // Written through a temporary name so a crashed or concurrent write
    // can never leave a half-file where a sprite belongs.
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true })
      const scratch = `${cachePath}.${crypto.randomUUID()}.tmp`
      await fs.writeFile(scratch, bytes)
      await fs.rename(scratch, cachePath)
    } catch {
      // A cache that cannot be written is a slow proxy, not a broken one.
    }

    return new Response(bytes, {
      headers: {
        'content-type': CONTENT_TYPES[format],
        'cache-control': 'public, max-age=604800, immutable',
      },
    })
  }

  const serveSprite = async (
    key: string,
    size: number,
    format: IconFormat,
  ): Promise<Response> => {
    const cachePath = cachePathFor(key, size, format)
    try {
      const cached = await fs.readFile(cachePath)
      const bytes = Uint8Array.from(cached)
      if (looksLike(format, bytes)) {
        return new Response(bytes, {
          headers: {
            'content-type': CONTENT_TYPES[format],
            'cache-control': 'public, max-age=604800, immutable',
          },
        })
      }
      await fs.rm(cachePath, { force: true })
    } catch {
      // Not cached yet, which is the ordinary first-request path.
    }

    // One upstream round trip per sprite even when a viewport asks for the
    // same species a hundred times in the same tick.
    const inFlightKey = cachePath
    const existing = spritesInFlight.get(inFlightKey)
    if (existing) return existing.then((response) => response.clone())

    const pending = buildSprite(key, size, format).finally(() => {
      spritesInFlight.delete(inFlightKey)
    })
    spritesInFlight.set(inFlightKey, pending)
    return pending.then((response) => response.clone())
  }

  const handle = async (request: Request): Promise<Response> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const url = new URL(request.url)
    const rest = url.pathname.slice(ICON_ROUTE_PREFIX.length)

    if (rest === 'index.json') {
      const state = await loadIndex()
      if (!state) {
        return new Response('Icon index unavailable', { status: 503 })
      }
      return new Response(state.body, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      })
    }

    // Everything below runs before the index is even consulted, so a
    // malformed path costs nothing and reaches nothing.
    const segments = rest.split('/')
    if (
      segments.length < 2 ||
      segments.length > 3 ||
      segments.some((segment) => !SEGMENT.test(segment))
    ) {
      return new Response('Not Found', { status: 404 })
    }

    const rawSize = url.searchParams.get('size')
    const size = rawSize === null ? defaultSize : Number(rawSize)
    if (!sizes.includes(size)) {
      return new Response('Unsupported size', { status: 400 })
    }

    const rawFormat = url.searchParams.get('format') ?? defaultFormat
    if (!Object.hasOwn(CONTENT_TYPES, rawFormat)) {
      return new Response('Unsupported format', { status: 400 })
    }
    const format = rawFormat as IconFormat

    const state = await loadIndex()
    if (!state) {
      return new Response('Icon index unavailable', { status: 503 })
    }

    // The allowlist check. The upstream URL is built by joining the
    // configured base with this index-verified key, never with anything
    // the caller wrote.
    const key = segments.join('/')
    if (!state.files.has(key)) {
      return new Response('Not Found', { status: 404 })
    }

    return serveSprite(key, size, format)
  }

  return { handle, cachePathFor }
}
