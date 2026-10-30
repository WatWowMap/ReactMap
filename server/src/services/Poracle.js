// @ts-check

const { default: fetch } = require('node-fetch')

const { log, TAGS } = require('@rm/logger')
const { fetchJson } = require('../utils/fetchJson')
const { setCache, getCache } = require('./cache')
const { createPoracleHttp, PoracleRequestError } = require('./poracle/http')
const { createTrackingV1 } = require('./poracle/trackingV1')
const { createTrackingV2 } = require('./poracle/trackingV2')
const { UnsupportedOnV1 } = require('./poracle/v1Adapter')

/** Categories served by the tracking clients. */
const TRACKING_CATEGORIES = new Set([
  'pokemon',
  'raid',
  'egg',
  'quest',
  'invasion',
  'incident',
  'lure',
  'nest',
  'gym',
])

/** @param {unknown} value */
const pad2 = (value) => String(value ?? 0).padStart(2, '0')

/**
 * Converts ReactMap's active hours (string hours/mins plus a client-side id)
 * into v2's strict integer schedule entries.
 * @param {Array<Record<string, any>> | undefined} entries
 */
function toV2ActiveHours(entries) {
  return (entries || []).map(
    ({ day, hours, mins, step, end_hours: endHours, end_mins: endMins }) => {
      /** @type {Record<string, number>} */
      const entry = { day: +day, hours: +hours, mins: +mins }
      if (+step > 0) {
        entry.step = +step
        entry.end_hours = +endHours
        entry.end_mins = +endMins
      }
      return entry
    },
  )
}

/**
 * Converts v2 schedule entries into ReactMap's shape, with zero-padded string
 * hours and minutes as v1 stores them.
 * @param {Array<Record<string, any>> | null | undefined} entries
 */
function fromV2ActiveHours(entries) {
  return (entries || []).map((entry) => ({
    ...entry,
    hours: pad2(entry.hours),
    mins: pad2(entry.mins),
  }))
}

const PLATFORMS = /** @type {const} */ (['discord', 'telegram'])

/**
 * @typedef {import("@rm/types").PoracleAPIRef} APIReference
 * @typedef {import("@rm/types").PoracleAPIInput} APIInput
 * @typedef {import("@rm/types").PoracleCategory} Category
 * @typedef {import("@rm/types").PoracleAction} Action
 * @typedef {import("@rm/types").HttpMethod} Method
 */

const APIS = /** @type {APIReference} */ ({
  config: '/api/config/poracleWeb',
  geofence: '/api/geofence/all/geojson',
  templates: '/api/config/templates?names=true',
  humans: (userId) => `/api/humans/${userId}`,
  oneHuman: (userId) => `/api/humans/one/${userId}`,
  location: (userId, location) =>
    `/api/humans/${userId}/setLocation/${location.join('/')}`,
  areas: (userId) => `/api/humans/${userId}/setAreas`,
  areaSecurity: (userId) => `/api/geofence/${userId}`,
  start: (userId) => `/api/humans/${userId}/start`,
  stop: (userId) => `/api/humans/${userId}/stop`,
  switchProfile: (userId, profile) =>
    `/api/humans/${userId}/switchProfile/${profile}`,
  tracking: (userId, category, suffix) =>
    `/api/tracking/${category}/${userId}${suffix ? `/${suffix}` : ''}`,
  profiles: (userId) => `/api/profiles/${userId}`,
  profileAction: (userId, action, suffix) =>
    `/api/profiles/${userId}${action ? `/${action}` : ''}${
      suffix ? `/${suffix}` : ''
    }`,
})

/** PoracleNG v2 routes, used when the server supports them. */
const V2 = {
  human: (userId) => `/api/v2/humans/${userId}`,
  action: (userId, action) => `/api/v2/humans/${userId}/${action}`,
  profiles: (userId, suffix) =>
    `/api/v2/humans/${userId}/profiles${suffix ? `/${suffix}` : ''}`,
}

/**
 * OpenAPI paths (relative to the spec's `/api` server) that the v2 code path
 * relies on. `auto` only switches to v2 when all of them are served.
 */
const V2_REQUIRED_PATHS = [
  '/v2/humans/{id}',
  '/v2/humans/{id}/areas',
  '/v2/humans/{id}/enable',
  '/v2/humans/{id}/disable',
  '/v2/humans/{id}/location',
  '/v2/humans/{id}/profile',
  '/v2/humans/{id}/profiles',
  '/v2/humans/{id}/profiles/{profile_no}',
  '/v2/humans/{id}/profiles/{profile_no}/copy',
  ...[...TRACKING_CATEGORIES].flatMap((type) => [
    `/v2/humans/{id}/tracking/${type}`,
    `/v2/humans/{id}/tracking/${type}/{uid}`,
  ]),
]

/**
 * Geocoding backends ReactMap can drive. Poracle also offers `google` and
 * `none`, which have no equivalent here, so they are ignored rather than
 * mapped onto something they are not.
 */
const REMOTE_GEOCODERS = new Set(['nominatim', 'photon'])

/**
 * Resolves which geocoding backend a webhook should use.
 *
 * Poracle reports the backend behind its `providerURL` as `provider`, so a
 * deployment that gets its geocoder URL from Poracle no longer has to restate
 * the backend type in ReactMap's own config. Local config still wins, matching
 * how `providerURL` and `addressFormat` already behave.
 *
 * The backend type is only inherited when the URL was inherited with it. A URL
 * and the protocol used to talk to it are one setting in two fields, and
 * splitting them across two sources is how a working Nominatim deployment ends
 * up being addressed as Photon: keep a local `nominatimUrl`, omit
 * `geocoderProvider`, and let a Photon-backed Poracle supply the type.
 * @param {object} args
 * @param {string} [args.remote] The `provider` field from Poracle's remote config
 * @param {string} [args.local] geocoderProvider from this webhook's own config
 * @param {boolean} args.usingRemoteURL Whether nominatimUrl also came from Poracle
 * @returns {'nominatim' | 'photon' | undefined}
 */
function resolveGeocoderProvider({ remote, local, usingRemoteURL }) {
  if (local) return /** @type {'nominatim' | 'photon'} */ (local)
  if (!usingRemoteURL) return undefined
  return REMOTE_GEOCODERS.has(remote)
    ? /** @type {'nominatim' | 'photon'} */ (remote)
    : undefined
}

class PoracleAPI {
  /** @type {ReturnType<typeof createTrackingV2>} */
  #tracking

  /** @param {import("@rm/types").Config['webhooks'][number]} webhook */
  constructor(webhook) {
    if (!webhook.name)
      throw new Error('PoracleAPI: name is required', { cause: webhook })
    log.info(TAGS.webhooks, `Initializing PoracleAPI for ${webhook.name}`)

    this.name = webhook.name
    this.provider = webhook.provider
    this.endpoint = `${webhook.host}:${webhook.port}`
    this.secret = webhook.poracleSecret
    this.areasToSkip = webhook.areasToSkip?.map((x) => x.toLowerCase()) || []
    this.addressFormat = webhook.addressFormat
    this.nominatimUrl = webhook.nominatimUrl
    this.geocoderProvider = webhook.geocoderProvider
    this.enabled = webhook.enabled || false
    this.apiVersion = webhook.apiVersion || 'auto'
    /** Whether requests go to the PoracleNG v2 API, resolved during init */
    this.v2 = this.apiVersion === 'v2'
    this.#buildTracking()

    this.discordRoles = webhook.discordRoles || []
    this.telegramGroups = webhook.telegramGroups || []
    this.local = webhook.local || false
    this.admins = { discord: [], telegram: [] }

    this.defaultDistance = 0
    this.maxDistance = 100_000
    this.defaultTemplateName = 0
    this.disabledHooks = []
    this.everythingFlagPermissions = 'none'
    this.version = null
    this.lastFetched = 0
    this.prefix = '!'
    this.locale = 'en'
    this.gymBattles = false
    /** @type {import("@rm/types").RMGeoJSON} */
    this.geojson = { features: [], type: 'FeatureCollection' }
    this.templates = { discord: {}, telegram: {} }

    this.pvp = 'rdm'
    this.defaultPvpCap = 0
    this.pvpFilterMaxRank = 4096
    this.pvpCaps = []
    this.leagues = []

    this.ui = this.generateUi()
  }

  /**
   *
   * @param {'discord' | 'telegram'} platform
   * @returns
   */
  getClientContext(platform) {
    return {
      name: this.name,
      templates: this.templates[platform],
      hasNominatim: !!this.nominatimUrl,
      locale: this.locale,
      everything: this.everythingFlagPermissions,
      prefix: this.prefix,
      leagues: this.leagues,
      pvp: this.pvp,
      ui: this.ui,
      capabilities: { edit: this.v2, summary: this.v2 },
    }
  }

  /**
   *
   * @param {string[] | string | null} blockedAlerts
   * @returns
   */
  getAllowedCategories(blockedAlerts = []) {
    const categories = Object.keys(this.ui).filter(
      (key) =>
        !(this.disabledHooks.includes(key) || blockedAlerts?.includes(key)),
    )
    return categories
  }

  /**
   *
   * @param {import("@rm/types").User} user
   * @returns
   */
  static getWebhookId(user) {
    if (!user) {
      return ''
    }
    const { strategy, webhookStrategy, discordId, telegramId } = user
    switch (strategy) {
      case 'discord':
        return discordId
      case 'telegram':
        return telegramId
      default:
        return webhookStrategy === 'discord' ? discordId : telegramId
    }
  }

  /**
   *
   * @param {string | number} userId
   * @returns
   */
  async getUserAreas(userId) {
    /** @type {{ areas: import("@rm/types").PoracleHumanArea[] }} */
    const { areas } = await this.#sendRequest(
      this.v2 ? V2.action(userId, 'areas') : APIS.humans(userId),
    )
    const areaGroups = areas.reduce((groupMap, area) => {
      if (area.userSelectable) {
        if (!groupMap[area.group]) groupMap[area.group] = []
        groupMap[area.group].push(area.name)
      }
      return groupMap
    }, /** @type {Record<string, string[]>} */ ({}))

    return Object.entries(areaGroups)
      .map(([group, children]) => ({
        group,
        children,
      }))
      .sort((a, b) => a.group.localeCompare(b.group))
  }

  /**
   *
   * @param {string | number} userId
   * @returns
   */
  async getClientGeojson(userId) {
    const allowedAreas = await this.getUserAreas(userId)
    const areaSet = new Set(
      allowedAreas.flatMap((x) =>
        x.children.map((child) => child.toLowerCase()),
      ),
    )
    const features = this.geojson.features.filter((feature) =>
      areaSet.has(feature.properties.name.toLowerCase()),
    )

    return {
      type: 'FeatureCollection',
      features,
    }
  }

  /** Picks the tracking client matching the resolved API version. */
  #buildTracking() {
    const http = createPoracleHttp({
      endpoint: this.endpoint,
      secret: this.secret,
    })
    this.#tracking = this.v2 ? createTrackingV2(http) : createTrackingV1(http)
  }

  initFromCache() {
    const cached = getCache(`${this.name}-webhook.json`)
    if (!cached) {
      log.warn(TAGS.webhooks, `${this.name} webhook not found in cache`)
      return false
    }
    // The configured apiVersion wins over a cached one; a cached `auto`
    // result is only reused while the config still says `auto`.
    const { apiVersion } = this
    Object.assign(this, cached)
    this.apiVersion = apiVersion
    if (apiVersion !== 'auto') this.v2 = apiVersion === 'v2'
    this.#buildTracking()
  }

  async init() {
    try {
      await Promise.all([
        this.#fetchConfig(),
        this.#fetchGeojson(),
        this.#fetchTemplates(),
        this.#detectApiVersion(),
      ])
      this.#buildTracking()
      this.ui = this.generateUi()
      this.lastFetched = Date.now()
      log.info(TAGS.webhooks, `${this.name} webhook initialized`)
      await setCache(`${this.name}-webhook.json`, this)
    } catch (e) {
      log.error(TAGS.webhooks, `Error initializing ${this.name} webhook`, e)
    }
  }

  async #fetchConfig() {
    const remoteConfig = await this.#sendRequest(APIS.config)
    if (!remoteConfig) {
      throw new Error(`Webhook [${this.name}] is not configured correctly`)
    }
    if (!remoteConfig.version) {
      throw new Error(
        `No version found, webhook [${this.name}] is not configured correctly`,
      )
    }
    this.version = remoteConfig.version
    const [major, minor, patch] = this.version.split('.').map((x) => +x)

    if (
      major < 4 ||
      (major === 4 && minor < 8) ||
      (major === 4 && minor === 8 && patch < 4)
    ) {
      throw new Error(
        `Poracle must be at least version 4.8.4, current version is ${this.version}`,
      )
    }
    // `provider` is pulled out of remoteConfig even when it is not usable.
    // this.provider is the *webhook* provider ('poracle'); letting Poracle's
    // geocoding provider through the spread below would silently overwrite it
    // with an unrelated meaning.
    const { providerURL, provider, addressFormat, ...rest } = remoteConfig
    Object.assign(this, rest)
    if (addressFormat && !this.addressFormat) {
      this.addressFormat = addressFormat
    }
    // Evaluated before the assignment below, because it is the assignment that
    // decides whether the backend type may be inherited too.
    const usingRemoteURL = !!providerURL && !this.nominatimUrl
    if (usingRemoteURL) {
      this.nominatimUrl = providerURL
    }
    this.geocoderProvider = resolveGeocoderProvider({
      remote: provider,
      local: this.geocoderProvider,
      usingRemoteURL,
    })
    this.leagues = [
      { name: 'great', cp: 1500, min: remoteConfig.pvpFilterGreatMinCP },
      { name: 'ultra', cp: 2500, min: remoteConfig.pvpFilterUltraMinCP },
    ]
    if (remoteConfig?.pvpLittleLeagueAllowed) {
      this.leagues.push({
        name: 'little',
        cp: 500,
        min: remoteConfig.pvpFilterLittleMinCP,
      })
      this.pvp = 'ohbem'
    }
  }

  /**
   * Resolves `apiVersion: 'auto'` by checking the server's public OpenAPI spec
   * for the v2 routes this service uses. PoracleJS has no spec, so it stays on
   * v1; the probe is quiet because that miss is expected.
   */
  async #detectApiVersion() {
    if (this.apiVersion !== 'auto') {
      this.v2 = this.apiVersion === 'v2'
      return
    }
    try {
      const response = await fetch(`${this.endpoint}/openapi.json`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      const spec = response.ok ? await response.json() : null
      const paths = spec?.paths || {}
      this.v2 = V2_REQUIRED_PATHS.every((path) => path in paths)
    } catch (e) {
      log.debug(TAGS.webhooks, `[${this.name}] v2 API probe failed`, e)
      this.v2 = false
    }
    log.info(
      TAGS.webhooks,
      `[${this.name}] using Poracle API ${this.v2 ? 'v2' : 'v1'}`,
    )
  }

  async #fetchGeojson() {
    /** @type {{ geoJSON: import("@rm/types").RMGeoJSON }} */
    const { geoJSON } = await this.#sendRequest(APIS.geofence)
    if (geoJSON?.features) {
      this.geojson.features = geoJSON.features.filter(
        (x) => !this.areasToSkip.includes(x.properties.name.toLowerCase()),
      )
    } else {
      log.warn(TAGS.webhooks, 'No geofences found')
    }
  }

  async #fetchTemplates() {
    const templates = await this.#sendRequest(APIS.templates)
    if (templates) {
      PLATFORMS.forEach((platform) => {
        this.templates[platform] = Object.fromEntries(
          Object.entries(templates[platform]).map(([key, value]) => [
            key.toLowerCase().replace(/monster/g, 'pokemon'),
            value,
          ]),
        )
      })
    }
  }

  /**
   *
   * @param {string} path
   * @param {Method} method
   * @param {any} body
   * @returns
   */
  async #sendRequest(path, method = 'GET', body = {}) {
    const response = await fetchJson(`${this.endpoint}${path}`, {
      method: method || 'GET',
      headers: {
        'X-Poracle-Secret': this.secret,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: method === 'GET' || !method ? undefined : JSON.stringify(body),
    })
    return response
  }

  /**
   * Like #sendRequest, but only sends a body when one is given: v2 is strict
   * about bodies (bulk DELETE takes `?uid=` or a body, not both).
   * @param {string} path
   * @param {Method} [method]
   * @param {any} [body]
   */
  async #sendV2(path, method = 'GET', body = undefined) {
    return fetchJson(`${this.endpoint}${path}`, {
      method,
      headers: {
        'X-Poracle-Secret': this.secret,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  /**
   * v1 returns the list columns as JSON-encoded strings, v2 as arrays.
   * @param {string | string[] | null | undefined} value
   * @returns {string[]}
   */
  static #parseList(value) {
    if (!value) return []
    return typeof value === 'string' ? JSON.parse(value) : value
  }

  /**
   *
   * @param {string | number} userId
   * @returns
   */
  async #oneHuman(userId) {
    const { human } = this.v2
      ? await this.#sendV2(V2.human(userId))
      : await this.#sendRequest(APIS.oneHuman(userId))
    return {
      human: {
        ...human,
        enabled: !!human.enabled,
        admin_disable: !!human.admin_disable,
        area: PoracleAPI.#parseList(human.area),
        area_restrictions: PoracleAPI.#parseList(
          this.v2 ? human.area_restriction : human.area_restrictions,
        ),
        blocked_alerts: PoracleAPI.#parseList(human.blocked_alerts),
        community_membership: PoracleAPI.#parseList(human.community_membership),
      },
    }
  }

  /**
   *
   * @param {string | number} userId
   * @param {APIInput} category
   * @param {Method} method
   * @returns
   */
  async #setActive(userId, category, method) {
    await this.#sendRequest(
      category === 'start' ? APIS.start(userId) : APIS.stop(userId),
      method,
    )
    return this.#oneHuman(userId)
  }

  /**
   *
   * @param {string | number} userId
   * @param {`profiles-${Action}` | 'profiles'} category
   * @param {Method} method
   * @param {any} data
   * @returns
   */
  async #profileManagement(userId, category, method, data) {
    const [, action] = PoracleAPI.#split(category)

    const first = await this.#sendRequest(
      action
        ? APIS.profileAction(
            userId,
            action,
            `${action === 'copy' ? `${data.from}/${data.to}` : ''}${
              method === 'DELETE' ? `${data}` : ''
            }`,
          )
        : APIS.profiles(userId),
      method,
      method === 'POST' && action !== 'copy'
        ? {
            ...data,
            active_hours:
              data?.active_hours?.map(
                ({
                  day,
                  mins,
                  hours,
                  step,
                  end_hours: endHours,
                  end_mins: endMins,
                }) => ({
                  day,
                  mins: mins.padStart(2, '0'),
                  hours: hours.padStart(2, '0'),
                  // PoracleNG range entries repeat every `step` hours until
                  // the end time; keep them so a save does not flatten them.
                  ...(+step > 0
                    ? { step: +step, end_hours: +endHours, end_mins: +endMins }
                    : {}),
                }),
              ) || [],
          }
        : undefined,
    )
    if (method === 'GET') {
      return { profile: PoracleAPI.#processProfiles(first.profile) }
    }
    const second = await this.#sendRequest(APIS.profiles(userId))
    return { profile: PoracleAPI.#processProfiles(second.profile) }
  }

  /**
   *
   * @param {import("@rm/types").PoracleProfile<false>[]} profiles
   * @returns {import("@rm/types").PoracleProfile[]}
   */
  static #processProfiles(profiles) {
    return profiles.map((profile) => ({
      ...profile,
      area: PoracleAPI.#parseList(profile.area),
      active_hours:
        profile.active_hours && profile.active_hours !== '{}'
          ? /** @type {import("@rm/types").PoracleActiveHours[]} */ (
              typeof profile.active_hours === 'string'
                ? JSON.parse(profile.active_hours)
                : profile.active_hours
            )
              .sort((a, b) =>
                a.day === b.day
                  ? a.hours === b.hours
                    ? a.mins.toString().localeCompare(b.mins.toString())
                    : a.hours.toString().localeCompare(b.hours.toString())
                  : a.day - b.day,
              )
              .map((x, id) => ({ ...x, id: `${profile.uid}_${id}` }))
          : [],
    }))
  }

  /**
   *
   * @param {string | number} userId
   * @param {[number, number]} location
   * @returns
   */
  async #setLocation(userId, location) {
    await this.#sendRequest(APIS.location(userId, location), 'POST')
    const second = await this.#oneHuman(userId)
    return second
  }

  /**
   *
   * @param {string | number} userId
   * @param {string[]} areas
   * @returns
   */
  async #setAreas(userId, areas) {
    const first = await this.#sendRequest(APIS.areas(userId), 'POST', areas)
    const second = await this.#oneHuman(userId)
    return { ...first, ...second }
  }

  /**
   *
   * @template {APIInput} T
   * @param {string | number} userId
   * @param {T} category
   * @param {Method} method
   * @param {any} data
   * @returns {Promise<import("@rm/types").APIReturnType[import("@rm/types").Split<T, '-'>[0]]>}
   */
  async api(userId, category, method = 'GET', data = null) {
    if (this.v2) return this.#apiV2(userId, category, method, data)
    const [main, action] = PoracleAPI.#split(category)
    if (TRACKING_CATEGORIES.has(main)) {
      return this.#trackingApi(userId, main, action, method, data)
    }
    switch (main) {
      case 'start':
      case 'stop':
        return this.#setActive(userId, category, method)
      case 'switchProfile':
        return this.#sendRequest(APIS.switchProfile(userId, data), method).then(
          () => this.#oneHuman(userId),
        )
      case 'setLocation':
        return this.#setLocation(userId, data)
      case 'setAreas':
        return this.#setAreas(userId, data)
      case 'geojson':
        return this.#sendRequest(APIS.geofence)
      case 'areaSecurity':
        return this.#sendRequest(APIS.areaSecurity(userId))
      case 'humans':
        return this.#sendRequest(APIS.humans(userId))
      case 'profile':
      case 'profiles':
        return this.#profileManagement(
          userId,
          action ? `${main}-${action}` : main,
          method,
          data,
        )
      case 'quickGym':
        return this.#quickGym(userId, data)
      case 'human':
      case 'oneHuman':
        return this.#oneHuman(userId)
      default:
        return this.#trackingApi(userId, main, action, method, data)
    }
  }

  /**
   * Runs one tracking operation and returns the fresh rule list.
   * @param {string | number} userId
   * @param {string} category
   * @param {Action | undefined} action
   * @param {Method} method
   * @param {any} data
   * @returns {Promise<any>}
   */
  async #trackingApi(userId, category, action, method, data) {
    const id = String(userId)
    return this.#runTracking(id, category, async () => {
      if (action === 'delete') {
        await this.#tracking.remove(id, category, data || [])
      } else if (method === 'DELETE') {
        await this.#tracking.remove(id, category, [data.uid])
      } else if (method === 'POST') {
        await this.#tracking.save(
          id,
          category,
          Array.isArray(data) ? data : [data],
        )
      }
    })
  }

  /**
   * Runs a write, then lists the category; request and adapter errors become
   * a `status: 'error'` result carrying the current rules.
   * @param {string} id
   * @param {string} category
   * @param {() => Promise<void>} operation
   */
  async #runTracking(id, category, operation) {
    /** @type {string | undefined} */
    let message
    try {
      await operation()
    } catch (e) {
      if (e instanceof PoracleRequestError || e instanceof UnsupportedOnV1) {
        message = e.message
      } else {
        throw e
      }
    }
    /** @type {Record<string, any>[]} */
    let rules = []
    try {
      rules = await this.#tracking.list(id, category)
    } catch (e) {
      if (!(e instanceof PoracleRequestError)) throw e
      message ||= e.message
    }
    const sortBy = this.ui[category]?.sortProp
    if (sortBy) rules.sort((a, b) => a[sortBy] - b[sortBy])
    if (message !== undefined) {
      log.warn(TAGS.webhooks, `${this.name} ${category} tracking:`, message)
    }
    return message === undefined
      ? { status: 'ok', [category]: rules }
      : { status: 'error', message, [category]: rules }
  }

  /**
   * Tracks a gym with minimal raid, egg and gym rules.
   * @param {string | number} userId
   * @param {string} gymId
   */
  async #quickGym(userId, gymId) {
    const id = String(userId)
    return this.#runTracking(id, 'gym', async () => {
      await Promise.all([
        this.#tracking.save(id, 'raid', [{ gym_id: gymId }]),
        this.#tracking.save(id, 'egg', [{ level: 90, gym_id: gymId }]),
        this.#tracking.save(id, 'gym', [
          {
            team: 'any',
            slot_changes: true,
            battle_changes: this.gymBattles,
            gym_id: gymId,
          },
        ]),
      ])
    })
  }

  /**
   * v2 counterpart of api(): same categories, same v1-shaped results.
   * @param {string | number} userId
   * @param {APIInput} category
   * @param {Method} method
   * @param {any} data
   * @returns {Promise<any>}
   */
  async #apiV2(userId, category, method = 'GET', data = null) {
    const [main, action] = PoracleAPI.#split(category)
    if (TRACKING_CATEGORIES.has(main)) {
      return this.#trackingApi(userId, main, action, method, data)
    }
    switch (main) {
      case 'start':
      case 'stop':
        await this.#sendV2(
          V2.action(userId, main === 'start' ? 'enable' : 'disable'),
          'POST',
        )
        return this.#oneHuman(userId)
      case 'switchProfile':
        await this.#sendV2(V2.action(userId, 'profile'), 'POST', {
          profile_no: +data,
        })
        return this.#oneHuman(userId)
      case 'setLocation':
        await this.#sendV2(V2.action(userId, 'location'), 'POST', {
          latitude: +data[0],
          longitude: +data[1],
        })
        return this.#oneHuman(userId)
      case 'setAreas': {
        const first = await this.#sendV2(V2.action(userId, 'areas'), 'POST', {
          areas: data,
        })
        return { ...first, ...(await this.#oneHuman(userId)) }
      }
      case 'geojson':
        return this.#sendRequest(APIS.geofence)
      case 'areaSecurity':
        return this.#sendRequest(APIS.areaSecurity(userId))
      case 'humans':
        return this.#sendV2(V2.action(userId, 'areas'))
      case 'profile':
      case 'profiles':
        return this.#profileManagementV2(userId, action, method, data)
      case 'quickGym':
        return this.#quickGym(userId, data)
      case 'human':
      case 'oneHuman':
        return this.#oneHuman(userId)
      default:
        return this.#trackingApi(userId, main, action, method, data)
    }
  }

  /**
   * @param {string | number} userId
   * @param {Action | undefined} action
   * @param {Method} method
   * @param {any} data
   */
  async #profileManagementV2(userId, action, method, data) {
    switch (action) {
      case 'add':
        await this.#sendV2(V2.profiles(userId), 'POST', {
          name: data.name,
          ...(data.active_hours?.length
            ? { active_hours: toV2ActiveHours(data.active_hours) }
            : {}),
        })
        break
      case 'update':
        // v1's update only ever wrote active_hours; keep it that way.
        await this.#sendV2(V2.profiles(userId, data.profile_no), 'PATCH', {
          active_hours: toV2ActiveHours(data.active_hours),
        })
        break
      case 'byProfileNo':
        if (method === 'DELETE') {
          await this.#sendV2(V2.profiles(userId, data), 'DELETE')
        }
        break
      case 'copy':
        await this.#sendV2(V2.profiles(userId, `${data.to}/copy`), 'POST', {
          from_profile: +data.from,
        })
        break
      default:
    }
    const { profiles } = await this.#sendV2(V2.profiles(userId))
    return {
      profile: PoracleAPI.#processProfiles(
        (profiles || []).map((profile) => ({
          ...profile,
          active_hours: fromV2ActiveHours(profile.active_hours),
        })),
      ),
    }
  }

  /**
   *
   * @param {APIInput} category
   * @returns {[Category, Action | undefined]}
   */
  static #split(category) {
    const [main, action] =
      /** @type {import("@rm/types").Split<typeof category, '-'>} */ (
        category.split('-', 2)
      )
    return [main, action]
  }

  generateUi() {
    const isOhbem = this.pvp === 'ohbem'
    const poracleUiObj = /** @type {const} */ ({
      human: true,
      pokemon: {
        sortProp: 'pokemon_id',
        identifiers: ['pokemon_id', 'form'],
        defaults: {
          clean: false,
          edit: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: null,
          form: null,
          gender: null,
          atk: null,
          max_atk: null,
          min_cp: null,
          max_cp: null,
          def: null,
          max_def: null,
          min_iv: null,
          max_iv: null,
          min_level: null,
          max_level: null,
          size: null,
          max_size: null,
          rarity: null,
          max_rarity: null,
          sta: null,
          max_sta: null,
          max_weight: null,
          min_time: 0,
          min_weight: null,
          pvp_ranking_league: 0,
          pvp_ranking_best: 1,
          pvp_ranking_worst: this.pvpFilterMaxRank,
          pvp_ranking_min_cp: 0,
          pvp_ranking_cap: this.defaultPvpCap,
          allForms: false,
          pvpEntry: false,
          noIv: false,
          byDistance: false,
          xs: false,
          xl: false,
          everything_individually:
            this.everythingFlagPermissions ===
              'allow-and-always-individually' ||
            this.everythingFlagPermissions === 'deny',
        },
        ui: {
          primary: {
            sliders: [
              {
                name: 'iv',
                label: '',
                min: -1,
                max: 100,
                perm: 'iv',
                low: 'min_iv',
                high: 'max_iv',
                anyLow: true,
                anyHigh: true,
              },
              {
                name: 'level',
                label: '',
                min: 0,
                max: 55,
                perm: 'iv',
                low: 'min_level',
                high: 'max_level',
                anyLow: true,
                anyHigh: true,
              },
            ],
          },
          advanced: {
            sliders: [
              {
                name: 'cp',
                label: '',
                min: 0,
                max: 9000,
                perm: 'iv',
                low: 'min_cp',
                high: 'max_cp',
                anyLow: true,
                anyHigh: true,
              },
              {
                name: 'atk_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'atk',
                high: 'max_atk',
                anyLow: true,
                anyHigh: true,
              },
              {
                name: 'def_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'def',
                high: 'max_def',
                anyLow: true,
                anyHigh: true,
              },
              {
                name: 'sta_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'sta',
                high: 'max_sta',
                anyLow: true,
                anyHigh: true,
              },
              {
                name: 'size',
                label: '',
                noTextInput: true,
                min: 1,
                max: 5,
                perm: 'iv',
                low: 'size',
                high: 'max_size',
                anyLow: true,
                anyHigh: true,
                marks: [1, 2, 3, 4, 5],
                markI18n: 'size_',
              },
            ],
            texts: [
              {
                name: 'min_time',
                type: 'number',
                max: 60,
                adornment: 's',
                xs: 12,
                sm: 6,
                width: 100,
              },
            ],
          },
          pvp: {
            selects: [
              {
                name: 'pvp_ranking_league',
                options: [{ name: 'none', cp: 0 }, ...this.leagues],
                xs: 6,
                sm: 3,
              },
              ...(isOhbem
                ? [
                    {
                      name: 'pvp_ranking_cap',
                      options: [0, ...this.pvpCaps],
                      xs: 6,
                      sm: 3,
                    },
                  ]
                : []),
            ],
            texts: isOhbem
              ? []
              : [
                  {
                    name: 'pvp_ranking_min_cp',
                    type: 'number',
                    adornment: 'cp',
                    width: 110,
                    xs: 6,
                    sm: 3,
                  },
                ],
            sliders: [
              {
                name: 'pvp',
                label: 'rank',
                min: 1,
                max: this.pvpFilterMaxRank,
                perm: 'pvp',
                low: 'pvp_ranking_best',
                high: 'pvp_ranking_worst',
                anyLow: false,
                anyHigh: false,
              },
            ],
          },
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
              {
                name: 'gender',
                options: [null, 'male', 'female'],
                xs: 4,
                sm: 4,
              },
            ],
            booleans: [
              { name: 'clean', xs: 6, sm: 3 },
              { name: 'edit', xs: 6, sm: 3 },
              { name: 'allForms', xs: 6, sm: 3 },
              { name: 'pvpEntry', xs: 6, sm: 3 },
              { name: 'noIv', xs: 6, sm: 3 },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
          global: {
            booleans: [],
          },
        },
      },
      raid: {
        identifiers: ['pokemon_id', 'form', 'level'],
        defaults: {
          clean: false,
          edit: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: null,
          evolution: null,
          form: null,
          move: null,
          exclusive: false,
          level: null,
          team: null,
          rsvp_changes: null,
          gym_id: null,
          byDistance: false,
          allMoves: true,
          allForms: false,
          everything_individually:
            this.everythingFlagPermissions ===
              'allow-and-always-individually' ||
            this.everythingFlagPermissions === 'deny',
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 6,
                sm: 4,
              },
              { name: 'template', options: [], xs: 6, sm: 4 },
              {
                name: 'team',
                options: [null, 'harmony', 'mystic', 'valor', 'instinct'],
                xs: 6,
                sm: 4,
              },
              { name: 'move', options: [], xs: 6, sm: 5 },
              {
                name: 'rsvp_changes',
                options: [null, 'rsvp', 'rsvp_only'],
                xs: 6,
                sm: 5,
              },
            ],
            booleans: [
              { name: 'clean', xs: 6, sm: 3 },
              { name: 'edit', xs: 6, sm: 3 },
              { name: 'exclusive', xs: 6, sm: 3 },
              { name: 'allForms', disabled: ['r'], xs: 6, sm: 3 },
              { name: 'allMoves', disabled: ['r'], xs: 6, sm: 3 },
            ],
            autoComplete: [
              {
                name: 'gymName',
                label: 'gym',
                searchCategory: 'gyms',
                xs: 12,
                sm: 12,
              },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
          global: {
            booleans: [],
          },
        },
      },
      egg: {
        identifiers: ['level'],
        defaults: {
          clean: false,
          edit: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          exclusive: false,
          level: 90,
          team: null,
          rsvp_changes: null,
          gym_id: null,
          byDistance: false,
          everything_individually:
            this.everythingFlagPermissions ===
              'allow-and-always-individually' ||
            this.everythingFlagPermissions === 'deny',
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 6,
                sm: 3,
              },
              { name: 'template', options: [], xs: 6, sm: 3 },
              {
                name: 'team',
                options: [null, 'harmony', 'mystic', 'valor', 'instinct'],
                xs: 6,
                sm: 3,
              },
              {
                name: 'rsvp_changes',
                options: [null, 'rsvp', 'rsvp_only'],
                xs: 6,
                sm: 3,
              },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              { name: 'edit', xs: 4, sm: 4 },
              { name: 'exclusive', xs: 4, sm: 4 },
            ],
            autoComplete: [
              {
                name: 'gymName',
                label: 'gym',
                searchCategory: 'gyms',
                xs: 12,
                sm: 12,
              },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
          global: {
            booleans: [],
          },
        },
      },
      gym: {
        identifiers: ['team'],
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          team: 'any',
          slot_changes: false,
          battle_changes: false,
          gym_id: null,
          byDistance: false,
          everything_individually:
            this.everythingFlagPermissions ===
              'allow-and-always-individually' ||
            this.everythingFlagPermissions === 'deny',
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 6,
              },
              { name: 'template', options: [], xs: 4, sm: 6 },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              ...(this.gymBattles
                ? [{ name: 'battle_changes', xs: 6, sm: 4 }]
                : []),
              { name: 'slot_changes', xs: 6, sm: 4 },
            ],
            autoComplete: [
              {
                name: 'gymName',
                label: 'gym',
                searchCategory: 'gyms',
                xs: 12,
                sm: 12,
              },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
          global: {
            booleans: [],
          },
        },
      },
      invasion: {
        identifiers: ['grunt_type'],
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          grunt_type: null,
          gender: null,
          byDistance: false,
          everything_individually:
            this.everythingFlagPermissions ===
              'allow-and-always-individually' ||
            this.everythingFlagPermissions === 'deny',
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
            ],
            booleans: [{ name: 'clean', xs: 4, sm: 4 }],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
          global: {
            booleans: [],
          },
        },
      },
      incident: {
        identifiers: ['display_type'],
        defaults: {
          clean: false,
          edit: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          display_type: null,
          byDistance: false,
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              { name: 'edit', xs: 4, sm: 4 },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
        },
      },
      lure: {
        identifiers: ['lure_id'],
        defaults: {
          clean: false,
          edit: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          lure_id: 0,
          byDistance: false,
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              { name: 'edit', xs: 4, sm: 4 },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
        },
      },
      quest: {
        identifiers: ['reward', 'reward_type'],
        defaults: {
          clean: false,
          summary: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          reward: null,
          shiny: false,
          reward_type: 0,
          amount: 0,
          form: null,
          byDistance: false,
          allForms: false,
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              { name: 'summary', xs: 4, sm: 4 },
              {
                name: 'allForms',
                xs: 6,
                sm: 6,
                disabled: ['m', 'x', 'd', 'c', 'q'],
              },
            ],
            texts: [
              {
                name: 'amount',
                type: 'number',
                disabled: ['m', 'd', 'g'],
                xs: 6,
                sm: 6,
              },
            ],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
        },
      },
      nest: {
        identifiers: ['pokemon_id', 'form'],
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: null,
          min_spawn_avg: 0,
          form: null,
          byDistance: false,
          allForms: false,
        },
        ui: {
          general: {
            selects: [
              {
                name: 'profile_no',
                disabled: true,
                options: [],
                xs: 4,
                sm: 4,
              },
              { name: 'template', options: [], xs: 4, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 4, sm: 4 },
              { name: 'allForms', xs: 6, sm: 6 },
            ],
            texts: [{ name: 'min_spawn_avg', type: 'number', xs: 6, sm: 6 }],
            distanceOrArea: {
              booleans: [
                {
                  name: 'byDistance',
                  max: this.maxDistance,
                  xs: 6,
                  sm: 8,
                  override: true,
                },
              ],
              texts: [
                {
                  name: 'distance',
                  type: 'number',
                  adornment: 'm',
                  xs: 6,
                  sm: 4,
                },
              ],
            },
          },
        },
      },
    })
    Object.values(poracleUiObj).forEach((category) => {
      if (
        typeof category === 'object' &&
        category?.ui?.global &&
        this.everythingFlagPermissions === 'allow-any'
      ) {
        category.ui.global.booleans.push({
          name: 'everything_individually',
          xs: 12,
          sm: 12,
          override: true,
        })
      }
    })
    // this.disabledHooks.forEach((hook) => delete poracleUiObj[hook])
    return poracleUiObj
  }
}

module.exports = {
  PoracleAPI,
  resolveGeocoderProvider,
  toV2ActiveHours,
  fromV2ActiveHours,
}
