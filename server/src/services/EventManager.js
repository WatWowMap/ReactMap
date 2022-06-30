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
  }

  getAvailable(category) {
    return this.available[category]
  }

  async setAvailable(category, model, Db, log) {
    this.available[category] = await Db.getAvailable(model, log)
  }

  setTimers(config, Db, Pvp) {
    if (!config.api.queryOnSessionInit.raids) {
      setInterval(async () => {
        await this.setAvailable('gyms', 'Gym', Db, true)
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.raids || 1))
    }
    if (!config.api.queryOnSessionInit.nests) {
      setInterval(async () => {
        await this.setAvailable('nests', 'Nest', Db, true)
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.nests || 6))
    }
    if (!config.api.queryOnSessionInit.pokemon) {
      setInterval(async () => {
        await this.setAvailable('pokemon', 'Pokemon', Db, true)
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.pokemon || 1))
    }
    if (!config.api.queryOnSessionInit.quests) {
      setInterval(async () => {
        await this.setAvailable('pokestops', 'Pokestop', Db, true)
      }, 1000 * 60 * 60 * (config.api.queryUpdateHours.quests || 3))
    }
    setInterval(async () => {
      await this.getUicons(config.icons.styles)
    }, 1000 * 60 * 60 * (config.icons.cacheHrs || 3))
    setInterval(async () => {
      await this.getInvasions()
    }, 1000 * 60 * 60 * (config.map.invasionCacheHrs || 1))
    setInterval(async () => {
      await this.getMasterfile()
    }, 1000 * 60 * 60 * (config.map.masterfileCacheHrs || 6))
    if (Pvp) {
      setInterval(async () => {
        console.log('[EVENT] Fetching Latest PVP Masterfile')
        Pvp.updatePokemonData(await Ohbem.fetchPokemonData())
      }, 1000 * 60 * 60 * (config.map.masterfileCacheHrs || 6))
    }
    setInterval(async () => {
      await this.getWebhooks(config)
    }, 1000 * 60 * 60 * (config.map.webhookCacheHrs || 1))
  }

  async getUicons(styles) {
    console.log('[EVENT] Fetching Latest UICONS')
    if (!styles.some((icon) => icon.path === this.baseUrl)) {
      styles.push({
        name: 'Base',
        path: this.baseUrl,
        modifiers: {
          gym: {
            0: 1,
            1: 1,
            2: 1,
            3: 3,
            4: 4,
            5: 4,
            6: 18,
            sizeMultiplier: 1.2,
          },
        },
      })
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

  async getInvasions() {
    console.log('[EVENT] Fetching Latest Invasions')
    try {
      this.invasions = await fetchJson(
        'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json',
      ).then((response) =>
        response
          ? Object.fromEntries(
              Object.entries(this.invasions).map(([type, info]) => {
                const latest = response[type]
                const newInvasion = this.invasions[type]
                if (info.encounters) {
                  Object.keys(info.encounters).forEach((position, i) => {
                    if (latest?.active) {
                      newInvasion.encounters[position] = latest.lineup.team[
                        i
                      ].map((pkmn, j) =>
                        pkmn.template === 'UNSET' &&
                        info.encounters[position][j]
                          ? info.encounters[position][j]
                          : { id: pkmn.id, form: pkmn.form },
                      )
                      newInvasion.second_reward =
                        latest.lineup.rewards.length > 1
                    }
                  })
                }
                return [type, newInvasion]
              }),
            )
          : this.invasions,
      )
    } catch (e) {
      console.warn('[WARN] Unable to generate latest invasions:\n', e.message)
    }
  }

  async getMasterfile() {
    console.log('[EVENT] Fetching Latest Masterfile')
    try {
      const newMf = await generate()
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
