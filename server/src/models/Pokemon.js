// @ts-check

/* eslint-disable no-restricted-syntax */
const { Model, raw, ref } = require('objection')
const i18next = require('i18next')
const fs = require('fs')
const { resolve } = require('path')
const { default: getDistance } = require('@turf/distance')
const { point } = require('@turf/helpers')

const { log, TAGS } = require('@rm/logger')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { filterRTree } = require('../utils/filterRTree')
const { fetchJson } = require('../utils/fetchJson')
const {
  IV_CALC,
  LEVEL_CALC,
  MAD_KEY_MAP,
  BASE_KEYS,
} = require('../filters/pokemon/constants')
const { PkmnBackend } = require('../filters/pokemon/Backend')
const { state } = require('../services/state')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  /**
   * @param {import('objection').QueryBuilder} query
   */
  static getMadSql(query) {
    query
      .leftJoin('trs_spawn', 'pokemon.spawnpoint_id', 'trs_spawn.spawnpoint')
      .leftJoin(
        'pokemon_display',
        'pokemon.encounter_id',
        'pokemon_display.encounter_id',
      )
      .select([
        '*',
        ref('pokemon.encounter_id').castTo('CHAR').as('id'),
        'pokemon.latitude AS lat',
        'pokemon.longitude AS lon',
        'individual_attack AS atk_iv',
        'individual_defense AS def_iv',
        'individual_stamina AS sta_iv',
        'height',
        'pokemon.form',
        'pokemon.gender',
        'pokemon.costume',
        'pokemon_display.pokemon AS display_pokemon_id',
        'pokemon_display.form AS ditto_form',
        'weather_boosted_condition AS weather',
        raw('IF(calc_endminsec IS NOT NULL, 1, NULL)').as(
          'expire_timestamp_verified',
        ),
        raw('Unix_timestamp(disappear_time)').as('expire_timestamp'),
        raw('Unix_timestamp(last_modified)').as('updated'),
        raw(IV_CALC).as('iv'),
        raw(LEVEL_CALC).as('level'),
      ])
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {{ filterMap: Record<string, PkmnBackend>, globalFilter: PkmnBackend }}
   */
  static getFilters(perms, args, ctx) {
    const mods = {
      onlyAreas: args.filters.onlyAreas || [],
      ...ctx,
      ...Object.fromEntries(
        config
          .getSafe('api.pvp.levels')
          .map((x) => [`onlyPvp${x}`, args.filters[`onlyPvp${x}`]]),
      ),
    }
    /** @type {Record<string, PkmnBackend>} */
    const filterMap = {}

    Object.entries(args.filters).forEach(([key, filter]) => {
      if (key.includes('-')) {
        filterMap[key] = new PkmnBackend(
          key,
          filter,
          args.filters.onlyIvOr,
          perms,
          mods,
        )
      } else if (typeof filter === 'boolean') {
        mods[key] = filter
      }
    })

    if (Object.keys(filterMap).length === 0 && mods.onlyEasyMode) {
      // if no pokemon are present we want global filters to apply still
      mods.onlyLinkGlobal = false
    }
    const globalFilter = new PkmnBackend(
      'global',
      args.filters.onlyIvOr,
      args.filters.onlyIvOr,
      perms,
      mods,
    )

    return {
      filterMap,
      globalFilter,
    }
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async getAll(perms, args, ctx) {
    const { iv: ivs, pvp, areaRestrictions } = perms
    const { onlyIvOr, onlyHundoIv, onlyZeroIv, onlyAreas = [] } = args.filters
    const { hasSize, hasHeight, isMad, mem, secret, httpAuth, pvpV2 } = ctx
    const { filterMap, globalFilter } = this.getFilters(perms, args, ctx)

    let queryPvp = config
      .getSafe('api.pvp.leagues')
      .some((league) => globalFilter.filterKeys.has(league.name))
    const ts = Math.floor(Date.now() / 1000)
    const queryLimits = config.getSafe('api.queryLimits')
    const reactMapHandlesPvp = config.getSafe('api.pvp.reactMapHandlesPvp')

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(
        (x) => x.charAt(0) !== 'o',
      )
      if (!noPokemonSelect) return []
    }

    const query = this.query()

    const pokemonIds = []
    const pokemonForms = []
    Object.values(filterMap).forEach((filter) => {
      pokemonIds.push(filter.pokemon)
      pokemonForms.push(filter.form)
      if (
        !queryPvp &&
        config
          .getSafe('api.pvp.leagues')
          .some((league) => filter.filterKeys.has(league.name))
      ) {
        queryPvp = true
      }
    })

    if (!mem) {
      if (isMad) {
        Pokemon.getMadSql(query)
      } else {
        query.select(['*', hasSize && !hasHeight ? 'size AS height' : 'size'])
      }
      query
        .where(
          isMad ? 'disappear_time' : 'expire_timestamp',
          '>=',
          isMad ? this.knex().fn.now() : ts,
        )
        .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [
          args.minLat,
          args.maxLat,
        ])
        .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [
          args.minLon,
          args.maxLon,
        ])
        .andWhere((ivOr) => {
          if (ivs || pvp) {
            if (globalFilter.filterKeys.size) {
              ivOr.andWhere((pkmn) => {
                const keys = globalFilter.keyArray
                for (let i = 0; i < keys.length; i += 1) {
                  const key = keys[i]
                  switch (key) {
                    case 'xxs':
                    case 'xxl':
                      if (hasSize) {
                        pkmn.orWhere('pokemon.size', key === 'xxl' ? 5 : 1)
                      }
                      break
                    case 'gender':
                      pkmn.andWhere('pokemon.gender', onlyIvOr[key])
                      break
                    case 'cp':
                    case 'level':
                    case 'atk_iv':
                    case 'def_iv':
                    case 'sta_iv':
                    case 'iv':
                      if (perms.iv) {
                        pkmn.andWhereBetween(
                          isMad ? MAD_KEY_MAP[key] : key,
                          onlyIvOr[key],
                        )
                      }
                      break
                    default:
                      if (
                        perms.pvp &&
                        BASE_KEYS.every((x) => !globalFilter.filterKeys.has(x))
                      ) {
                        // doesn't return everything if only pvp stats for individual pokemon
                        pkmn.whereNull('pokemon_id')
                      }
                      break
                  }
                }
              })
            } else {
              ivOr.whereNull('pokemon_id')
            }
            ivOr.orWhereIn('pokemon_id', pokemonIds)
            ivOr.orWhereIn('pokemon.form', pokemonForms)
          }
          if (onlyZeroIv && ivs) {
            ivOr.orWhere(isMad ? raw(IV_CALC) : 'iv', 0)
          }
          if (onlyHundoIv && ivs) {
            ivOr.orWhere(isMad ? raw(IV_CALC) : 'iv', 100)
          }
        })
      if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad, 'pokemon')) {
        return []
      }
    }

    const filters = mem
      ? Object.values(filterMap).flatMap((filter) => filter.buildApiFilter())
      : []
    if ((perms.iv || perms.pvp) && mem) {
      const pokemon = Object.keys(filterMap)
        .filter((key) => key.includes('-'))
        .map((key) => {
          const [id, form] = key.split('-', 2).map(Number)
          return { id, form }
        })
      if (!globalFilter.mods.onlyLinkGlobal) {
        pokemon.push({ id: -1 }) // add everything else
      }
      if (
        globalFilter.mods.onlyLinkGlobal
          ? !!filters.length || globalFilter.mods.onlyEasyMode
          : true
      ) {
        filters.push(...globalFilter.buildApiFilter(pokemon))
      }
      const globalPokes = globalFilter.mods.onlyLinkGlobal
        ? [...pokemon, { id: -1 }]
        : pokemon
      if (onlyZeroIv)
        filters.push({ iv: { min: 0, max: 0 }, pokemon: globalPokes })
      if (onlyHundoIv)
        filters.push({ iv: { min: 100, max: 100 }, pokemon: globalPokes })
    }
    /** @type {import("@rm/types").Pokemon[]} */
    const results = await this.evalQuery(
      mem ? `${mem}/api/pokemon/v2/scan` : null,
      mem
        ? JSON.stringify({
            min: {
              latitude: args.minLat,
              longitude: args.minLon,
            },
            max: {
              latitude: args.maxLat,
              longitude: args.maxLon,
            },
            limit: queryLimits.pokemon + queryLimits.pokemonPvp,
            filters,
          })
        : query.limit(queryLimits.pokemon),
      'POST',
      secret,
      httpAuth,
    )

    const finalResults = []
    const pvpResults = []
    const listOfIds = []

    // form checker
    for (let i = 0; i < results.length; i += 1) {
      const pkmn = results[i]
      const id =
        pkmn.pokemon_id === 132 ? '132-0' : `${pkmn.pokemon_id}-${pkmn.form}`
      const filter = filterMap[id] || globalFilter
      let noPvp = true

      if (
        pvp &&
        (pkmn.pvp ||
          pkmn.pvp_rankings_great_league ||
          pkmn.pvp_rankings_ultra_league ||
          (isMad && reactMapHandlesPvp && pkmn.cp))
      ) {
        noPvp = false
        listOfIds.push(pkmn.id)
        pvpResults.push(pkmn)
      }
      const result = filter.build(pkmn)
      if (noPvp && filter.valid(result)) {
        finalResults.push(result)
      }
    }
    // second query for pvp
    if (!mem && queryPvp && (!isMad || reactMapHandlesPvp)) {
      const pvpQuery = this.query()
      if (isMad) {
        Pokemon.getMadSql(pvpQuery)
      }
      pvpQuery
        .where(
          isMad ? 'disappear_time' : 'expire_timestamp',
          '>=',
          isMad ? this.knex().fn.now() : ts,
        )
        .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [
          args.minLat,
          args.maxLat,
        ])
        .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [
          args.minLon,
          args.maxLon,
        ])
      if (isMad && listOfIds.length) {
        pvpQuery.whereRaw(
          `pokemon.encounter_id NOT IN ( ${listOfIds.join(',')} )`,
        )
      } else {
        pvpQuery.whereNotIn('id', listOfIds)
      }
      if (reactMapHandlesPvp) {
        pvpQuery.whereNotNull('cp')
      } else if (pvpV2) {
        pvpQuery.whereNotNull('pvp')
      } else {
        pvpQuery.andWhere((pvpBuilder) => {
          pvpBuilder
            .whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        })
      }
      if (
        !getAreaSql(pvpQuery, areaRestrictions, onlyAreas, isMad, 'pokemon')
      ) {
        return []
      }
      pvpResults.push(
        ...(await this.evalQuery(
          mem,
          pvpQuery.limit(queryLimits.pokemonPvp - results.length),
          'POST',
          secret,
          httpAuth,
        )),
      )
    }

    for (let i = 0; i < pvpResults.length; i += 1) {
      const pkmn = pvpResults[i]
      const filter =
        filterMap[`${pkmn.pokemon_id}-${pkmn.form}`] || globalFilter
      const result = filter.build(pkmn)
      if (filter.valid(result)) {
        finalResults.push(result)
      }
    }

    return finalResults
  }

  /**
   * @template T
   * @param {string} mem
   * @param {string | import("objection").QueryBuilder<Pokemon>} query
   * @param {'GET' | 'POST' | 'PATCH' | 'DELETE'} method
   * @param {string} secret
   * @param {{ username: string, password: string } | null} httpAuth
   * @returns {Promise<T>}
   */
  static async evalQuery(
    mem,
    query,
    method = 'POST',
    secret = '',
    httpAuth = null,
  ) {
    if (config.getSafe('devOptions.queryDebug')) {
      if (!fs.existsSync(resolve(__dirname, './queries'))) {
        fs.mkdirSync(resolve(__dirname, './queries'), { recursive: true })
      }
      if (mem && typeof query === 'string') {
        fs.writeFileSync(
          resolve(__dirname, './queries', `${Date.now()}.json`),
          query,
        )
      } else if (typeof query === 'object') {
        fs.writeFileSync(
          resolve(__dirname, './queries', `${Date.now()}.sql`),
          query.toKnexQuery().toString(),
        )
      }
    }
    const results = await (mem
      ? fetchJson(mem, {
          method,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            // Support both secret-based and HTTP authentication
            ...(secret ? { 'X-Golbat-Secret': secret } : {}),
            ...(httpAuth
              ? {
                  Authorization: `Basic ${Buffer.from(`${httpAuth.username}:${httpAuth.password}`).toString('base64')}`,
                }
              : {}),
          },
          body: query,
        })
      : query)
    log.debug(TAGS.pokemon, 'raw result length', results?.length || 0)
    return results || []
  }

  /**
   * @param {number | null | undefined} preferredConnection
   * @returns {import('knex').Knex | null}
   */
  static getStatsKnex(preferredConnection = null) {
    const dbManager = state.db
    if (!dbManager) return null
    const { connections } = dbManager
    if (!Array.isArray(dbManager.models?.Spawnpoint)) {
      if (typeof preferredConnection === 'number') {
        return connections?.[preferredConnection] ?? null
      }
      return null
    }
    const spawnSources = dbManager.models.Spawnpoint
    if (typeof preferredConnection === 'number') {
      const direct = spawnSources.find(
        ({ connection }) => connection === preferredConnection,
      )
      if (direct) {
        return connections?.[direct.connection] ?? null
      }
    }
    const fallback = spawnSources.find(
      ({ connection }) => connections?.[connection],
    )
    if (fallback) {
      return connections?.[fallback.connection] ?? null
    }
    if (typeof preferredConnection === 'number') {
      return connections?.[preferredConnection] ?? null
    }
    return null
  }

  /**
   * @param {import("@rm/types").DbContext} ctx
   * @returns {boolean}
   */
  static supportsShinyStats(ctx) {
    return Boolean(this.getStatsKnex(ctx.connection) || !ctx.mem)
  }

  /**
   * @param {string[]} keys
   * @param {import('knex').Knex | null | undefined} [statsKnex]
   * @param {number | null | undefined} [preferredConnection]
   * @returns {Promise<Map<string, { shiny_seen: number, encounters_seen: number, since_date: string | null }>>}
   */
  static async fetchShinyStats(
    keys,
    statsKnex = null,
    preferredConnection = null,
  ) {
    if (!keys.length) return new Map()

    let knexInstance = statsKnex || null
    if (!knexInstance) {
      knexInstance = this.getStatsKnex(preferredConnection)
    }
    if (!knexInstance) {
      try {
        knexInstance = this.knex()
      } catch (e) {
        knexInstance = null
      }
    }
    if (!knexInstance) return new Map()

    const pairs = keys
      .map((key) => key.split('-'))
      .map(([pokemonId, formId]) => {
        const parsedPokemon = Number.parseInt(pokemonId, 10)
        if (Number.isNaN(parsedPokemon)) return null
        const parsedForm = Number.parseInt(formId, 10)
        return [parsedPokemon, Number.isNaN(parsedForm) ? 0 : parsedForm]
      })
      .filter(Boolean)

    if (!pairs.length) return new Map()

    const whereClause = pairs
      .map(() => '(pokemon_id = ? AND COALESCE(form_id, 0) = ?)')
      .join(' OR ')
    const bindings = pairs.flatMap(([pokemonId, formId]) => [pokemonId, formId])
    const query = `
      SELECT
        pokemon_id,
        COALESCE(form_id, 0) AS form_id,
        date,
        SUM(count) AS shiny,
        SUM(total) AS checks
      FROM pokemon_shiny_stats
      WHERE area = 'world'
        AND fence = 'world'
        AND (${whereClause})
        AND date >= CURRENT_DATE - INTERVAL 7 DAY
      GROUP BY pokemon_id, form_id, date
      ORDER BY pokemon_id, form_id, date DESC
    `

    const [rows] = await knexInstance.raw(query, bindings)

    const grouped = new Map()
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const key = `${row.pokemon_id}-${row.form_id ?? 0}`
      const entry = grouped.get(key)
      const rowDate =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : `${row.date}`
      const payload = {
        shiny: Number(row.shiny) || 0,
        checks: Number(row.checks) || 0,
        date: rowDate,
      }
      if (entry) {
        entry.push(payload)
      } else {
        grouped.set(key, [payload])
      }
    }

    const statsMap = new Map()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - 1)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    grouped.forEach((entries, key) => {
      let shinySum = 0
      let checkSum = 0
      let sinceDate = null
      for (let i = 0; i < entries.length; i += 1) {
        const { shiny, checks, date } = entries[i]
        const includeRecent = date >= cutoffStr
        // 20000 checks would give >99% of distinguishing even 1/512 from 1/256
        if (!includeRecent && checkSum >= 20000) {
          break
        }
        shinySum += shiny
        checkSum += checks
        if (!sinceDate || date < sinceDate) {
          sinceDate = date
        }
      }
      statsMap.set(key, {
        shiny_seen: shinySum,
        encounters_seen: checkSum,
        since_date: sinceDate,
      })
    })

    return statsMap
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async getLegacy(perms, args, ctx) {
    const { isMad, hasSize, hasHeight, mem, secret, httpAuth } = ctx
    const ts = Math.floor(Date.now() / 1000)
    const { filterMap, globalFilter } = this.getFilters(perms, args, ctx)
    const queryLimits = config.getSafe('api.queryLimits')

    if (!perms.iv && !perms.pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(
        (x) => x.charAt(0) !== 'o',
      )
      if (!noPokemonSelect) return []
    }

    const query = this.query()
      .where(
        isMad ? 'disappear_time' : 'expire_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )
      .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [
        args.minLat,
        args.maxLat,
      ])
      .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [
        args.minLon,
        args.maxLon,
      ])
    if (isMad) {
      Pokemon.getMadSql(query)
    } else {
      query.select(['*', hasSize && !hasHeight ? 'size AS height' : 'size'])
    }
    if (
      !getAreaSql(
        query,
        perms.areaRestrictions,
        args.filters.onlyAreas || [],
        isMad,
        'pokemon',
      )
    ) {
      return []
    }

    const filters = mem
      ? Object.values(filterMap).flatMap((filter) => filter.buildApiFilter())
      : []
    if ((perms.iv || perms.pvp) && mem)
      filters.push(...globalFilter.buildApiFilter())

    const results = await this.evalQuery(
      mem ? `${mem}/api/pokemon/v2/scan` : null,
      mem
        ? JSON.stringify({
            min: {
              latitude: args.minLat,
              longitude: args.minLon,
            },
            max: {
              latitude: args.maxLat,
              longitude: args.maxLon,
            },
            limit: queryLimits.pokemon + queryLimits.pokemonPvp,
            filters,
          })
        : query,
      'POST',
      secret,
      httpAuth,
    )
    const filtered = results.filter(
      (item) =>
        !mem ||
        filterRTree(item, perms.areaRestrictions, args.filters.onlyAreas),
    )

    const built = filtered
      .map((item) => {
        const filter =
          filterMap[
            item.pokemon_id === 132
              ? '132-0'
              : `${item.pokemon_id}-${item.form}`
          ] || globalFilter
        return filter.build(item)
      })
      .filter((pkmn) => {
        const filter =
          filterMap[
            pkmn.pokemon_id === 132
              ? '132-0'
              : `${pkmn.pokemon_id}-${pkmn.form}`
          ] || globalFilter
        return filter.valid(pkmn)
      })

    return built
  }

  /**
   * @param {import("@rm/types").Permissions} _perms
   * @param {{ pokemon_id: number, form?: number | null }} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<import("@rm/types").PokemonShinyStats | null>}
   */
  static async getShinyStats(_perms, args, ctx) {
    if (!this.supportsShinyStats(ctx)) {
      return null
    }
    const pokemonId = Number.parseInt(`${args.pokemon_id}`, 10)
    if (Number.isNaN(pokemonId)) {
      return null
    }
    const formId = Number.parseInt(`${args.form ?? 0}`, 10)
    const key = `${pokemonId}-${Number.isNaN(formId) ? 0 : formId}`
    try {
      const stats = await this.fetchShinyStats(
        [key],
        this.getStatsKnex(ctx.connection),
        ctx.connection,
      )
      return stats.get(key) || null
    } catch (e) {
      log.error(TAGS.pokemon, 'Failed to fetch shiny stats', e)
      return null
    }
  }

  /**
   * @param {import("@rm/types").DbContext} ctx
   */
  static async getAvailable({ isMad, mem, secret, httpAuth }) {
    const ts = Math.floor(Date.now() / 1000)

    /** @type {import("@rm/types").AvailablePokemon[]} */
    const available = await this.evalQuery(
      mem ? `${mem}/api/pokemon/available` : null,
      mem
        ? undefined
        : this.query()
            .select(['pokemon_id AS id', 'form'])
            .count('pokemon_id AS count')
            .where(
              isMad ? 'disappear_time' : 'expire_timestamp',
              '>=',
              isMad ? this.knex().fn.now() : ts,
            )
            .groupBy('pokemon_id', 'form')
            .orderBy(['pokemon_id', 'form']),
      'GET',
      secret,
      httpAuth,
    )
    available.forEach((pkmn) => {
      if (pkmn.id === 132) pkmn.form = 0
    })
    return {
      available: available.map((pkmn) => `${pkmn.id}-${pkmn.form}`),
      rarity: Object.fromEntries(
        available.map((pkmn) => [`${pkmn.id}-${pkmn.form}`, pkmn.count]),
      ),
    }
  }

  /**
   * @param {string} id
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<import("@rm/types").Pokemon>}
   */
  static getOne(id, { isMad, mem, secret, httpAuth }) {
    return this.evalQuery(
      mem ? `${mem}/api/pokemon/id/${id}` : null,
      mem
        ? undefined
        : this.query()
            .select([
              isMad ? 'latitude AS lat' : 'lat',
              isMad ? 'longitude AS lon' : 'lon',
            ])
            .where(isMad ? 'encounter_id' : 'id', id)
            .first(),
      'GET',
      secret,
      httpAuth,
    )
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @param {number} distance
   * @param {ReturnType<typeof import("server/src/utils/getBbox").getBboxFromCenter>} bbox
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async search(
    perms,
    args,
    { isMad, mem, secret, httpAuth },
    distance,
    bbox,
  ) {
    const { search, locale, onlyAreas = [] } = args
    const pokemonIds = Object.keys(state.event.masterfile.pokemon).filter(
      (pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .toLowerCase()
          .includes(search),
    )
    const searchLimit = config.getSafe('api.searchResultsLimit')
    const ts = Math.floor(Date.now() / 1000)
    const query = this.query()
      .select(['pokemon_id', distance])
      .whereIn('pokemon_id', pokemonIds)
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        isMad ? 'disappear_time' : 'expire_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )
      .limit(searchLimit)
      .orderBy('distance')
    if (isMad) {
      query.select([
        ref('encounter_id').castTo('CHAR').as('id'),
        'latitude AS lat',
        'longitude AS lon',
        'form',
        'gender',
        'costume',
        raw(IV_CALC).as('iv'),
        'disappear_time AS expire_timestamp',
      ])
    } else {
      query.select([
        'id',
        'lat',
        'lon',
        'form',
        'costume',
        'gender',
        'iv',
        'shiny',
        'expire_timestamp',
      ])
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    const results = await this.evalQuery(
      mem ? `${mem}/api/pokemon/search` : null,
      mem
        ? JSON.stringify({
            center: {
              latitude: args.lat,
              longitude: args.lon,
            },
            min: {
              latitude: bbox.minLat,
              longitude: bbox.minLon,
            },
            max: {
              latitude: bbox.maxLat,
              longitude: bbox.maxLon,
            },
            limit: searchLimit,
            searchIds: pokemonIds.map((id) => +id),
            global: {},
            filters: {},
          })
        : query,
      'POST',
      secret,
      httpAuth,
    )
    if (!results || !Array.isArray(results)) return []
    return results
      .filter(
        (item) => !mem || filterRTree(item, perms.areaRestrictions, onlyAreas),
      )
      .map((poke) => ({
        ...poke,
        iv: perms.iv && poke.iv ? +poke.iv.toFixed(2) : null,
        distance:
          poke.distance ||
          +getDistance(
            point([poke.lon, poke.lat]),
            point([args.lon, args.lat]),
            {
              units: 'meters',
            },
          ).toFixed(2),
      }))
  }
}

module.exports = { Pokemon }
