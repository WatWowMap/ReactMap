// @ts-check
const fetchJson = require('./fetchJson')
const { log, HELPERS } = require('../logger')

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
  tracking: (userId, category, suffix) =>
    `/api/tracking/${category}/${userId}${suffix ? `/${suffix}` : ''}`,
  profiles: (userId) => `/api/profiles/${userId}`,
  profileAction: (userId, action, suffix) =>
    `/api/profiles/${userId}${action ? `/${action}` : ''}${
      suffix ? `/${suffix}` : ''
    }`,
})

const SUBCATEGORIES = /** @type {const} */ ({
  gym: ['raid', 'egg', 'gym'],
})

class PoracleAPI {
  /** @param {import('types').Config['webhooks'][number]} webhook */
  constructor(webhook) {
    if (!webhook.name)
      throw new Error('PoracleAPI: name is required', { cause: webhook })
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
    this.everythingFlagPermissions = 'none'
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

    // /** @type {ReturnType<PoracleAPI['buildPoracleUI']>} */
    this.ui = {}
  }

  /**
   * @param {'discord' | 'telegram'} platform
   * @returns
   */
  getClientContext(platform) {
    return {
      name: this.name,
      templates: this.templates[platform],
      hasNominatim: !!this.nominatimUrl,
      addressFormat: this.addressFormat,
      locale: this.locale,
      everything: this.everythingFlagPermissions,
      prefix: this.prefix,
      leagues: this.leagues,
      pvp: this.pvp,
      ui: this.ui,
    }
  }

  /**
   * @param {string[] | string | null} blockedAlerts
   * @returns
   */
  getAllowedCategories(blockedAlerts) {
    return Object.keys(this.ui).filter(
      (key) =>
        !(this.disabledHooks.includes(key) || blockedAlerts?.includes(key)),
    )
  }

  async init() {
    if (!this.enabled) return this
    try {
      await Promise.all([
        this.#fetchConfig(),
        this.#fetchGeojson(),
        this.#fetchTemplates(),
      ])
      this.lastFetched = Date.now()
      log.info(HELPERS.webhooks, `${this.name} webhook initialized`)
    } catch (e) {
      log.error(HELPERS.webhooks, `Error initializing ${this.name} webhook`, e)
    }
    return this
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
      (major === 4 && minor < 6) ||
      (major === 4 && minor === 6 && patch < 0)
    ) {
      throw new Error(
        `Poracle must be at least version 4.6.0, current version is ${this.version}`,
      )
    }
    const { providerURL, addressFormat, ...rest } = remoteConfig
    Object.assign(this, rest)
    if (addressFormat && !this.addressFormat) {
      this.addressFormat = addressFormat
    }
    if (providerURL && !this.nominatimUrl) {
      this.nominatimUrl = providerURL
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
    this.ui = this.buildPoracleUi()
  }

  async #fetchGeojson() {
    /** @type {{ geoJSON: import('types').RMGeoJSON }} */
    const { geoJSON } = await this.#sendRequest(APIS.geofence)
    if (geoJSON?.features) {
      this.geojson.features = geoJSON.features.filter(
        (x) => !this.areasToSkip.includes(x.properties.name.toLowerCase()),
      )
    } else {
      log.warn(HELPERS.webhooks, 'No geofences found')
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
    const { areas } = await this.#sendRequest(APIS.humans(userId))
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
  async #sendRequest(path, method = 'GET', body = {}) {
    const response = await fetchJson(`${this.endpoint}${path}`, {
      method,
      headers: {
        'X-Poracle-Secret': this.secret,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    })
    return response
  }

  /**
   *
   * @param {number} userId
   * @returns
   */
  async #oneHuman(userId) {
    const { human } = await this.#sendRequest(APIS.oneHuman(userId))
    return {
      human: {
        ...human,
        area: human.area ? JSON.parse(human.area) : [],
        area_restrictions: human.area_restrictions
          ? JSON.parse(human.area_restrictions)
          : [],
        blocked_alerts: human.blocked_alerts
          ? JSON.parse(human.blocked_alerts)
          : [],
        community_membership: human.community_membership
          ? JSON.parse(human.community_membership)
          : [],
      },
    }
  }

  /**
   *
   * @param {number} userId
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
   * @param {number} userId
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
      method === 'POST' && action !== 'copy' ? data : undefined,
    )
    if (method === 'GET')
      return { profile: PoracleAPI.#processProfile(first.profile) }
    const second = await this.#sendRequest(APIS.profiles(userId))
    return { profile: PoracleAPI.#processProfile(second.profile) }
  }

  /**
   * @param {import('types').PoracleProfile[]} profiles
   * @returns {import('types').PoracleProfile[]}
   */
  static #processProfile(profiles) {
    return profiles.map((profile) => ({
      ...profile,
      area: profile.area ? JSON.parse(profile.area) : [],
      active_hours: profile.active_hours
        ? JSON.parse(profile.active_hours)
        : {},
    }))
  }

  /**
   *
   * @param {number} userId
   * @param {[number, number]} location
   * @returns
   */
  async #setLocation(userId, location) {
    const first = await this.#sendRequest(
      APIS.location(userId, location),
      'POST',
    )
    console.log({ first })
    const second = await this.#oneHuman(userId)
    return { ...first, ...second }
  }

  /**
   *
   * @param {number} userId
   * @param {string[]} areas
   * @returns
   */
  async #setAreas(userId, areas) {
    const first = await this.#sendRequest(APIS.areas(userId), 'POST', areas)
    const second = await this.#oneHuman(userId)
    return { ...first, ...second }
  }

  /** @type {PoracleAPI['api']} */
  async #tracking(userId, category, method, data) {
    const [main, action] = PoracleAPI.#split(category)
    const first = action
      ? await this.#sendRequest(
          APIS.tracking(userId, main, action),
          method,
          method === 'POST' ? data : undefined,
        )
      : await this.#sendRequest(
          APIS.tracking(
            userId,
            main,
            method === 'DELETE' ? `/byUid/${data.uid}` : '',
          ),
          method,
          data,
        )
    const second = await this.#sendRequest(APIS.tracking(userId, main))

    return { ...first, ...second }
  }

  /**
   * @template {APIInput} T
   * @param {number} userId
   * @param {T} category
   * @param {Method} method
   * @param {any} data
   * @returns {Promise<import('types').APIReturnType[import('types').Split<T, '-'>[0]]>}
   */
  async api(userId, category, method = 'GET', data = null) {
    const [main, action] = PoracleAPI.#split(category)
    log.warn(HELPERS.webhooks, HELPERS.api, {
      main,
      action,
      userId,
      category,
      method,
      data,
    })
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
      case 'profiles':
        return this.#profileManagement(
          userId,
          action ? `${main}-${action}` : main,
          method,
          data,
        )
      case 'egg':
      case 'invasion':
      case 'lure':
      case 'nest':
      case 'pokemon':
      case 'quest':
      case 'raid':
      case 'gym':
        return this.#tracking(userId, category, data)
      case 'quickGym':
        return this.#quickGym(userId, data)
      case 'human':
        return this.#oneHuman(userId)
      default:
        return this.#tracking(userId, category, data)
    }
  }

  /**
   *
   * @param {number} userId
   * @param {any} data
   */
  async #quickGym(userId, data) {
    await Promise.all(
      SUBCATEGORIES.gym.map((subCategory) =>
        this.#sendRequest(APIS.tracking(userId, subCategory), 'POST', {
          ...this.ui[subCategory].defaults,
          ...this.#wildCards(subCategory),
          gym_id: data.id,
        }),
      ),
    )
    return this.#sendRequest(APIS.tracking(userId, 'gym'))
  }

  /**
   *
   * @param {typeof SUBCATEGORIES.gym[number]} category
   * @returns
   */
  #wildCards(category) {
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
  static #split(category) {
    const [main, action] =
      /** @type {import('types').Split<typeof category, '-'>} */ (
        category.split('-', 2)
      )
    return [main, action]
  }

  buildPoracleUi() {
    const isOhbem = this.pvp === 'ohbem'
    const poracleUiObj = /** @type {const} */ ({
      human: true,
      pokemon: {
        sortProp: 'pokemon_id',
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: 0,
          form: 0,
          gender: 0,
          atk: 0,
          max_atk: 15,
          min_cp: 0,
          max_cp: 9000,
          def: 0,
          max_def: 15,
          min_iv: -1,
          max_iv: 100,
          min_level: 0,
          max_level: 40,
          size: 1,
          max_size: 5,
          rarity: -1,
          max_rarity: 6,
          sta: 0,
          max_sta: 15,
          max_weight: 9000000,
          min_time: 0,
          min_weight: 0,
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
              },
              {
                name: 'level',
                label: '',
                min: 0,
                max: 40,
                perm: 'iv',
                low: 'min_level',
                high: 'max_level',
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
              },
              {
                name: 'atk_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'atk',
                high: 'max_atk',
              },
              {
                name: 'def_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'def',
                high: 'max_def',
              },
              {
                name: 'sta_iv',
                label: '',
                min: 0,
                max: 15,
                perm: 'iv',
                low: 'sta',
                high: 'max_sta',
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
              { name: 'gender', options: [0, 1, 2], xs: 4, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 6, sm: 3 },
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
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: 9000,
          evolution: 9000,
          form: 0,
          move: 9000,
          exclusive: false,
          level: 9000,
          team: 4,
          gym_id: null,
          byDistance: false,
          allMoves: true,
          allForms: true,
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
              { name: 'team', options: [0, 1, 2, 3, 4], xs: 6, sm: 3 },
              { name: 'move', options: [], xs: 6, sm: 3 },
            ],
            booleans: [
              { name: 'clean', xs: 6, sm: 3 },
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
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          exclusive: false,
          level: 9000,
          team: 4,
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
                sm: 4,
              },
              { name: 'template', options: [], xs: 6, sm: 4 },
              { name: 'team', options: [0, 1, 2, 3, 4], xs: 6, sm: 4 },
            ],
            booleans: [
              { name: 'clean', xs: 6, sm: 6 },
              { name: 'exclusive', xs: 6, sm: 6 },
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
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          team: 4,
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
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          grunt_type: null,
          gender: 0,
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
      lure: {
        defaults: {
          clean: false,
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
        },
      },
      quest: {
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          reward: null,
          shiny: 0,
          reward_type: 0,
          amount: 0,
          form: 0,
          byDistance: false,
          allForms: true,
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
        defaults: {
          clean: false,
          distance: 0,
          template: this.defaultTemplateName.toString(),
          pokemon_id: 0,
          min_spawn_avg: 0,
          form: 0,
          byDistance: false,
          allForms: true,
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
    this.disabledHooks.forEach((hook) => delete poracleUiObj[hook])
    return poracleUiObj
  }
}

module.exports = PoracleAPI
