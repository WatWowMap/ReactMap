/* eslint-disable no-console */
const knex = require('knex')
const { raw } = require('objection')
const extend = require('extend')

module.exports = class DbCheck {
  constructor(
    validModels,
    dbSettings,
    queryDebug,
    apiSettings,
    distanceUnit,
    rarityPercents,
  ) {
    this.validModels = validModels.flatMap((s) => s.useFor)
    this.singleModels = ['User', 'Badge', 'Session', 'Backup']
    this.searchLimit = apiSettings.searchLimit
    this.rarityPercents = rarityPercents
    this.models = {}
    this.questConditions = {}
    this.memEndpoints = {}
    this.rarity = new Map()
    this.historical = new Map()
    this.connections = dbSettings.schemas
      .filter((s) => s.useFor.length)
      .map((schema, i) => {
        schema.useFor.forEach((category) => {
          const capital = `${category.charAt(0).toUpperCase()}${category.slice(
            1,
          )}`
          if (this.singleModels.includes(capital)) {
            this.models[capital] = { connection: i }
          } else {
            if (!this.models[capital]) {
              this.models[capital] = []
            }
            this.models[capital].push({ connection: i })
          }
        })
        if (schema.pokemon) {
          this.memEndpoints[i] = schema.pokemon
        }
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
    this.distanceUnit = distanceUnit
  }

  static getDistance(args, isMad, distanceUnit) {
    return raw(
      `ROUND(( ${
        distanceUnit === 'mi' ? '3959' : '6371'
      } * acos( cos( radians(${args.lat}) ) * cos( radians( ${
        isMad ? 'latitude' : 'lat'
      } ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${
        args.lon
      }) ) + sin( radians(${args.lat}) ) * sin( radians( ${
        isMad ? 'latitude' : 'lat'
      } ) ) ) ),2)`,
    ).as('distance')
  }

  async determineType() {
    console.log(
      `[DB] Determining database types for ${
        this.connections.length
      } connection${this.connections.length > 1 ? 's' : ''}`,
    )
    await Promise.all(
      this.connections.map(async (schema, i) => {
        try {
          const [isMad, pvpV2, mem, hasSize, hasHeight] = await schema(
            'pokemon',
          )
            .columnInfo()
            .then((columns) => [
              'cp_multiplier' in columns,
              'pvp' in columns,
              this.memEndpoints[i] || '',
              'size' in columns,
              'height' in columns,
            ])
          const [hasRewardAmount, hasPowerUp, hasAltQuests] = await schema(
            'pokestop',
          )
            .columnInfo()
            .then((columns) => [
              'quest_reward_amount' in columns || isMad,
              'power_up_level' in columns,
              'alternative_quest_type' in columns,
            ])
          const [hasLayerColumn] = isMad
            ? await schema('trs_quest')
                .columnInfo()
                .then((columns) => ['layer' in columns])
            : [false]
          const [hasMultiInvasions, multiInvasionMs, hasConfirmed] =
            await schema(isMad ? 'pokestop_incident' : 'incident')
              .columnInfo()
              .then((columns) => [
                (isMad ? 'character_display' : 'character') in columns,
                'expiration_ms' in columns,
                'confirmed' in columns,
              ])
          const [availableSlotsCol] = await schema('gym')
            .columnInfo()
            .then((columns) => [
              'availble_slots' in columns
                ? 'availble_slots'
                : 'available_slots',
            ])
          const [polygon] = await schema('nests')
            .columnInfo()
            .then((columns) => ['polygon' in columns])

          Object.entries(this.models).forEach(([category, sources]) => {
            if (Array.isArray(sources)) {
              sources.forEach((source, j) => {
                if (source.connection === i) {
                  this.models[category][j].isMad = isMad
                  this.models[category][j].pvpV2 = pvpV2
                  this.models[category][j].mem = mem
                  this.models[category][j].hasSize = hasSize
                  this.models[category][j].hasHeight = hasHeight
                  this.models[category][j].hasRewardAmount = hasRewardAmount
                  this.models[category][j].hasPowerUp = hasPowerUp
                  this.models[category][j].hasAltQuests = hasAltQuests
                  this.models[category][j].hasMultiInvasions = hasMultiInvasions
                  this.models[category][j].multiInvasionMs = multiInvasionMs
                  this.models[category][j].availableSlotsCol = availableSlotsCol
                  this.models[category][j].hasLayerColumn = hasLayerColumn
                  this.models[category][j].polygon = polygon
                  this.models[category][j].hasConfirmed = hasConfirmed
                }
              })
            }
          })
        } catch (e) {
          console.error('[DB]', e.message)
        }
      }),
    )
  }

  setRarity(results, historical = false) {
    const base = {}
    const mapKey = historical ? 'historical' : 'rarity'
    let total = 0
    results.forEach((result) => {
      Object.entries(historical ? result : result.rarity).forEach(
        ([key, count]) => {
          if (key in base) {
            base[key] += count
          } else {
            base[key] = count
          }
          total += count
        },
      )
    })
    Object.entries(base).forEach(([id, count]) => {
      const percent = (count / total) * 100
      if (percent === 0) {
        this[mapKey].set(id, 'never')
      } else if (percent < this.rarityPercents.ultraRare) {
        this[mapKey].set(id, 'ultraRare')
      } else if (percent < this.rarityPercents.rare) {
        this[mapKey].set(id, 'rare')
      } else if (percent < this.rarityPercents.uncommon) {
        this[mapKey].set(id, 'uncommon')
      } else {
        this[mapKey].set(id, 'common')
      }
    })
  }

  async historicalRarity() {
    console.log('[DB] Setting historical rarity stats')
    try {
      const results = await Promise.all(
        (this.models.Pokemon ?? []).map(async (source) =>
          source.isMad || source.mem
            ? []
            : source.SubModel.query()
                .select('pokemon_id', raw('SUM(count) as total'))
                .from('pokemon_stats')
                .groupBy('pokemon_id'),
        ),
      )
      this.setRarity(
        results.map((result) =>
          Object.fromEntries(
            result.map((pkmn) => [`${pkmn.pokemon_id}`, +pkmn.total]),
          ),
        ),
        true,
      )
    } catch (e) {
      console.error('[DB] Failed to set historical rarity stats', e)
    }
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
            this.models.Badge = models.Badge
            this.models.Badge.knex(this.connections[sources.connection])
            this.models.Backup = models.Backup
            this.models.Backup.knex(this.connections[sources.connection])
          }
          this.models[model] = models[model]
          this.models[model].knex(this.connections[sources.connection])
        } else {
          sources.forEach((source, i) => {
            this.models[model][i].SubModel = models[model].bindKnex(
              this.connections[source.connection],
            )
          })
        }
        console.log(
          `[DB] Bound ${model} to ${sources.length ?? 1} connection${
            sources.length > 1 ? 's' : ''
          }`,
        )
      })
    } catch (e) {
      console.error(`
  Error: ${e.message}

  Info: Only ${[this.validModels].join(
    ', ',
  )} are valid options in the useFor arrays
  `)
      process.exit(9)
    }
  }

  static deDupeResults(results) {
    if (results.length === 1) return results[0]
    if (results.length > 1) {
      const returnObj = new Map()
      const { length } = results
      for (let i = 0; i < length; i += 1) {
        const { length: subLength } = results[i]
        for (let j = 0; j < subLength; j += 1) {
          const item = results[i][j]
          if (
            !returnObj.has(item.id) ||
            item.updated > returnObj.get(item.id).updated
          ) {
            returnObj.set(item.id, item)
          }
        }
      }
      return returnObj.values()
    }
    return []
  }

  async getAll(model, perms, args, userId, method = 'getAll') {
    const data = await Promise.all(
      this.models[model].map(async (source) =>
        source.SubModel[method](perms, args, source, userId),
      ),
    )
    return DbCheck.deDupeResults(data)
  }

  async getOne(model, id, method = 'getOne') {
    const data = await Promise.all(
      this.models[model].map(async (source) =>
        source.SubModel[method](id, source),
      ),
    )
    const cleaned = DbCheck.deDupeResults(data.filter(Boolean))
    return (Array.isArray(cleaned) ? cleaned[0] : cleaned) || {}
  }

  async search(model, perms, args, method = 'search') {
    const data = await Promise.all(
      this.models[model].map(async (source) =>
        source.SubModel[method](
          perms,
          args,
          source,
          DbCheck.getDistance(args, source.isMad, this.distanceUnit),
        ),
      ),
    )
    const deDuped = [...DbCheck.deDupeResults(data)].sort(
      (a, b) => a.distance - b.distance,
    )
    if (deDuped.length > this.searchLimit) {
      deDuped.length = this.searchLimit
    }
    return deDuped
  }

  async submissionCells(perms, args) {
    const stopData = await Promise.all(
      this.models.Pokestop.map(async (source) =>
        source.SubModel.getSubmissions(perms, args, source),
      ),
    )
    const gymData = await Promise.all(
      this.models.Gym.map(async (source) =>
        source.SubModel.getSubmissions(perms, args, source),
      ),
    )
    return [
      [...DbCheck.deDupeResults(stopData)],
      [...DbCheck.deDupeResults(gymData)],
    ]
  }

  async getAvailable(model, log = true) {
    if (this.models[model]) {
      if (log) console.log(`[DB] Querying available for ${model}`)
      try {
        const results = await Promise.all(
          this.models[model].map(async (source) =>
            source.SubModel.getAvailable(source),
          ),
        )
        if (log) console.log(`[DB] Setting available for ${model}`)
        if (model === 'Pokestop') {
          results.forEach((result) => {
            if ('conditions' in result) {
              this.questConditions = extend(
                true,
                this.questConditions,
                result.conditions,
              )
            }
          })
          this.questConditions = Object.fromEntries(
            Object.entries(this.questConditions).map(([key, titles]) => [
              key,
              Object.values(titles),
            ]),
          )
        }
        if (model === 'Pokemon') {
          this.setRarity(results, false)
        }
        if (results.length === 1) return results[0].available
        if (results.length > 1) {
          const returnSet = new Set()
          for (let i = 0; i < results.length; i += 1) {
            for (let j = 0; j < results[i].available.length; j += 1) {
              returnSet.add(results[i].available[j])
            }
          }
          return [...returnSet]
        }
      } catch (e) {
        console.warn(
          '[WARN] Unable to query available for:',
          model,
          '\n',
          e.message,
        )
        if (model === 'Nest') {
          console.warn(
            '[WARN] This is likely due to "nest" being in a useFor array but not in the database',
          )
        }
        return []
      }
    }
    return []
  }
}
