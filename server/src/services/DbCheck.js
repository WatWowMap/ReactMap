/* eslint-disable no-await-in-loop */
const { knex } = require('knex')
const { raw } = require('objection')
const extend = require('extend')
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { getBboxFromCenter } = require('./functions/getBbox')

const softLimit = config.getSafe('api.searchSoftKmLimit')
const hardLimit = config.getSafe('api.searchHardKmLimit')

/**
 * @type {import("@rm/types").DbCheckClass}
 */
module.exports = class DbCheck {
  constructor() {
    this.validModels = /** @type {const} */ ([
      'Device',
      'Gym',
      'Nest',
      'Pokestop',
      'Pokemon',
      'Portal',
      'Route',
      'ScanCell',
      'Spawnpoint',
      'Weather',
    ])
    this.singleModels = /** @type {const} */ ([
      'Backup',
      'Badge',
      'NestSubmission',
      'Session',
      'User',
    ])
    this.searchLimit = config.getSafe('api.searchResultsLimit')
    this.rarityPercents = config.getSafe('rarity.percents')
    this.models = {}
    this.questConditions = {}
    this.endpoints = {}
    this.rarity = {}
    this.historical = {}
    this.filterContext = {
      Route: { maxDistance: 0, maxDuration: 0 },
    }
    this.reactMapDb = null
    this.connections = config
      .getSafe('database.schemas')
      .filter((s) => s.useFor.length)
      .map((schema, i) => {
        schema.useFor.forEach((category) => {
          /** @type {import('../models').ModelKeys} */
          const capital = `${category.charAt(0).toUpperCase()}${category.slice(
            1,
          )}`
          if (this.singleModels.includes(capital)) {
            this.models[capital] = {}
            if (capital === 'User') {
              this.reactMapDb = i
            }
          } else {
            if (!this.models[capital]) {
              this.models[capital] = []
            }
            this.models[capital].push({ connection: i })
          }
        })
        if ('endpoint' in schema) {
          this.endpoints[i] = schema
          return null
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
          debug: config.getSafe('devOptions.queryDebug'),
          pool: {
            min: 0,
            max: config.getSafe('database.settings.maxConnections'),
            afterCreate: (conn, done) =>
              conn.query('SET time_zone="+00:00";', (err) => done(err, conn)),
          },
          log: {
            warn: (message) => log.warn(HELPERS.knex, message),
            error: (message) => log.error(HELPERS.knex, message),
            debug: (message) =>
              log[config.getSafe('devOptions.queryDebug') ? 'info' : 'debug'](
                HELPERS.knex,
                message,
              ),
            enableColors: true,
          },
        })
      })
    if (this.reactMapDb === null) {
      log.error(
        HELPERS.db,
        'No database connection was found for the User model',
      )
      process.exit(0)
    }
    this.distanceUnit = config.getSafe('map.misc.distanceUnit')
  }

  /**
   * @param {{ lat: number, lon: number }} args
   * @param {boolean} isMad
   * @returns {ReturnType<typeof raw>}
   */
  getDistance(args, isMad) {
    const radLat = args.lat * (Math.PI / 180)
    const radLon = args.lon * (Math.PI / 180)
    return raw(
      `ROUND(( ${
        this.distanceUnit === 'mi' ? '3959' : '6371'
      } * acos( cos( ${radLat} ) * cos( radians( ${
        isMad ? 'latitude' : 'lat'
      } ) ) * cos( radians( ${
        isMad ? 'longitude' : 'lon'
      } ) - ${radLon} ) + sin( ${radLat} ) * sin( radians( ${
        isMad ? 'latitude' : 'lat'
      } ) ) ) ), 2)`,
    ).as('distance')
  }

  /**
   * @param {import('knex').Knex} schema
   * @returns {Promise<import("@rm/types").DbContext>}
   */
  static async schemaCheck(schema) {
    const [isMad, pvpV2, hasSize, hasHeight] = await schema('pokemon')
      .columnInfo()
      .then((columns) => [
        'cp_multiplier' in columns,
        'pvp' in columns,
        'size' in columns,
        'height' in columns,
      ])
    const [
      hasRewardAmount,
      hasPowerUp,
      hasAltQuests,
      hasShowcaseData,
      hasShowcaseForm,
      hasShowcaseType,
    ] = await schema('pokestop')
      .columnInfo()
      .then((columns) => [
        'quest_reward_amount' in columns || isMad,
        'power_up_level' in columns,
        'alternative_quest_type' in columns,
        'showcase_pokemon_id' in columns,
        'showcase_pokemon_form_id' in columns,
        'showcase_pokemon_type_id' in columns,
      ])
    const [hasLayerColumn] = isMad
      ? await schema('trs_quest')
          .columnInfo()
          .then((columns) => ['layer' in columns])
      : [false]
    const [hasMultiInvasions, multiInvasionMs, hasConfirmed] = await schema(
      isMad ? 'pokestop_incident' : 'incident',
    )
      .columnInfo()
      .then((columns) => [
        (isMad ? 'character_display' : 'character') in columns,
        'expiration_ms' in columns,
        'confirmed' in columns,
      ])
    /** @type {[string, boolean]} */
    const [availableSlotsCol, hasAlignment] = await schema('gym')
      .columnInfo()
      .then((columns) => [
        'availble_slots' in columns ? 'availble_slots' : 'available_slots',
        'raid_pokemon_alignment' in columns,
      ])
    const [polygon] = await schema('nests')
      .columnInfo()
      .then((columns) => ['polygon' in columns])

    return {
      isMad,
      pvpV2,
      mem: '',
      secret: '',
      hasSize,
      hasHeight,
      hasRewardAmount,
      hasPowerUp,
      hasAltQuests,
      hasLayerColumn,
      hasMultiInvasions,
      multiInvasionMs,
      hasConfirmed,
      availableSlotsCol,
      hasAlignment,
      polygon,
      hasShowcaseData,
      hasShowcaseForm,
      hasShowcaseType,
    }
  }

  async getDbContext() {
    log.info(
      HELPERS.db,
      `Determining database types for ${this.connections.length} connection${
        this.connections.length > 1 ? 's' : ''
      }`,
    )
    await Promise.all(
      this.connections.map(async (schema, i) => {
        try {
          const schemaContext = schema
            ? await DbCheck.schemaCheck(schema)
            : {
                mem: this.endpoints[i].endpoint,
                secret: this.endpoints[i].secret,
                pvpV2: true,
              }

          Object.entries(this.models).forEach(([category, sources]) => {
            if (Array.isArray(sources)) {
              sources.forEach((source, j) => {
                if (source.connection === i) {
                  Object.assign(this.models[category][j], schemaContext)
                }
              })
            }
          })
        } catch (e) {
          log.error(HELPERS.db, e)
        }
      }),
    )
  }

  /**
   * @param {{ [key: string]: number }[]} results
   * @param {boolean} historical
   * @returns {void}
   */
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
    this[mapKey] = {}
    Object.entries(base).forEach(([id, count]) => {
      const percent = (count / total) * 100
      if (percent === 0) {
        this[mapKey][id] = 'never'
      } else if (percent < this.rarityPercents.ultraRare) {
        this[mapKey][id] = 'ultraRare'
      } else if (percent < this.rarityPercents.rare) {
        this[mapKey][id] = 'rare'
      } else if (percent < this.rarityPercents.uncommon) {
        this[mapKey][id] = 'uncommon'
      } else {
        this[mapKey][id] = 'common'
      }
    })
  }

  async historicalRarity() {
    log.info(HELPERS.db, 'Setting historical rarity stats')
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
      log.error(HELPERS.db, 'Failed to set historical rarity stats', e)
    }
  }

  /**
   * @param {import("../models").Models} models
   */
  bindConnections(models) {
    try {
      Object.entries(this.models).forEach(([modelName, sources]) => {
        if (this.singleModels.includes(modelName)) {
          /** @type {import('../models').RmModelKeys} */
          const model = modelName
          if (sources.length > 1) {
            log.error(
              HELPERS.db,
              model,
              `only supports one database connection`,
            )
            process.exit(0)
          }
          if (model === 'User') {
            this.models.Badge = models.Badge
            this.models.Badge.knex(this.connections[this.reactMapDb])
            this.models.Backup = models.Backup
            this.models.Backup.knex(this.connections[this.reactMapDb])
            this.models.NestSubmission = models.NestSubmission
            this.models.NestSubmission.knex(this.connections[this.reactMapDb])
            this.models.Session = models.Session
            this.models.Session.knex(this.connections[this.reactMapDb])
          }
          this.models[model] = models[model]
          this.models[model].knex(this.connections[this.reactMapDb])
        } else if (Array.isArray(sources)) {
          /** @type {import('../models').ScannerModelKeys} */
          const model = modelName
          sources.forEach((source, i) => {
            if (this.connections[source.connection]) {
              this.models[model][i].SubModel = models[model].bindKnex(
                this.connections[source.connection],
              )
            } else {
              this.models[model][i].SubModel = models[model]
            }
          })
        } else {
          log.warn(HELPERS.db, modelName, 'something unexpected happened')
        }
        log.info(
          HELPERS.db,
          `Bound ${modelName} to ${sources.length ?? 1} connection${
            sources.length > 1 ? 's' : ''
          }`,
        )
      })
    } catch (e) {
      log.error(
        HELPERS.db,
        e,
        `\n\nOnly ${[...this.validModels, ...this.singleModels].join(
          ', ',
        )} are valid options in the useFor arrays`,
      )
      process.exit(9)
    }
  }

  /**
   * @template {import("@rm/types").BaseRecord} T
   * @param {T[][]} results
   * @returns {T[]}
   */
  static deDupeResults(results) {
    if (results.length === 0) return []
    if (results.length === 1) return results[0]
    const returnObj = new Map()
    const { length } = results
    for (let i = 0; i < length; i += 1) {
      const { length: subLength } = results[i]
      for (let j = 0; j < subLength; j += 1) {
        const item = results[i][j]
        const existing = returnObj.get(item.id)
        if (!existing || item.updated > existing.updated) {
          returnObj.set(item.id, item)
        }
      }
    }
    return Array.from(returnObj.values())
  }

  /**
   * @template {import("@rm/types").BaseRecord} T
   * @param {import("../models").ScannerModelKeys} model
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {number} userId
   * @param {'getAll' | string} method
   * @returns {Promise<T[]>}
   */
  async getAll(model, perms, args, userId, method = 'getAll') {
    try {
      const data = await Promise.all(
        this.models[model].map(async ({ SubModel, ...source }) =>
          SubModel[method](perms, args, source, userId),
        ),
      )
      return DbCheck.deDupeResults(data)
    } catch (e) {
      log.error(HELPERS.db, HELPERS[model.toLowerCase()], e)
      throw e
    }
  }

  /**
   * @template {import("@rm/types").BaseRecord} T
   * @param {import("../models").ScannerModelKeys} model
   * @param {string} id
   * @returns {Promise<T | {}>}
   */
  async getOne(model, id) {
    const data = await Promise.all(
      this.models[model].map(async ({ SubModel, ...source }) =>
        SubModel.getOne(id, source),
      ),
    )
    const cleaned = DbCheck.deDupeResults(data.filter(Boolean))
    return cleaned || {}
  }

  /**
   * @template {import("@rm/types").BaseRecord} T
   * @param {import("../models").ScannerModelKeys} model
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {'search' | string} method
   * @returns {Promise<T[]>}
   */
  async search(model, perms, args, method = 'search') {
    let deDuped = []
    let count = 0
    let distance = softLimit
    while (deDuped.length < this.searchLimit) {
      count += 1
      const bbox = getBboxFromCenter(args.lat, args.lon, distance)
      const local = distance
      const data = await Promise.all(
        this.models[model].map(async ({ SubModel, ...source }) =>
          SubModel[method](
            perms,
            args,
            source,
            this.getDistance(args, source.isMad),
            bbox,
            local,
          ),
        ),
      )
      deDuped = DbCheck.deDupeResults(data)
      log.debug(
        HELPERS.db,
        'Search attempt #',
        count,
        '| received:',
        deDuped.length,
        '| distance:',
        distance,
      )
      if (deDuped.length >= this.searchLimit || distance >= hardLimit) {
        break
      }
      if (deDuped.length === 0) {
        distance += softLimit * 3
      } else if (deDuped.length < this.searchLimit / 4) {
        distance += softLimit * 2
      } else {
        distance += softLimit
      }
      distance = Math.min(distance, hardLimit)
    }
    if (count > 1) {
      log.info(
        HELPERS.db,
        'Searched',
        count,
        '| received:',
        deDuped.length,
        `results for ${method} on model ${model}`,
      )
    }
    deDuped.sort((a, b) => a.distance - b.distance)
    if (deDuped.length > this.searchLimit) {
      deDuped.length = this.searchLimit
    }
    return deDuped
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @returns {Promise<[
   *  import("@rm/types").BaseRecord[],
   *  import("@rm/types").BaseRecord[]
   * ]>}
   */
  async submissionCells(perms, args) {
    const stopData = await Promise.all(
      this.models.Pokestop.map(async ({ SubModel, ...source }) =>
        SubModel.getSubmissions(perms, args, source),
      ),
    )
    const gymData = await Promise.all(
      this.models.Gym.map(async ({ SubModel, ...source }) =>
        SubModel.getSubmissions(perms, args, source),
      ),
    )
    return [DbCheck.deDupeResults(stopData), DbCheck.deDupeResults(gymData)]
  }

  /**
   * This function performs a query on a model using a specified method and arguments.
   * It supports both single and multiple models, and deduplicates results if necessary.
   *
   * @example
   * const results = await dbCheck.query('Pokemon', 'getAll', perms, args)
   *
   * @template {import('../models').ModelKeys} T
   * @template {keyof import("@rm/types").ExtractMethods<import('../models').Models[T]>} U
   * @template {Awaited<ReturnType<import("@rm/types").ExtractMethods<import('../models').Models[T]>[U]>>} V
   * @param {T} model The model to query
   * @param {U} method The method to call on the model
   * @param {T extends import('../models').ScannerModelKeys
   *  ? import("@rm/types").Head<Parameters<import("@rm/types").ExtractMethods<import('../models').Models[T]>[U]>>
   *  : Parameters<import("@rm/types").ExtractMethods<import('../models').Models[T]>[U]>
   * } args The arguments to pass to the method
   * @returns {Promise<V>} The result of the query
   */
  async query(model, method, ...args) {
    if (Array.isArray(this.models[model])) {
      const data = await Promise.all(
        this.models[model].map(async ({ SubModel, ...source }) =>
          SubModel[method](...args, source),
        ),
      )
      return DbCheck.deDupeResults(data.filter(Boolean))
    }
    return this.models[model][method](...args)
  }

  /**
   * @template T
   * @param {import("../models").ScannerModelKeys} model
   * @returns {Promise<T[]>}
   */
  async getAvailable(model) {
    if (this.models[model]) {
      log.info(HELPERS.db, `Querying available for ${model}`)
      try {
        const results = await Promise.all(
          this.models[model].map(async ({ SubModel, ...source }) =>
            SubModel.getAvailable(source),
          ),
        )
        log.info(HELPERS.db, `Setting available for ${model}`)
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
        log.warn(HELPERS.db, 'Unable to query available for:', model, '\n', e)
        if (model === 'Nest') {
          log.warn(
            HELPERS.db,
            'This is likely due to "nest" being in a useFor array but not in the database',
          )
        }
        return []
      }
    }
    return []
  }

  /**
   * Builds filter context for all models
   */
  async getFilterContext() {
    if (this.models.Route) {
      const results = await Promise.all(
        this.models.Route.map(({ SubModel, ...source }) =>
          SubModel.getFilterContext(source),
        ),
      )
      this.filterContext.Route.maxDistance = Math.max(
        ...results.map((result) => result.max_distance),
      )
      this.filterContext.Route.maxDuration = Math.max(
        ...results.map((result) => result.max_duration),
      )
      log.info(HELPERS.db, 'Updating filter context for routes')
    }
  }
}
