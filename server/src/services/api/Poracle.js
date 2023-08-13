// @ts-check
const fetchJson = require('./fetchJson')
const { log, HELPERS } = require('../logger')
const webhookUi = require('../ui/webhook')
const resolveQuickHook = require('./resolveQuickHook')

const PLATFORMS = /** @type {const} */ (['discord', 'telegram'])

/**
 * @typedef {import('types').PoracleAPIRef} APIReference
 * @typedef {import('types').PoracleAPIInput} APIInput
 * @typedef {import('types').PoracleCategory} Category
 * @typedef {import('types').PoracleAction} Action
 * @typedef {import('types').HttpMethod} Method
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
  // @ts-ignore
  tracking: (userId, category, suffix = '') =>
    `/api/tracking/${category}/${userId}${suffix}`,
  profiles: (userId) => `/api/profiles/${userId}`,
  // @ts-ignore
  profileAction: (userId, action, suffix = '') =>
    `/api/profiles/${userId}/${action}${suffix}`,
})

const SUBCATEGORIES = /** @type {const} */ ({
  gym: ['raid', 'egg', 'gym'],
})

class PoracleAPI {
  constructor(webhook) {
    if (!webhook.name) throw new Error('PoracleAPI: name is required')
    log.info(HELPERS.webhooks, `Initializing PoracleAPI for ${webhook.name}`)

    this.name = webhook.name
    this.provider = webhook.provider
    this.endpoint = `${webhook.host}:${webhook.port}`
    this.secret = webhook.poracleSecret
    this.areasToSkip = webhook.areasToSkip?.map((x) => x.toLowerCase()) || []
    this.addressFormat = webhook.addressFormat
    this.nominatimUrl = webhook.nominatimUrl
    this.enabled = webhook.enabled || false

    this.discordRoles = webhook.discordRoles || []
    this.telegramGroups = webhook.telegramGroups || []
    this.local = webhook.local || false
    this.admins = { discord: [], telegram: [] }

    this.defaultDistance = 0
    this.maxDistance = 100_000
    this.defaultTemplateName = 0
    this.disabledHooks = []
    this.everythingFlagPermission = 'none'
    this.version = null
    this.lastFetched = 0
    this.prefix = '!'
    this.locale = 'en'
    this.gymBattles = false
    this.geojson = { features: [], type: 'FeatureCollection' }
    this.templates = { discord: {}, telegram: {} }

    this.pvp = 'rdm'
    this.defaultPvpCap = 0
    this.pvpFilterMaxRank = 4096
    this.pvpCaps = []
    this.leagues = []

    this.ui = {}
  }

  async init() {
    if (!this.enabled) return this
    try {
      await Promise.all([
        this.remoteConfig(),
        this.getGeojson(),
        this.getTemplates(),
      ])
      this.lastFetched = Date.now()
      log.info(HELPERS.webhooks, `${this.name} webhook initialized`)
    } catch (e) {
      log.error(HELPERS.webhooks, `Error initializing ${this.name} webhook`, e)
    }
    return this
  }

  async remoteConfig() {
    const remoteConfig = await this.sendRequest(APIS.config)
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
      (major === 4 && minor < 6) ||
      (major === 4 && minor === 6 && patch < 0)
    ) {
      throw new Error(
        `Poracle must be at least version 4.6.0, current version is ${this.version}`,
      )
    }
    Object.assign(this, remoteConfig)
    if (remoteConfig.addressFormat && !this.addressFormat) {
      this.addressFormat = remoteConfig.addressFormat
    }
    if (remoteConfig.providerUrl && !this.nominatimUrl) {
      this.nominatimUrl = remoteConfig.providerUrl
    }
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
    this.ui = webhookUi(this.provider, remoteConfig, this.pvp, this.leagues)
  }

  async getGeojson() {
    /** @type {{ geoJSON: import('types').RMGeoJSON }} */
    const { geoJSON } = await this.sendRequest(APIS.geofence)
    if (geoJSON?.features) {
      this.geojson.features = geoJSON.features.filter(
        (x) => !this.areasToSkip.includes(x.properties.name.toLowerCase()),
      )
    } else {
      log.warn(HELPERS.webhooks, 'No geofences found')
    }
  }

  async getTemplates() {
    const templates = await this.sendRequest(APIS.templates)
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
   * @param {{
   *  strategy: 'discord' | 'telegram'
   *  webhookStrategy: 'discord' | 'telegram'
   *  discordId: `${number}`
   *  telegramId: `${number}`
   * }} user
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
   * @param {number} userId
   * @returns
   */
  async getUserAreas(userId) {
    /** @type {{ areas: import('types').PoracleHumanArea[] }} */
    const { areas } = await this.sendRequest(APIS.humans(userId))
    const areaGroups = areas.reduce((groupMap, area) => {
      if (area.userSelectable) {
        if (!groupMap[area.group]) groupMap[area.group] = []
        groupMap[area.group].push(area.name)
      }
      return groupMap
    }, /** @type {Record<string, string[]>} */ ({}))

    return Object.entries(areaGroups).map(([group, children]) => ({
      group,
      children,
    }))
  }

  /**
   *
   * @param {string} path
   * @param {Method} method
   * @param {any} body
   * @returns
   */
  async sendRequest(path, method = 'GET', body = null) {
    return fetchJson(`${this.endpoint}${path}`, {
      method,
      headers: {
        'X-Poracle-Secret': this.secret,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   *
   * @param {number} userId
   * @returns
   */
  async oneHuman(userId) {
    return this.sendRequest(APIS.oneHuman(userId))
  }

  /**
   *
   * @param {number} userId
   * @param {boolean} active
   * @returns
   */
  async setActive(userId, active) {
    const first = await this.sendRequest(
      active ? APIS.start(userId) : APIS.stop(userId),
    )
    const second = await this.oneHuman(userId)
    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {`profiles-${Action}` | 'profiles'} category
   * @param {Method} method
   * @param {any} data
   * @returns
   */
  async profileManagement(userId, category, method, data) {
    const [, action] = PoracleAPI.split(category)

    const first = await this.sendRequest(
      action
        ? APIS.profileAction(
            userId,
            action,
            `/${action === 'copy' ? `/${data.from}/${data.to}` : ''}${
              method === 'DELETE' ? `/${data}` : ''
            }`,
          )
        : APIS.profiles(userId),
      method,
      method === 'POST' && category !== 'profiles-copy' ? data : undefined,
    )
    const second = await this.sendRequest(APIS.profiles(userId))
    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {[number, number]} location
   * @returns
   */
  async setLocation(userId, location) {
    const first = await this.sendRequest(APIS.location(userId, location))
    const second = await this.oneHuman(userId)
    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {string[]} areas
   * @returns
   */
  async setAreas(userId, areas) {
    const first = await this.sendRequest(APIS.areas(userId), 'POST', areas)
    const second = await this.oneHuman(userId)
    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {APIInput} category
   * @param {Method} method
   * @param {any} data
   * @returns
   */
  async tracking(userId, category, method, data) {
    const [main, action] = PoracleAPI.split(category)
    const first = action
      ? await this.sendRequest(
          APIS.tracking(userId, main, action),
          method,
          method === 'POST' ? data : undefined,
        )
      : await this.sendRequest(
          APIS.tracking(
            userId,
            main,
            method === 'DELETE' ? `/byUid/${data.uid}` : '',
          ),
          method,
          data,
        )
    const second = await this.sendRequest(APIS.tracking(userId, main))

    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {APIInput} category
   * @param {Method} method
   * @param {any} data
   * @returns
   */
  async api(userId, category, method = 'GET', data = null) {
    const [main, action] = PoracleAPI.split(category)
    switch (main) {
      case 'start':
      case 'stop':
        return this.setActive(userId, category === 'start')
      case 'switchProfile':
        return this.sendRequest(APIS.switchProfile(userId, data))
      case 'setLocation':
        return this.setLocation(userId, data)
      case 'setAreas':
        return this.setAreas(userId, data)
      case 'geojson':
        return this.sendRequest(APIS.geofence)
      case 'areaSecurity':
        return this.sendRequest(APIS.areaSecurity(userId))
      case 'humans':
        return this.sendRequest(APIS.humans(userId))
      case 'profiles':
        return this.profileManagement(userId, `${main}-${action}`, method, data)
      case 'egg':
      case 'invasion':
      case 'lure':
      case 'nest':
      case 'pokemon':
      case 'quest':
      case 'raid':
      case 'gym':
        return this.tracking(userId, category, data)
      case 'quickGym':
        return resolveQuickHook(category, userId, this.name, data)
      default:
        return this.tracking(userId, category, data)
    }
  }

  /**
   *
   * @param {number} userId
   * @param {any} data
   */
  async quickGym(userId, data) {
    await Promise.all(
      SUBCATEGORIES.gym.map((subCategory) =>
        this.sendRequest(APIS.tracking(userId, subCategory), 'POST', {
          ...this.ui[subCategory].defaults,
          ...this.wildCards(subCategory),
          gym_id: data.id,
        }),
      ),
    )
    return this.sendRequest(APIS.tracking(userId, 'gym'))
  }

  /**
   *
   * @param {typeof SUBCATEGORIES.gym[number]} category
   * @returns
   */
  wildCards(category) {
    switch (category) {
      case 'gym':
        return { team: 4, slot_changes: true, battle_changes: this.gymBattles }
      case 'egg':
      case 'raid':
        return { level: 90 }
      default:
        return {}
    }
  }

  /**
   * @param {APIInput} category
   * @returns {[Category, Action | undefined]}
   */
  static split(category) {
    const [main, action] =
      /** @type {import('types').Split<typeof category, '-'>} */ (
        category.split('-', 2)
      )
    return [main, action]
  }
}

module.exports = PoracleAPI
