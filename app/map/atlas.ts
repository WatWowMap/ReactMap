import type { PokemonEntity } from './types'

/**
 * Everything that determines what a pokemon marker looks like. Deliberately
 * NOT `spawnId`: that field is unique per encounter and would give the cache
 * one entry per marker, defeating it entirely. `pokemonId` is the species;
 * `id` does not exist on `PokemonEntity` (see types.ts) so there is nothing
 * to misread here even by typo.
 *
 * `form`, `costume` and `gender` are always present. `badge`, `background`
 * and `weather` are optional appearance modifiers; each is folded in with a
 * sentinel so an absent modifier can never collide with a present one that
 * happens to share a numeric value.
 */
export function iconKeyFor(entity: PokemonEntity): string {
  return [
    entity.pokemonId,
    entity.form,
    entity.costume,
    entity.gender,
    entity.badge ?? 'none',
    entity.background ?? 'none',
    entity.weather ?? 'none',
  ].join(':')
}

/**
 * Fixed-capacity least-recently-used cache. Plain `Map` for storage: Map
 * iterates in insertion order, and re-inserting a key on every `get`/`set`
 * keeps that order equal to recency, so the first key in iteration order is
 * always the one to evict.
 */
export class LruCache<K, V> {
  #capacity: number
  #store = new Map<K, V>()

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new RangeError('LruCache capacity must be at least 1')
    }
    this.#capacity = capacity
  }

  get size(): number {
    return this.#store.size
  }

  has(key: K): boolean {
    return this.#store.has(key)
  }

  get(key: K): V | undefined {
    const value = this.#store.get(key)
    if (value === undefined) return undefined
    // Refresh recency: delete then re-insert moves this key to the end.
    this.#store.delete(key)
    this.#store.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    this.#store.delete(key)
    this.#store.set(key, value)
    if (this.#store.size > this.#capacity) {
      const oldest = this.#store.keys().next().value
      if (oldest !== undefined) this.#store.delete(oldest)
    }
  }

  /**
   * Drops every entry. Used to re-warm the atlas after WebGL context
   * restoration (see useWebglContextRecovery.ts / MapCanvas.tsx): the
   * cached descriptors' composited pixels rode on the GPU resources the
   * lost context took with it, so keeping them around would serve stale
   * icons instead of ones drawn for the new context.
   */
  clear(): void {
    this.#store.clear()
  }
}

/** What `IconLayer`'s `getIcon` accessor needs for one marker. */
export interface IconDescriptor {
  id: string
  url: string
  width: number
  height: number
}

/**
 * Composites one marker's pixels and hands back everything `IconLayer`
 * needs to place it. Takes an already-computed key rather than an entity so
 * the drawer never has to re-derive or second-guess what determines
 * appearance; that decision lives solely in `iconKeyFor`. Uses
 * `OffscreenCanvas`, so it only runs in a browser, never in this module's
 * tests.
 */
export type IconDrawer = (entity: PokemonEntity, key: string) => IconDescriptor

const DEFAULT_CAPACITY = 512

export interface AtlasOptions {
  draw: IconDrawer
  capacity?: number
}

/**
 * The pipeline: key the entity, serve the cached descriptor on a hit, draw
 * and cache on a miss. The cache and the key are plain data-in data-out
 * functions with no canvas dependency, so they're exercised directly in
 * tests; `draw` is the only piece that needs a real browser, and it's
 * injected rather than imported, so nothing here reaches for
 * `OffscreenCanvas` itself.
 */
export function createAtlas({
  draw,
  capacity = DEFAULT_CAPACITY,
}: AtlasOptions): {
  getIconFor: (entity: PokemonEntity) => IconDescriptor
  cache: LruCache<string, IconDescriptor>
  /** Drops every cached icon. See `LruCache.clear` for why. */
  clear: () => void
} {
  const cache = new LruCache<string, IconDescriptor>(capacity)

  function getIconFor(entity: PokemonEntity): IconDescriptor {
    const key = iconKeyFor(entity)
    const cached = cache.get(key)
    if (cached) return cached
    const drawn = draw(entity, key)
    cache.set(key, drawn)
    return drawn
  }

  return { getIconFor, cache, clear: () => cache.clear() }
}
