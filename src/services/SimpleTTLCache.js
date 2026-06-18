// @ts-check

import { setLongTimeout } from '@utils/setLongTimeout'

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
      this._cache.get(key)()
    }
    this._cache.set(
      key,
      setLongTimeout(() => this._cache.delete(key), expire),
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
