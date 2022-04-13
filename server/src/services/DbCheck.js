/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
const knex = require('knex')
const { raw } = require('objection')

module.exports = class DbCheck {
  constructor(validModels, dbSettings, queryDebug, apiSettings) {
    this.validModels = validModels.flatMap(s => s.useFor)
    this.singleModels = ['User', 'Badge', 'Session']
    this.searchLimit = apiSettings.searchLimit
    this.models = {}
    this.connections = dbSettings.schemas
      .filter(s => s.useFor.length)
      .map((schema, i) => {
        schema.useFor.forEach(category => {
          const capital = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
          if (!this.models[capital]) {
            this.models[capital] = []
          }
          this.models[capital].push({ connection: i, isMad: false })
        })
        return knex({
          client: 'mysql2',
          connection: {
            host: schema.host,
            port: schema.port,
            user: schema.username,
            password: schema.password,
            database: schema.database,
          },
          debug: queryDebug,
          pool: {
            max: dbSettings.settings.maxConnections,
            afterCreate(conn, done) {
              conn.query('SET time_zone="+00:00";', (err) => done(err, conn))
            },
          },
        })
      });
    (async () => {
      await this.determineType()
      await this.pvp()
      await this.pokestopChecks()
    })()
  }

  static async isMadDb(connection) {
    try {
      await connection('trs_quest').limit(1).first()
      return true
    } catch (e) {
      return false
    }
  }

  static getDistance(args, isMad) {
    return raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')
  }

  async determineType() {
    console.log('[DB] Determining database types..')
    await Promise.all(this.connections.map(async (schema, i) => {
      const isMad = await DbCheck.isMadDb(schema)
      Object.entries(this.models).forEach(([category, sources]) => {
        try {
          sources.forEach((source, j) => {
            if (source.connection === i) {
              this.models[category][j].isMad = isMad
            }
          })
        } catch (e) {
          console.log(e.message)
        }
      })
    }))
  }

  bindConnections(models) {
    try {
      Object.entries(this.models).forEach(([model, sources]) => {
        if (this.singleModels.includes(model)) {
          if (sources.length > 1) {
            console.error(`[DB] ${model} only supports one database connection`)
            process.exit(0)
          }
          if (model === 'User') {
            models.Badge.knex(this.connections[sources[0].connection])
          }
          models[model].knex(this.connections[sources[0].connection])
        } else {
          sources.forEach((source, i) => {
            this.models[model][i].SubModel = models[model].bindKnex(this.connections[source.connection])
          })
        }
        console.log(`[DB] Bound ${model} to ${sources.length} connections`)
      })
    } catch (e) {
      console.error(`
  Error: ${e.message}

  Info: Only ${[this.validModels].join(', ')} are valid options in the useFor arrays
  `)
      process.exit(9)
    }
  }

  static deDupeResults(results) {
    if (results.length === 1) return results[0]
    if (results.length > 1) {
      const returnObj = {}
      for (let i = 0; i < results.length; i += 1) {
        for (let j = 0; j < results[i].length; j += 1) {
          returnObj[results[i][j].id] = results[i][j]
        }
      }
      return Object.values(returnObj)
    }
    return []
  }

  async pvp() {
    await Promise.all(this.models.Pokemon.map(async (source) => {
      try {
        await source.SubModel.query()
          .whereNotNull('pvp')
          .limit(1)
        source.pvpV2 = true
      } catch (_) {
        source.pvpV2 = false
      }
    }))
  }

  async pokestopChecks() {
    await Promise.all(this.models.Pokestop.map(async (source) => {
      try {
        if (!source.isMad) {
          await source.SubModel.query()
            .whereNotNull('quest_reward_amount')
            .limit(1)
        }
        source.hasRewardAmount = true
      } catch (_) {
        source.hasRewardAmount = false
      }
      try {
        await source.SubModel.query()
          .whereNotNull('alternative_quest_type')
          .limit(1)
        source.hasAltQuests = true
      } catch (_) {
        source.hasAltQuests = false
      }
      try {
        await source.SubModel.query()
          .join('incident', 'pokestop.id', 'incident.pokestop_id')
          .limit(1)
        source.hasMultiInvasions = true
      } catch (_) {
        source.hasMultiInvasions = false
      }
      try {
        await source.SubModel.query()
          .join('incident', 'pokestop.id', 'incident.pokestop_id')
          .select('expiration_ms')
          .limit(1)
        source.multiInvasionMs = true
      } catch (_) {
        source.multiInvasionMs = false
      }
    }))
  }

  async getAll(model, perms, args, userId, method = 'getAll') {
    const data = await Promise.all(this.models[model].map(async (source) => (
      source.SubModel[method](perms, args, source, userId)
    )))
    return DbCheck.deDupeResults(data)
  }

  async getOne(model, id, method = 'getOne') {
    const sources = this.models[model]
    let foundObj
    let source = 0
    while (!foundObj && source < sources.length) {
      const found = await sources[source].SubModel[method](id, sources[source])
      foundObj = found
      source += 1
    }
    return foundObj || {}
  }

  async search(model, perms, args, method = 'search') {
    const data = await Promise.all(this.models[model].map(async (source) => (
      source.SubModel[method](perms, args, source, DbCheck.getDistance(args, source.isMad))
    )))
    const deDuped = DbCheck.deDupeResults(data).sort((a, b) => a.distance - b.distance)
    if (deDuped.length > this.searchLimit) {
      deDuped.length = this.searchLimit
    }
    return deDuped
  }

  async submissionCells(args) {
    const stopData = await Promise.all(this.models.Pokestop.map(async (source) => (
      source.SubModel.getSubmissions(args, source)
    )))
    const gymData = await Promise.all(this.models.Gym.map(async (source) => (
      source.SubModel.getSubmissions(args, source)
    )))
    return [DbCheck.deDupeResults(stopData), DbCheck.deDupeResults(gymData)]
  }

  async getAvailable(model) {
    if (this.models[model]) {
      try {
        const results = await Promise.all(this.models[model].map(async (source) => (
          source.SubModel.getAvailable(source)
        )))
        if (results.length === 1) return results[0]
        if (results.length > 1) {
          const returnSet = new Set()
          for (let i = 0; i < results.length; i += 1) {
            for (let j = 0; j < results[i].length; j += 1) {
              returnSet.add(results[i][j])
            }
          }
          return [...returnSet]
        }
      } catch (e) {
        console.warn('Unable to query available for:', model, '\n', e.message)
        return []
      }
    }
    return []
  }
}
