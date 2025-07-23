// @ts-check
const { promises: fs } = require('fs')
const path = require('path')
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { Logger } = require('@rm/logger')
const { generate, read } = require('@rm/masterfile')

const { PoracleAPI } = require('./Poracle')
const { getCache } = require('./cache')

/**
 * @typedef {Record<string, import('./AuthClient').AuthClient>} ClientObject
 */

class EventManager extends Logger {
  constructor() {
    super('event')
    /** @type {import("@rm/masterfile").Masterfile} */
    this.masterfile = read()
    /** @type {import("@rm/masterfile").Masterfile['invasions'] | {}} */
    this.invasions =
      'invasions' in this.masterfile ? this.masterfile.invasions : {}

    /** @type {{[key in keyof import('@rm/types').Available]: string[] }} */
    this.available = getCache('available.json', {
      gyms: [],
      pokestops: [],
      pokemon: [],
      nests: [],
      stations: [],
    })
    this.uicons = getCache('uicons.json', [])
    this.uaudio = getCache('uaudio.json', [])
    this.uiconsBackup = {}
    this.uaudioBackup = {}

    /** @type {Record<string, NodeJS.Timeout>} */
    this.intervals = {}

    this.baseUrl =
      'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main'

    /** @type {Record<string, InstanceType<typeof PoracleAPI>>} */
    this.webhookObj = Object.fromEntries(
      config
        .getSafe('webhooks')
        .filter((x) => x.enabled)
        .map((webhook) => {
          const api = new PoracleAPI(webhook)
          if (api.initFromCache()) {
            return [api.name, api]
          }
          return [api.name, null]
        })
        .filter(([, api]) => api),
    )
    /** @type {ClientObject} */
    this.authClients = {}
  }

  /**
   *
   * @param {keyof EventManager['available']} category
   * @returns {string[]}
   */
  getAvailable(category) {
    return this.available[category]
  }

  /**
   *
   * @param {keyof EventManager['available']} category
   * @param {import('../models').ScannerModelKeys} model
   * @param {import('./DbManager').DbManager} Db
   */
  async setAvailable(category, model, Db) {
    this.available[category] = await Db.getAvailable(model)

    /** @param {string} key */
    const parseKey = (key) => {
      const match = key.match(/([a-zA-Z]*)(\d+)(?:-(\d+))?/)
      return {
        letter: match[1],
        firstNumber: parseInt(match[2], 10),
        secondNumber: match[3] ? parseInt(match[3], 10) : null,
      }
    }

    this.available[category].sort((a, b) => {
      const keyA = parseKey(a)
      const keyB = parseKey(b)

      // Compare by letter
      if (keyA.letter !== keyB.letter) {
        if (keyA.letter === '') return 1 // No letter comes last
        if (keyB.letter === '') return -1
        return keyA.letter.localeCompare(keyB.letter)
      }

      // Compare by the first number
      if (keyA.firstNumber !== keyB.firstNumber) {
        return keyA.firstNumber - keyB.firstNumber
      }

      // Compare by the second number (if exists)
      if (keyA.secondNumber !== null || keyB.secondNumber !== null) {
        if (keyA.secondNumber === null) return -1
        if (keyB.secondNumber === null) return 1
        return keyA.secondNumber - keyB.secondNumber
      }

      return 0
    })
    this.addAvailable(category)
  }

  /**
   *
   * @param {keyof (import('./AuthClient').AuthClient['loggingChannels'])} channel
   * @param {import('discord.js').APIEmbed} embed
   * @param {keyof EventManager['authClients']} [strategy]
   */
  async chatLog(channel, embed, strategy) {
    if (strategy) {
      if (strategy in this.authClients) {
        return this.authClients[strategy]?.sendMessage(embed, channel)
      }
      this.log.warn(`Strategy ${strategy} not found in authClients`)
    } else {
      await Promise.allSettled(
        Object.values(this.authClients).map(async (client) =>
          client?.sendMessage(embed, channel),
        ),
      )
    }
  }

  clearAll() {
    this.clearIntervals()
    this.clearTrialTimers()
  }

  clearIntervals() {
    this.log.info('clearing intervals')
    Object.values(this.intervals).forEach((interval) => clearInterval(interval))
    this.intervals = {}
  }

  clearTrialTimers() {
    this.log.info('clearing trial timers')
    Object.values(this.authClients).forEach((client) =>
      client?.trialManager?.end(),
    )
  }

  async cleanupTrials() {
    this.log.info('cleaning up session for possibly expired trials')
    await Promise.allSettled(
      Object.values(this.authClients).map((client) =>
        client?.trialManager?.cleanup(),
      ),
    )
  }

  /**
   *
   * @param {import('./DbManager').DbManager} Db
   * @param {import('./PvpWrapper').PvpWrapper | null} Pvp
   */
  startIntervals(Db, Pvp) {
    this.clearIntervals()
    this.log.info('starting intervals')

    if (!config.getSafe('api.queryOnSessionInit.raids')) {
      this.intervals.raidUpdate = setInterval(
        async () => {
          await this.setAvailable('gyms', 'Gym', Db)
          await this.chatLog('event', {
            description: 'Refreshed available raids',
          })
        },
        1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.raids') || 1),
      )
    }
    if (!config.getSafe('api.queryOnSessionInit.nests')) {
      this.intervals.nestUpdate = setInterval(
        async () => {
          await this.setAvailable('nests', 'Nest', Db)
          await this.chatLog('event', {
            description: 'Refreshed available nests',
          })
        },
        1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.nests') || 6),
      )
    }
    if (!config.getSafe('api.queryOnSessionInit.pokemon')) {
      this.intervals.pokemonUpdate = setInterval(
        async () => {
          await this.setAvailable('pokemon', 'Pokemon', Db)
          await this.chatLog('event', {
            description: 'Refreshed available pokemon',
          })
        },
        1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.pokemon') || 1),
      )
    }
    if (!config.getSafe('api.queryOnSessionInit.quests')) {
      this.intervals.questUpdate = setInterval(
        async () => {
          await this.setAvailable('pokestops', 'Pokestop', Db)
          await this.chatLog('event', {
            description: 'Refreshed available quests & invasions',
          })
        },
        1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.quests') || 3),
      )
    }
    if (!config.getSafe('api.queryOnSessionInit.stations')) {
      this.intervals.stationUpdate = setInterval(
        async () => {
          await this.setAvailable('stations', 'Station', Db)
          await this.chatLog('event', {
            description: 'Refreshed available stations',
          })
        },
        1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.stations') || 1),
      )
    }
    this.intervals.uicons = setInterval(
      async () => {
        await this.getUniversalAssets('uicons')
        await this.chatLog('event', { description: 'Refreshed UICONS indexes' })
      },
      1000 * 60 * 60 * (config.getSafe('icons.cacheHrs') || 3),
    )
    this.intervals.uaudio = setInterval(
      async () => {
        await this.getUniversalAssets('uaudio')
        await this.chatLog('event', { description: 'Refreshed UAUDIO indexes' })
      },
      1000 * 60 * 60 * (config.getSafe('audio.cacheHrs') || 3),
    )
    if (config.getSafe('api.pogoApiEndpoints.invasions')) {
      this.intervals.invasions = setInterval(
        async () => {
          await this.getInvasions(Db)
          await this.chatLog('event', { description: 'Refreshed invasions' })
        },
        1000 * 60 * 60 * (config.getSafe('map.misc.invasionCacheHrs') || 1),
      )
    }
    this.intervals.historical = setInterval(
      async () => {
        await Db.historicalRarity()
        await this.chatLog('event', {
          description: 'Refreshed db historical rarity tiers',
        })
      },
      1000 *
        60 *
        60 *
        (config.getSafe('api.queryUpdateHours.historicalRarity') || 6),
    )
    if (config.getSafe('api.pogoApiEndpoints.masterfile')) {
      this.intervals.masterfile = setInterval(
        async () => {
          await this.getMasterfile(Db.historical, Db.rarity)
          await this.chatLog('event', { description: 'Refreshed masterfile' })
        },
        1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6),
      )
    }
    if (Pvp) {
      this.intervals.pvp = setInterval(
        async () => {
          await Pvp.fetchLatestPokemon()
          await this.chatLog('event', {
            description: 'Refreshed PVP masterfile',
          })
        },
        1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6),
      )
    }
    this.intervals.webhooks = setInterval(
      async () => {
        await this.getWebhooks()
        await this.chatLog('event', {
          description: 'Refreshed webhook settings',
        })
      },
      1000 * 60 * 60 * (config.getSafe('map.misc.webhookCacheHrs') || 1),
    )

    this.intervals.filterCxt = setInterval(
      async () => {
        await Db.getFilterContext()
        await this.chatLog('event', { description: 'Updated filter contexts' })
      },
      1000 * 60 * 30,
    )
  }

  /**
   *
   * @param {'uicons' | 'uaudio'} type
   */
  async getUniversalAssets(type) {
    const styles =
      type === 'uicons'
        ? config.getSafe('icons.styles')
        : config.getSafe('audio.styles')
    this.log.info('Fetching Latest', type.toUpperCase())
    if (!styles.some((icon) => icon.path.includes('wwm'))) {
      this.log.info(
        `Base ${type} not found in config (either remotely or locally). This may be fine, but some things might be broken, such as items from the 'misc' folder.`,
      )
    }
    const assets = await Promise.allSettled(
      styles.map(async (style) => {
        try {
          /** @type {import('uicons.js').UiconsIndex} */
          const response = style.path.startsWith('http')
            ? await fetch(`${style.path}/index.json`).then((res) => res.json())
            : JSON.parse(
                await fs.readFile(
                  path.resolve(
                    __dirname,
                    `../../../public/images/${type}/${style.path}/index.json`,
                  ),
                  'utf-8',
                ),
              )
          return { ...style, data: response }
        } catch (e) {
          this.log.warn(
            `Failed to generate latest ${type} for:`,
            style,
            '\n',
            e,
          )
          this.log.warn(
            `Make sure the path follows one of these two formats: \n\tRemote: ${this.baseUrl}\n\tLocal: wwm-${type} (And the ${type} folder is found at /public/images/${type}/wwm-uicons/)`,
          )
        }
      }),
    )
    for (let i = 0; i < assets.length; i += 1) {
      const item = assets[i]
      if (item.status === 'fulfilled' && item.value) {
        this[`${type}Backup`][item.value.name] = item.value
      }
    }
    this[type] = Object.values(this[`${type}Backup`])
  }

  /**
   *
   * @param {import('./DbManager').DbManager} [Db] - Database manager instance
   */
  async getInvasions(Db) {
    const endpoint = config.getSafe('api.pogoApiEndpoints.invasions')
    if (endpoint) {
      this.log.info('Fetching Latest Invasions')
      try {
        /** @type {import('@rm/masterfile').Masterfile['invasions']} */
        const newInvasions = await fetch(endpoint).then((res) => res.json())
        if (newInvasions) {
          this.rocketGruntIDs = Object.keys(newInvasions)
            .filter((key) => newInvasions[key].grunt === 'Grunt')
            .map(Number)

          this.rocketLeaderIDs = Object.keys(newInvasions)
            .filter(
              (key) =>
                newInvasions[key].grunt === 'Executive' ||
                newInvasions[key].grunt === 'Giovanni',
            )
            .map(Number)

          this.invasions = newInvasions

          // Update available rocket Pokemon whenever invasions are refreshed
          if (Db) {
            await this.setAvailable('pokestops', 'Pokestop', Db)
          }
        }
      } catch (e) {
        this.log.warn('Unable to generate latest invasions:\n', e)
      }
    }
  }

  /**
   *
   * @param {import("@rm/types").Rarity} historical
   * @param {import("@rm/types").Rarity} dbRarity
   */
  async getMasterfile(historical, dbRarity) {
    this.log.info('Fetching Latest Masterfile')
    try {
      const newMf = await generate(true, historical, dbRarity)
      this.masterfile = newMf ?? this.masterfile
      this.addAllAvailable()
    } catch (e) {
      this.log.warn('Failed to generate latest masterfile:\n', e)
    }
  }

  /** @param {keyof EventManager['available']} category */
  addAvailable(category) {
    this.available[category].forEach((item) => {
      if (!Number.isNaN(parseInt(item.charAt(0)))) {
        const [id, form] = item.split('-')
        const formId = form || '0'
        if (!this.masterfile.pokemon[id]) {
          this.masterfile.pokemon[id] = {
            name: '',
            pokedexId: +id,
            types: [],
            quickMoves: [],
            chargedMoves: [],
            defaultFormId: +formId,
            forms: {},
            genId: 0,
          }
          this.log.warn(`Added ${id} to Pokemon, seems suspicious`)
        }
        if (!this.masterfile.pokemon[id].forms) {
          this.masterfile.pokemon[id].forms = {}
        }
        if (!this.masterfile.pokemon[id].forms[formId]) {
          this.masterfile.pokemon[id].forms[formId] = { name: '*', category }
          this.log.debug(
            `Added ${this.masterfile.pokemon[id].name} Key: ${item} to masterfile. (${category})`,
          )
        }
      }
    })
  }

  addAllAvailable() {
    Object.keys(this.available).forEach(
      (/** @type {keyof EventManager['available']} */ category) =>
        this.addAvailable(category),
    )
  }

  async getWebhooks() {
    const apis = await Promise.allSettled(
      config
        .getSafe('webhooks')
        .filter((x) => x.enabled)
        .map(async (webhook) => {
          const api = new PoracleAPI(webhook)
          await api.init()
          return api
        }),
    )
    for (let i = 0; i < apis.length; i += 1) {
      const item = apis[i]
      if (item.status === 'fulfilled' && item.value) {
        this.webhookObj[item.value.name] = item.value
      }
    }
  }
}

module.exports = { EventManager }
