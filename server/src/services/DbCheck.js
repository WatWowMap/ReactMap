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
          this.models[capital].push({ connection: i })
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
      })
  }

  static getDistance(args, isMad) {
    return raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')
  }

  async determineType() {
    console.log(`[DB] Determining database types for ${this.connections.length} connection${this.connections.length > 1 ? 's' : ''}`)
    await Promise.all(this.connections.map(async (schema, i) => {
      try {
        const isMad = await schema('trs_quest').columnInfo().then(col => Object.keys(col).length > 0)
        const pvpV2 = await schema('pokemon').columnInfo().then(col => 'pvp' in col)
        const [hasRewardAmount, hasAltQuests] = await schema('pokestop').columnInfo()
          .then(columns => ([
            ['quest_reward_amount', 'item_reward_amount'].some(c => c in columns),
            'alternative_quest_type' in columns,
          ]))
        const [hasMultiInvasions, multiInvasionMs] = await schema('incident').columnInfo()
          .then(columns => ([
            'character' in columns,
            'expiration_ms' in columns,
          ]))
        Object.entries(this.models).forEach(([category, sources]) => {
          sources.forEach((source, j) => {
            if (source.connection === i) {
              this.models[category][j].isMad = isMad
              this.models[category][j].pvpV2 = pvpV2
              this.models[category][j].hasRewardAmount = hasRewardAmount
              this.models[category][j].hasAltQuests = hasAltQuests
              this.models[category][j].hasMultiInvasions = hasMultiInvasions
              this.models[category][j].multiInvasionMs = multiInvasionMs
            }
          })
        })
      } catch (e) {
        console.error('[DB]', e.message)
      }
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
        console.log(`[DB] Bound ${model} to ${sources.length} connection${sources.length > 1 ? 's' : ''}`)
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

  async getAll(model, perms, args, userId, method = 'getAll') {
    const data = await Promise.all(this.models[model].map(async (source) => (
      source.SubModel[method](perms, args, source, userId)
    )))
    return DbCheck.deDupeResults(data)
  }

  async getOne(model, id, method = 'getOne') {
    const data = await Promise.all(this.models[model].map(async (source) => (
      source.SubModel[method](id, source)
    )))
    const cleaned = DbCheck.deDupeResults(data.filter(Boolean))
    return (Array.isArray(cleaned) ? cleaned[0] : cleaned) || {}
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
      console.log(`[DB] Querying available for ${model}`)
      try {
        const results = await Promise.all(this.models[model].map(async (source) => (
          source.SubModel.getAvailable(source)
        )))
        console.log(`[DB] Setting available for ${model}`)
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
        console.warn('[WARN] Unable to query available for:', model, '\n', e.message)
        if (model === 'Nest') console.warn('[WARN] This is likely due to "nest" being in a useFor array but not in the database')
        return []
      }
    }
    return []
  }
}
