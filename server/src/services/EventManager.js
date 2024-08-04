// @ts-check
const { promises: fs } = require('fs')
const path = require('path')
const Ohbem = require('ohbem')
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const { generate, read } = require('@rm/masterfile')

const PoracleAPI = require('./api/Poracle')
const { getCache } = require('./cache')

/**
 * @typedef {import('./DiscordClient') | import('./TelegramClient') | null} Client
 * @typedef {Record<string, Client>} ClientObject
 */

class EventManager {
  constructor() {
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
    })
    this.uicons = getCache('uicons.json', [])
    this.uaudio = getCache('uaudio.json', [])
    this.uiconsBackup = {}
    this.uaudioBackup = {}

    /** @type {Record<string, NodeJS.Timeout>} */
    this.intervals = {}
    /** @type {Record<string, NodeJS.Timeout>} */
    this.timeouts = {}

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
   * @param {import('./DbCheck')} Db
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
   * @param {import('discord.js').APIEmbed | string} embed
   * @param {string} [clientName]
   * @param {keyof import('./DiscordClient')['loggingChannels']} [channel]
   */
  async chatLog(embed, clientName, channel = 'event') {
    if (clientName) {
      const client = this.authClients[clientName]
      if ('discordEvents' in client && typeof embed === 'object') {
        await client.sendMessage(embed, channel)
      } else if (typeof embed === 'string') {
        await client.sendMessage(embed, channel)
      }
    } else {
      await Promise.allSettled(
        Object.values(this.authClients).map(async (client) => {
          if ('discordEvents' in client && typeof embed === 'object') {
            await client.sendMessage(embed, channel)
          } else if (typeof embed === 'string') {
            await client.sendMessage(embed, channel)
          }
        }),
      )
    }
  }

  clearAll() {
    this.clearIntervals()
    this.clearTimeouts()
  }

  clearIntervals() {
    log.info(HELPERS.event, 'clearing intervals')
    Object.values(this.intervals).forEach((interval) => clearInterval(interval))
  }

  clearTimeouts() {
    log.info(HELPERS.event, 'clearing timeouts')
    Object.values(this.timeouts).forEach((timeout) => clearTimeout(timeout))
  }

  /**
   *
   * @param {import('./DbCheck')} Db
   * @param {import('./PvpWrapper')} Pvp
   */
  startIntervals(Db, Pvp) {
    this.clearIntervals()
    log.info(HELPERS.event, 'starting intervals')

    if (!config.getSafe('api.queryOnSessionInit.raids')) {
      this.intervals.raidUpdate = setInterval(async () => {
        await this.setAvailable('gyms', 'Gym', Db)
        await this.chatLog({ description: 'Refreshed available raids' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.raids') || 1))
    }
    if (!config.getSafe('api.queryOnSessionInit.nests')) {
      this.intervals.nestUpdate = setInterval(async () => {
        await this.setAvailable('nests', 'Nest', Db)
        await this.chatLog({ description: 'Refreshed available nests' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.nests') || 6))
    }
    if (!config.getSafe('api.queryOnSessionInit.pokemon')) {
      this.intervals.pokemonUpdate = setInterval(async () => {
        await this.setAvailable('pokemon', 'Pokemon', Db)
        await this.chatLog({ description: 'Refreshed available pokemon' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.pokemon') || 1))
    }
    if (!config.getSafe('api.queryOnSessionInit.quests')) {
      this.intervals.questUpdate = setInterval(async () => {
        await this.setAvailable('pokestops', 'Pokestop', Db)
        await this.chatLog({
          description: 'Refreshed available quests & invasions',
        })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.quests') || 3))
    }
    this.intervals.uicons = setInterval(async () => {
      await this.getUniversalAssets('uicons')
      await this.chatLog({ description: 'Refreshed UICONS indexes' })
    }, 1000 * 60 * 60 * (config.getSafe('icons.cacheHrs') || 3))
    this.intervals.uaudio = setInterval(async () => {
      await this.getUniversalAssets('uaudio')
      await this.chatLog({ description: 'Refreshed UAUDIO indexes' })
    }, 1000 * 60 * 60 * (config.getSafe('audio.cacheHrs') || 3))
    if (config.getSafe('api.pogoApiEndpoints.invasions')) {
      this.intervals.invasions = setInterval(async () => {
        await this.getInvasions()
        await this.chatLog({ description: 'Refreshed invasions' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.invasionCacheHrs') || 1))
    }
    this.intervals.historical = setInterval(async () => {
      await Db.historicalRarity()
      await this.chatLog({
        description: 'Refreshed db historical rarity tiers',
      })
    }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.historicalRarity') || 6))
    if (config.getSafe('api.pogoApiEndpoints.masterfile')) {
      this.intervals.masterfile = setInterval(async () => {
        await this.getMasterfile(Db.historical, Db.rarity)
        await this.chatLog({ description: 'Refreshed masterfile' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6))
    }
    if (Pvp) {
      this.intervals.pvp = setInterval(async () => {
        Pvp.updatePokemonData(await Ohbem.fetchPokemonData())
        await this.chatLog({ description: 'Refreshed PVP masterfile' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6))
    }
    this.intervals.webhooks = setInterval(async () => {
      await this.getWebhooks()
      await this.chatLog({ description: 'Refreshed webhook settings' })
    }, 1000 * 60 * 60 * (config.getSafe('map.misc.webhookCacheHrs') || 1))

    this.intervals.filterCxt = setInterval(async () => {
      await Db.getFilterContext()
      await this.chatLog({ description: 'Updated filter contexts' })
    }, 1000 * 60 * 30)
  }

  /**
   *
   * @param {import('./DbCheck')} Db
   */
  loadTrial(Db) {
    this.clearTimeouts()
    log.info(HELPERS.event, 'setting up trials if any are scheduled')
    const newDate = new Date()
    config.getSafe('authentication.strategies').forEach((strategy) => {
      if (strategy.enabled) {
        if (strategy.trialPeriod.start.js >= newDate) {
          log.info(
            HELPERS.event,
            'Trial period starting in',
            +(
              (strategy.trialPeriod.start.js.getTime() - newDate.getTime()) /
              1000 /
              60
            ).toFixed(2),
            `minutes for ${strategy.name}`,
          )
          this.timeouts.startTrial = setTimeout(async () => {
            await Db.models.Session.clear()
            this.chatLog(
              { description: `Trial period has started.` },
              strategy.name,
            )
          }, strategy.trialPeriod.start.js.getTime() - newDate.getTime())
        }
        if (strategy.trialPeriod.end.js >= newDate) {
          log.info(
            HELPERS.event,
            'Trial period ending in',
            +(
              (strategy.trialPeriod.end.js.getTime() - newDate.getTime()) /
              1000 /
              60
            ).toFixed(2),
            `minutes for ${strategy.name}`,
          )
          this.timeouts.endTrial = setTimeout(async () => {
            await Db.models.Session.clear()
            this.chatLog(
              { description: `Trial period has ended.` },
              strategy.name,
            )
          }, strategy.trialPeriod.end.js.getTime() - newDate.getTime())
        }
      }
    })
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
    log.info(HELPERS.event, 'Fetching Latest', type.toUpperCase())
    if (!styles.some((icon) => icon.path.includes('wwm'))) {
      log.info(
        HELPERS.event,
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
          log.warn(
            HELPERS.event,
            `Failed to generate latest ${type} for:`,
            style,
            '\n',
            e,
          )
          log.warn(
            HELPERS.event,
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

  async getInvasions() {
    const endpoint = config.getSafe('api.pogoApiEndpoints.invasions')
    if (endpoint) {
      log.info(HELPERS.event, 'Fetching Latest Invasions')
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
        }
      } catch (e) {
        log.warn(HELPERS.event, 'Unable to generate latest invasions:\n', e)
      }
    }
  }

  /**
   *
   * @param {import("@rm/types").Rarity} historical
   * @param {import("@rm/types").Rarity} dbRarity
   */
  async getMasterfile(historical, dbRarity) {
    log.info(HELPERS.event, 'Fetching Latest Masterfile')
    try {
      const newMf = await generate(true, historical, dbRarity)
      this.masterfile = newMf ?? this.masterfile
      this.addAllAvailable()
    } catch (e) {
      log.warn(HELPERS.event, 'Failed to generate latest masterfile:\n', e)
    }
  }

  /** @param {keyof EventManager['available']} category */
  addAvailable(category) {
    this.available[category].forEach((item) => {
      if (!Number.isNaN(parseInt(item.charAt(0)))) {
        const [id, form] = item.split('-')
        if (!this.masterfile.pokemon[id]) {
          this.masterfile.pokemon[id] = {
            name: '',
            pokedexId: +id,
            types: [],
            quickMoves: [],
            chargedMoves: [],
            defaultFormId: +form,
            forms: {},
            genId: 0,
          }
          log.warn(HELPERS.event, `Added ${id} to Pokemon, seems suspicious`)
        }
        if (!this.masterfile.pokemon[id].forms) {
          this.masterfile.pokemon[id].forms = {}
        }
        if (!this.masterfile.pokemon[id].forms[form]) {
          this.masterfile.pokemon[id].forms[form] = { name: '*', category }
          log.info(
            HELPERS.event,
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

module.exports = EventManager
