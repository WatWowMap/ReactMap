/* eslint-disable no-console */
const { promises: fs } = require('fs')
const path = require('path')
const Ohbem = require('ohbem')
const { generate } = require('../../scripts/generateMasterfile')
const fetchJson = require('./api/fetchJson')
const initWebhooks = require('./initWebhooks')

module.exports = class EventManager {
  constructor(masterfile) {
    this.masterfile = masterfile
    this.invasions = masterfile.invasions
    this.available = { gyms: [], pokestops: [], pokemon: [], nests: [] }
    this.uicons = []
    this.baseUrl =
      'https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/'
    this.webhookObj = {}
    this.Clients = {}
  }

  getAvailable(category) {
    return this.available[category]
  }

  async setAvailable(category, model, Db, log) {
    this.available[category] = await Db.getAvailable(model, log)
  }

  set clients(clients) {
    this.Clients = clients
  }

  chatLog(embed, clientName) {
    if (clientName) {
      if (this.Clients[clientName]?.sendMessage)
        this.Clients[clientName].sendMessage(embed, 'event')
    } else {
      Object.values(this.Clients).forEach((client) => {
        if (client?.sendMessage) client.sendMessage(embed, 'event')
      })
    }
  }

  setTimers(config, Db, Pvp) {
    if (!config.api.queryOnSessionInit.raids) {
      setInterval(async () => {
        await this.setAvailable('gyms', 'Gym', Db, true)
        this.chatLog({ description: 'Refreshed available raids' })
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.raids || 1))
    }
    if (!config.api.queryOnSessionInit.nests) {
      setInterval(async () => {
        await this.setAvailable('nests', 'Nest', Db, true)
        this.chatLog({ description: 'Refreshed available nests' })
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.nests || 6))
    }
    if (!config.api.queryOnSessionInit.pokemon) {
      setInterval(async () => {
        await this.setAvailable('pokemon', 'Pokemon', Db, true)
        this.chatLog({ description: 'Refreshed available pokemon' })
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.pokemon || 1))
    }
    if (!config.api.queryOnSessionInit.quests) {
      setInterval(async () => {
        await this.setAvailable('pokestops', 'Pokestop', Db, true)
        this.chatLog({ description: 'Refreshed available quests & invasions' })
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.quests || 3))
    }
    setInterval(async () => {
      await this.getUicons(config.icons.styles)
      this.chatLog({ description: 'Refreshed UICONS indexes' })
    }, 1000 * 60 * 60 * (config.icons.cacheHrs || 3))
    if (config.api.pogoApiEndpoints.invasions) {
      setInterval(async () => {
        await this.getInvasions(config.api.pogoApiEndpoints.invasions)
        this.chatLog({ description: 'Refreshed invasions masterfile' })
      }, 1000 * 60 * 60 * (config.map.invasionCacheHrs || 1))
    }
    setInterval(async () => {
      await Db.historicalRarity()
      this.chatLog({ description: 'Refreshed db historical rarity tiers' })
    }, 1000 * 60 * 60 * (config.api.queryUpdateHours.historicalRarity || 6))
    if (config.api.pogoApiEndpoints.masterfile) {
      setInterval(async () => {
        await this.getMasterfile(Db.historical, Db.rarity)
        this.chatLog({ description: 'Refreshed masterfile' })
      }, 1000 * 60 * 60 * (config.map.masterfileCacheHrs || 6))
    }
    if (Pvp) {
      setInterval(async () => {
        console.log('[EVENT] Fetching Latest PVP Masterfile')
        Pvp.updatePokemonData(await Ohbem.fetchPokemonData())
        this.chatLog({ description: 'Refreshed PVP masterfile' })
      }, 1000 * 60 * 60 * (config.map.masterfileCacheHrs || 6))
    }
    setInterval(async () => {
      await this.getWebhooks(config)
      this.chatLog({ description: 'Refreshed webhook settings' })
    }, 1000 * 60 * 60 * (config.map.webhookCacheHrs || 1))

    const newDate = new Date()
    config.authentication.strategies.forEach((strategy) => {
      if (strategy.enabled) {
        if (strategy.trialPeriod.start.js >= newDate) {
          console.log(
            '[EVENT] Trial period starting in',
            +((strategy.trialPeriod.start.js - newDate) / 1000 / 60).toFixed(2),
            `minutes for ${strategy.name}`,
          )
          setTimeout(async () => {
            await Db.models.Session.clear()
            this.chatLog(
              { description: `Trial period has started.` },
              strategy.name,
            )
          }, strategy.trialPeriod.start.js - newDate)
        }
        if (strategy.trialPeriod.end.js >= newDate) {
          console.log(
            '[EVENT] Trial period ending in',
            +((strategy.trialPeriod.end.js - newDate) / 1000 / 60).toFixed(2),
            `minutes for ${strategy.name}`,
          )
          setTimeout(async () => {
            await Db.models.Session.clear()
            this.chatLog(
              { description: `Trial period has ended.` },
              strategy.name,
            )
          }, strategy.trialPeriod.end.js - newDate)
        }
      }
    })
  }

  async getUicons(styles) {
    console.log('[EVENT] Fetching Latest UICONS')
    if (!styles.some((icon) => icon.path.includes('wwm'))) {
      console.log(
        '[UICONS] Base uicons not found in config (either remotely or locally). This may be fine, but some things might be broken, such as items from the `misc` folder.',
      )
    }
    this.uicons = await Promise.all(
      styles.map(async (style) => {
        try {
          const response = style.path.startsWith('http')
            ? await fetchJson(`${style.path}/index.json`)
            : JSON.parse(
                await fs.readFile(
                  path.resolve(
                    __dirname,
                    `../../../public/images/uicons/${style.path}/index.json`,
                  ),
                ),
              )
          return { ...style, data: response }
        } catch (e) {
          console.warn(
            '[WARN] Failed to generate latest uicons for:',
            style,
            '\n',
            e.message,
          )
          console.warn(
            `[WARN] Make sure the path follows one of these two formats: \n\tRemote: ${this.baseUrl}\n\tLocal: wwm-uicons (And the uicons folder is found at /public/images/uicons/wwm-uicons/)`,
          )
        }
      }),
    )
    this.uicons = this.uicons.filter(Boolean)
  }

  async getInvasions(endpoint) {
    if (endpoint) {
      console.log('[EVENT] Fetching Latest Invasions')
      try {
        const newInvasions = await fetchJson(endpoint)
        if (newInvasions) {
          this.invasions = newInvasions
        }
      } catch (e) {
        console.warn('[WARN] Unable to generate latest invasions:\n', e.message)
      }
    }
  }

  async getMasterfile(historical, dbRarity) {
    console.log('[EVENT] Fetching Latest Masterfile')
    try {
      const newMf = await generate(false, historical, dbRarity)
      this.masterfile = newMf ?? this.masterfile
      this.addAvailable()
    } catch (e) {
      console.warn('[WARN] Failed to generate latest masterfile:\n', e.message)
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
            console.log(`[MF] Added ${id} to Pokemon`)
          }
          if (!this.masterfile.pokemon[id].forms) {
            this.masterfile.pokemon[id].forms = {}
          }
          if (!this.masterfile.pokemon[id].forms[form]) {
            this.masterfile.pokemon[id].forms[form] = { name: '*', category }
            console.log(
              `[MF] Added ${this.masterfile.pokemon[id].name} Key: ${item} to masterfile. (${category})`,
            )
          }
        }
      })
    })
  }

  async getWebhooks(config) {
    await Promise.all(
      config.webhooks.map(async (webhook) => {
        this.webhookObj = {
          ...this.webhookObj,
          [webhook.name]: await initWebhooks(webhook, config),
        }
      }),
    )
  }
}
