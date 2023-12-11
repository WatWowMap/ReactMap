// @ts-check
const { promises: fs } = require('fs')
const path = require('path')
const Ohbem = require('ohbem')
const { default: fetch } = require('node-fetch')
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { generate, read } = require('@rm/masterfile')

const PoracleAPI = require('./api/Poracle')

class EventManager {
  constructor() {
    /** @type {import("@rm/types").Masterfile} */
    this.masterfile = read()
    /** @type {import("@rm/types").Masterfile['invasions'] | {}} */
    this.invasions =
      'invasions' in this.masterfile ? this.masterfile.invasions : {}
    this.available = { gyms: [], pokestops: [], pokemon: [], nests: [] }
    this.uicons = []
    this.uiconsBackup = {}
    this.baseUrl =
      'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main'

    /** @type {Record<string, InstanceType<typeof PoracleAPI>>} */
    this.webhookObj = {}
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
      await this.getUicons(config.getSafe('icons.styles'))
      await this.chatLog({ description: 'Refreshed UICONS indexes' })
    }, 1000 * 60 * 60 * (config.getSafe('icons.cacheHrs') || 3))
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
   */
  async getUicons(styles) {
    log.info(HELPERS.event, 'Fetching Latest UICONS')
    if (!styles.some((icon) => icon.path.includes('wwm'))) {
      log.info(
        HELPERS.event,
        'Base uicons not found in config (either remotely or locally). This may be fine, but some things might be broken, such as items from the `misc` folder.',
      )
    }
    const uicons = await Promise.allSettled(
      styles.map(async (style) => {
        try {
          const response = style.path.startsWith('http')
            ? await fetch(`${style.path}/index.json`).then((res) => res.json())
            : JSON.parse(
                await fs.readFile(
                  path.resolve(
                    __dirname,
                    `../../../public/images/uicons/${style.path}/index.json`,
                  ),
                  'utf-8',
                ),
              )

          return { ...style, data: response }
        } catch (e) {
          log.warn(
            HELPERS.event,
            'Failed to generate latest uicons for:',
            style,
            '\n',
            e,
          )
          log.warn(
            HELPERS.event,
            `Make sure the path follows one of these two formats: \n\tRemote: ${this.baseUrl}\n\tLocal: wwm-uicons (And the uicons folder is found at /public/images/uicons/wwm-uicons/)`,
          )
        }
      }),
    )
    for (let i = 0; i < uicons.length; i += 1) {
      const uicon = uicons[i]
      if (uicon.status === 'fulfilled' && uicon.value) {
        this.uiconsBackup[uicon.value.name] = uicon.value
      }
    }
    this.uicons = Object.values(this.uiconsBackup)
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
    await Promise.all(
      config
        .getSafe('webhooks')
        .filter((x) => x.enabled)
        .map(async (webhook) => {
          const api = new PoracleAPI(webhook)
          await api.init()
          Object.assign(this.webhookObj, {
            [webhook.name]: api,
          })
        }),
    )
  }
}

module.exports = EventManager
