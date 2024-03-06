// @ts-check

export class SimpleTTLCache {
  /**
   * @param {number} ttl
   */
  constructor(ttl) {
    this._ttl = ttl
    this._cache = new Map()
  }

  /**
   * @param {string} key
   * @param {number} [expire]
   */
  set(key, expire = this._ttl) {
    if (this._cache.has(key)) {
      clearTimeout(this._cache.get(key))
    }
    this._cache.set(
      key,
      setTimeout(() => this._cache.delete(key), expire),
    )
  }

  /**
   * @param {string} key
   * @returns
   */
  has(key) {
    return !!this._cache.has(key)
  }

  get size() {
    return this._cache.size
  }
}
