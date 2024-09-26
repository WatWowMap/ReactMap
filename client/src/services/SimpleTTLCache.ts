export class SimpleTTLCache {
  private _ttl: number
  private _cache: Map<string, NodeJS.Timeout>

  constructor(ttl: number) {
    this._ttl = ttl
    this._cache = new Map()
  }

  set(key: string, expire: number = this._ttl) {
    if (this._cache.has(key)) {
      clearTimeout(this._cache.get(key))
    }
    this._cache.set(
      key,
      setTimeout(() => this._cache.delete(key), expire),
    )
  }

  has(key: string) {
    return !!this._cache.has(key)
  }

  get size() {
    return this._cache.size
  }
}
