// @ts-check
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { Logger } = require('@rm/logger')

const { buildScannerHeaders } = require('../utils/scannerHeaders')
const { setLongTimeout } = require('../utils/setLongTimeout')

const STATUS_PATH = '/api/status'

/** @param {unknown} value */
const isPlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** @returns {import('@rm/types').GolbatStatus} */
const legacyStatus = () => ({ features: {}, limits: {}, filters: null })

/**
 * Normalises a decoded /api/status body. A body that is not an object (an
 * HTML error page that happened to parse, a bare array) counts as legacy.
 * `filters` stays null when the block is absent so consumers can tell "this
 * build does not advertise filters" from "this build advertises none".
 * @param {unknown} body
 * @returns {import('@rm/types').GolbatStatus}
 */
function parseStatus(body) {
  if (!isPlainObject(body)) return legacyStatus()
  const { features, limits, filters } = /** @type {Record<string, any>} */ (
    body
  )
  return {
    features: isPlainObject(features) ? { ...features } : {},
    limits: isPlainObject(limits) ? { ...limits } : {},
    filters: isPlainObject(filters) ? { ...filters } : null,
  }
}

/**
 * Discovers what each configured Golbat instance supports by reading
 * GET /api/status, and keeps the answer per instance so consumers can ask
 * `supportsFilter(mem, 'showcase_focus')` instead of probing feature calls.
 *
 * Instances are keyed by their endpoint base URL — the `mem` every scanner
 * model already carries in its DbContext.
 */
class GolbatCapabilities extends Logger {
  /** Upgrades are rare and a slow reaction is fine; the recheck fast path covers downgrades. */
  static REFRESH_MS = 5 * 60_000

  /** Floor between immediate rechecks of one instance, so a burst of 4xx cannot hammer it. */
  static RECHECK_DEBOUNCE_MS = 30_000

  /**
   * @param {{ fetch?: typeof fetch, timeoutMs?: number, now?: () => number }} [options]
   */
  constructor(options = {}) {
    super('golbat')
    this.fetch = options.fetch ?? fetch
    this.timeoutMs = options.timeoutMs
    this.now = options.now ?? Date.now
    /** @type {Map<string, import('@rm/types').GolbatInstance>} */
    this.instances = new Map()
    /** @type {NodeJS.Timeout | null} */
    this.timer = null
  }

  /**
   * Replaces the registry with the given endpoints and fetches each status
   * once, resolving when every fetch has settled.
   * @param {{ endpoint: string, secret?: string, httpAuth?: { username: string, password: string } | null }[]} endpoints
   */
  async discover(endpoints) {
    const next = new Map()
    endpoints.forEach(({ endpoint, secret, httpAuth }) => {
      if (!endpoint || next.has(endpoint)) return
      next.set(endpoint, {
        mem: endpoint,
        secret: secret || '',
        httpAuth: httpAuth || null,
        status: this.instances.get(endpoint)?.status ?? null,
        lastFetchAt: 0,
        inflight: null,
      })
    })
    this.instances = next
    this.#ensureTimer()
    await this.refreshAll()
  }

  /** Refreshes every registered instance, resolving once all have settled. */
  async refreshAll() {
    await Promise.allSettled(
      [...this.instances.keys()].map((mem) => this.refresh(mem)),
    )
  }

  #ensureTimer() {
    if (this.timer) return
    this.timer = setInterval(
      () => this.refreshAll(),
      GolbatCapabilities.REFRESH_MS,
    )
    this.timer.unref?.()
  }

  /**
   * Fast path for a failed feature call: a 4xx from a filter field is the first
   * sign that a Golbat was downgraded, so re-read its status now rather than
   * on the next interval. Debounced per instance and shares any in-flight
   * refresh, so it is safe to call from a hot request path.
   * @param {string} mem
   */
  async recheck(mem) {
    const instance = this.instances.get(mem)
    if (!instance) return
    if (instance.inflight) {
      await instance.inflight
      return
    }
    if (
      this.now() - instance.lastFetchAt <
      GolbatCapabilities.RECHECK_DEBOUNCE_MS
    ) {
      return
    }
    await this.refresh(mem)
  }

  /**
   * Fetches /api/status for one instance and stores the parsed result.
   *
   * A 404 or a 2xx whose body is not JSON is an older Golbat and records a
   * legacy (no capabilities) result. Any other outcome — a non-2xx such as
   * 401/503, a network error, or the fetch timeout — is treated as transient:
   * the last good result is kept so a Golbat blip does not churn behaviour.
   * @param {string} mem
   */
  async refresh(mem) {
    const instance = this.instances.get(mem)
    if (!instance) return
    if (instance.inflight) {
      await instance.inflight
      return
    }
    instance.lastFetchAt = this.now()
    instance.inflight = this.#fetchStatus(instance).finally(() => {
      instance.inflight = null
    })
    await instance.inflight
  }

  /** @param {import('@rm/types').GolbatInstance} instance */
  async #fetchStatus(instance) {
    const { mem } = instance
    const controller = new AbortController()
    const clearFetchTimeout = setLongTimeout(
      () => controller.abort(),
      this.timeoutMs ?? config.getSafe('api.fetchTimeoutMs'),
    )
    try {
      const response = await this.fetch(`${mem}${STATUS_PATH}`, {
        method: 'GET',
        headers: buildScannerHeaders(instance.secret, instance.httpAuth),
        signal: controller.signal,
      })
      let status
      if (response.status === 404) {
        status = legacyStatus()
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      } else {
        let body
        try {
          body = await response.json()
        } catch {
          body = null
        }
        status = parseStatus(body)
      }
      this.#store(instance, status)
    } catch (e) {
      this.log.warn(
        `${mem}${STATUS_PATH} unreachable (${e instanceof Error ? e.message : e}) — ${
          instance.status
            ? 'keeping the last known capabilities'
            : 'capabilities unknown until it answers'
        }`,
      )
    } finally {
      clearFetchTimeout()
    }
  }

  /**
   * Commits a freshly parsed status, logging at info only when it differs from
   * the previous answer so the periodic refresh stays quiet.
   * @param {import('@rm/types').GolbatInstance} instance
   * @param {import('@rm/types').GolbatStatus} status
   */
  #store(instance, status) {
    const changed = JSON.stringify(instance.status) !== JSON.stringify(status)
    instance.status = status
    if (!changed) return
    const filters = status.filters
      ? `filters: ${Object.keys(status.filters).join(', ') || 'none'}`
      : 'no filters block (older Golbat)'
    const features = Object.keys(status.features).length
      ? `features: ${Object.entries(status.features)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      : 'no features block'
    const limits = Object.keys(status.limits).length
      ? `limits: ${Object.entries(status.limits)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      : 'no limits block'
    this.log.info(`${instance.mem} — ${filters}; ${features}; ${limits}`)
  }

  /**
   * @param {string} mem
   * @returns {import('@rm/types').GolbatStatus | null}
   */
  get(mem) {
    return this.instances.get(mem)?.status ?? null
  }

  /** @param {string} mem */
  advertisesFilters(mem) {
    return !!this.get(mem)?.filters
  }

  /**
   * @param {string} mem
   * @param {string} key
   */
  supportsFilter(mem, key) {
    return this.get(mem)?.filters?.[key] === true
  }

  /** Cancels the periodic refresh. Discovery restarts it. */
  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}

/** Process-wide registry; DbManager.getDbContext populates it at startup and on reload. */
const golbatCapabilities = new GolbatCapabilities()

module.exports = { GolbatCapabilities, golbatCapabilities }
