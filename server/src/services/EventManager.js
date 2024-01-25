// @ts-check
const { promises: fs } = require('fs')
const path = require('path')
const Ohbem = require('ohbem')
const { default: fetch } = require('node-fetch')
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { generate, read } = require('@rm/masterfile')

const PoracleAPI = require('./api/Poracle')
const { getCache, setCache } = require('./cache')

class EventManager {
  constructor() {
    /** @type {import("@rm/types").Masterfile} */
    this.masterfile = read()
    /** @type {import("@rm/types").Masterfile['invasions'] | {}} */
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
    /** @type {import('./Clients').ClientObject} */
    this.Clients = {}
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
    await setCache('available.json', this.available)
  }

  /**
   * @param {import('./Clients').ClientObject} clients
   */
  set clients(clients) {
    this.Clients = clients
  }

  /**
   *
   * @param {import('discord.js').APIEmbed} embed
   * @param {string} [clientName]
   */
  async chatLog(embed, clientName) {
    if (clientName) {
      const client = this.Clients[clientName]
      if ('sendMessage' in client) {
        await client.sendMessage(embed, 'event')
      }
    } else {
      await Promise.allSettled(
        Object.values(this.Clients).map(async (client) => {
          if ('sendMessage' in client) {
            await client.sendMessage(embed, 'event')
          }
        }),
      )
    }
  }

  /**
   *
   * @param {import('./DbCheck')} Db
   * @param {import('./PvpWrapper')} Pvp
   */
  setTimers(Db, Pvp) {
    if (!config.getSafe('api.queryOnSessionInit.raids')) {
      setInterval(async () => {
        await this.setAvailable('gyms', 'Gym', Db)
        await this.chatLog({ description: 'Refreshed available raids' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.raids') || 1))
    }
    if (!config.getSafe('api.queryOnSessionInit.nests')) {
      setInterval(async () => {
        await this.setAvailable('nests', 'Nest', Db)
        await this.chatLog({ description: 'Refreshed available nests' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.nests') || 6))
    }
    if (!config.getSafe('api.queryOnSessionInit.pokemon')) {
      setInterval(async () => {
        await this.setAvailable('pokemon', 'Pokemon', Db)
        await this.chatLog({ description: 'Refreshed available pokemon' })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.pokemon') || 1))
    }
    if (!config.getSafe('api.queryOnSessionInit.quests')) {
      setInterval(async () => {
        await this.setAvailable('pokestops', 'Pokestop', Db)
        await this.chatLog({
          description: 'Refreshed available quests & invasions',
        })
      }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.quests') || 3))
    }
    setInterval(async () => {
      await this.getUniversalAssets(config.getSafe('icons.styles'), 'uicons')
      await this.chatLog({ description: 'Refreshed UICONS indexes' })
    }, 1000 * 60 * 60 * (config.getSafe('icons.cacheHrs') || 3))
    setInterval(async () => {
      await this.getUniversalAssets(config.getSafe('audio.styles'), 'uaudio')
      await this.chatLog({ description: 'Refreshed UAUDIO indexes' })
    }, 1000 * 60 * 60 * (config.getSafe('audio.cacheHrs') || 3))
    if (config.getSafe('api.pogoApiEndpoints.invasions')) {
      setInterval(async () => {
        await this.getInvasions(
          config.getSafe('api.pogoApiEndpoints.invasions'),
        )
        await this.chatLog({ description: 'Refreshed invasions masterfile' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.invasionCacheHrs') || 1))
    }
    setInterval(async () => {
      await Db.historicalRarity()
      await this.chatLog({
        description: 'Refreshed db historical rarity tiers',
      })
    }, 1000 * 60 * 60 * (config.getSafe('api.queryUpdateHours.historicalRarity') || 6))
    if (config.getSafe('api.pogoApiEndpoints.masterfile')) {
      setInterval(async () => {
        await this.getMasterfile(Db.historical, Db.rarity)
        await this.chatLog({ description: 'Refreshed masterfile' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6))
    }
    if (Pvp) {
      setInterval(async () => {
        log.info(HELPERS.event, 'Fetching Latest PVP Masterfile')
        Pvp.updatePokemonData(await Ohbem.fetchPokemonData())
        await this.chatLog({ description: 'Refreshed PVP masterfile' })
      }, 1000 * 60 * 60 * (config.getSafe('map.misc.masterfileCacheHrs') || 6))
    }
    setInterval(async () => {
      await this.getWebhooks()
      await this.chatLog({ description: 'Refreshed webhook settings' })
    }, 1000 * 60 * 60 * (config.getSafe('map.misc.webhookCacheHrs') || 1))

    setInterval(async () => {
      await Db.getFilterContext()
      await this.chatLog({ description: 'Updated filter contexts' })
    }, 1000 * 60 * 30)

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
          setTimeout(async () => {
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
          setTimeout(async () => {
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
   * @param {import("@rm/types").Config['icons']['styles']} styles
   * @param {'uicons' | 'uaudio'} type
   */
  async getUniversalAssets(styles, type) {
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
    await setCache(`${type}.json`, this[type])
  }

  /**
   *
   * @param {import("@rm/types").Config['api']['pogoApiEndpoints']['invasions']} endpoint
   */
  async getInvasions(endpoint) {
    if (endpoint) {
      log.info(HELPERS.event, 'Fetching Latest Invasions')
      try {
        const newInvasions = await fetch(endpoint).then((res) => res.json())
        if (newInvasions) {
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
      const newMf = await generate(false, historical, dbRarity)
      this.masterfile = newMf ?? this.masterfile
      this.addAvailable()
    } catch (e) {
      log.warn(HELPERS.event, 'Failed to generate latest masterfile:\n', e)
    }
  }

  addAvailable() {
    Object.entries(this.available).forEach(([category, entries]) => {
      entries.forEach((item) => {
        if (!Number.isNaN(parseInt(item.charAt(0)))) {
          const [id, form] = item.split('-')
          if (!this.masterfile.pokemon[id]) {
            this.masterfile.pokemon[id] = {
              pokedexId: +id,
              types: [],
              quickMoves: [],
              chargeMoves: [],
            }
            log.info(HELPERS.event, `Added ${id} to Pokemon`)
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
    })
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
