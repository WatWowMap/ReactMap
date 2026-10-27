// @ts-check

/* eslint-disable no-restricted-syntax */
const { Model, ref } = require('objection')
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
const { getBboxFromCenter } = require('../utils/getBbox')
const {
  applyManualIdFilter,
  normalizeManualId,
} = require('../utils/manualFilter')
const { BASE_KEYS } = require('../filters/pokemon/constants')
const { PkmnBackend } = require('../filters/pokemon/Backend')
const { PokemonFilter } = require('../filters/pokemon/Frontend')
const {
  getShinyRange,
  toShinyFilter,
  passesAll,
  isShinyOnlyFilter,
  hasShinyRange,
} = require('../filters/pokemon/personalShiny')
const {
  DITTO_ID,
  getWildFilterKey,
} = require('../filters/pokemon/getWildFilterKey')
const { state } = require('../services/state')
const { golbatCapabilities } = require('../services/GolbatCapabilities')
const {
  shinyFor,
  backgroundFor,
  getRates,
} = require('../services/personalShiny')

/**
 * Golbat stops a scan at `max_pokemon_results` (3000 by default) matches. The
 * v3 scan says so (`limit_reached`); for a v2 scan, where Pokémon that expire
 * while the response is built make a capped result shorter, a result of at
 * least this share of the limit is taken as capped.
 */
const GOLBAT_DEFAULT_LIMIT = 3000
const V2_CAPPED_SHARE = 0.7
/** How often a capped box is split in four (4^3 = 64 boxes at most) */
const MAX_SPLIT_DEPTH = 3
/** How long a Golbat without the v3 scan isn't asked for it */
const GOLBAT_NO_V3_MS = 5 * 60 * 1000
/** How long a Golbat that refused a personal scan isn't asked for one */
const GOLBAT_REFUSED_MS = 60 * 1000
/** Failed personal scans in a row before Golbat counts as refusing them */
const GOLBAT_REFUSED_AFTER = 3
/** @type {Map<string, number>} Golbats without the v3 scan, until when */
const golbatNoV3 = new Map()
/** Failures closer together than this are one (the scans of one request) */
const GOLBAT_FAILURE_GAP_MS = 2000
/** @type {Map<string, { count: number, at: number }>} failed personal scans in a row per Golbat */
const golbatFailures = new Map()
/** Golbat rejects more player ids than this in one scan */
const MAX_GOLBAT_PLAYER_IDS = 50

/** @type {Map<string, number>} Golbats that refused personal scans, until when */
const golbatRefused = new Map()

/**
 * The v3 scan takes `gender` as a list instead of the v2 min/max range, every
 * other clause field is the same
 * @param {import('@rm/types').DnfFilter} filter
 */
function toV3Filter(filter) {
  const { gender, ...rest } = filter
  if (!gender) return rest
  const genders = []
  for (let g = gender.min; g <= gender.max; g += 1) genders.push(g)
  return { ...rest, gender: genders }
}

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
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
    const { hasSize, hasHeight, hasPokemonBackground, mem, secret, httpAuth } =
      ctx
    const { filterMap, globalFilter } = this.getFilters(perms, args, ctx)

    // Pokémon set to only shinies come from the personal shiny scan; here they
    // only show when the 0% / 100% quick selects match them
    // without active players there are no shinies to show instead
    // and only while personal shinies are included (or the only ones)
    const shinyAllowed =
      !!perms.personalShiny &&
      !args.filters.onlyLegacy &&
      (args.filters.onlyPersonalShinyMode || 'off') !== 'off' &&
      Array.isArray(args.personalShinyPlayers) &&
      args.personalShinyPlayers.length > 0
    /** @param {PkmnBackend} filter */
    const isShinyOnly = (filter) => shinyAllowed && isShinyOnlyFilter(filter)
    /**
     * @param {PkmnBackend} filter
     * @param {Partial<import("@rm/types").Pokemon>} result
     */
    const hiddenShinyOnly = (filter, result) =>
      isShinyOnly(filter) &&
      !((onlyHundoIv && result.iv === 100) || (onlyZeroIv && result.iv === 0))

    let queryPvp = config
      .getSafe('api.pvp.leagues')
      .some((league) => globalFilter.filterKeys.has(league.name))
    const ts = Math.floor(Date.now() / 1000)
    const queryLimits = config.getSafe('api.queryLimits')

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(
        (x) => x.charAt(0) !== 'o',
      )
      if (!noPokemonSelect) return []
    }

    const query = this.query()

    const manualIdFilter = normalizeManualId(args.filters.onlyManualId)

    let manualId = manualIdFilter

    const pokemonIds = []
    const pokemonForms = []
    Object.values(filterMap).forEach((filter) => {
      pokemonIds.push(filter.pokemon)
      if (!(filter.pokemon === DITTO_ID && filter.form === 0)) {
        // Wild Ditto uses a synthetic canonical filter form. Keep the SQL
        // prefilter species-only here so disguise form ids don't get turned
        // into `form = 0` broad matches.
        pokemonForms.push(filter.form)
      }
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
      const selectColumns = [
        '*',
        hasSize && !hasHeight ? 'size AS height' : 'size',
        ref('pokemon.id').castTo('CHAR').as('id'),
      ]
      if (hasPokemonBackground) {
        selectColumns.push('background')
      }
      query.select(selectColumns)
      query.where('expire_timestamp', '>=', ts)
      const manualIdColumn = 'id'
      manualId = applyManualIdFilter(query, {
        manualId: manualIdFilter,
        latColumn: 'lat',
        lonColumn: 'lon',
        idColumn: manualIdColumn,
        bounds: {
          minLat: args.minLat,
          maxLat: args.maxLat,
          minLon: args.minLon,
          maxLon: args.maxLon,
        },
      })
      if (manualId !== null) {
        query.orderByRaw('?? = ? DESC', [manualIdColumn, manualId])
      }
      query.andWhere((ivOr) => {
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
                      pkmn.andWhereBetween(key, onlyIvOr[key])
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
          if (pokemonIds.length) {
            ivOr.orWhereIn('pokemon_id', pokemonIds)
          }
          if (pokemonForms.length) {
            ivOr.orWhereIn('pokemon.form', pokemonForms)
          }
        }
        if (onlyZeroIv && ivs) {
          ivOr.orWhere('iv', 0)
        }
        if (onlyHundoIv && ivs) {
          ivOr.orWhere('iv', 100)
        }
        if (manualId !== null) {
          ivOr.orWhereIn('id', [manualId])
        }
      })
      if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
        return []
      }
    }

    const filters = mem
      ? this.buildScanClauses(
          perms,
          args,
          { filterMap, globalFilter },
          isShinyOnly,
        )
      : []
    // with personal shiny players and a Golbat that rolls them itself, the
    // v3 scan marks every result (`annotate_for`); otherwise, or when that
    // fails, the v2 scan is used and the results are checked by the resolver
    /** @type {{ id: string, name: string }[]} */
    const shinyPlayers = Array.isArray(args.personalShinyPlayers)
      ? args.personalShinyPlayers
      : []
    const annotateFor =
      mem && shinyPlayers.length && (await this.supportsPersonalShiny(ctx))
        ? [...new Set(shinyPlayers.map((player) => player.id))].slice(
            0,
            MAX_GOLBAT_PLAYER_IDS,
          )
        : null
    /** @param {boolean} v3 */
    const scanBody = (v3) =>
      JSON.stringify({
        min: {
          latitude: args.minLat,
          longitude: args.minLon,
        },
        max: {
          latitude: args.maxLat,
          longitude: args.maxLon,
        },
        limit: queryLimits.pokemon + queryLimits.pokemonPvp,
        filters: v3 ? filters.map(toV3Filter) : filters,
        ...(v3 ? { annotate_for: annotateFor } : {}),
      })
    /** @type {WeakSet<object>} results Golbat checked for the players */
    const annotated = new WeakSet()
    /** @type {import("@rm/types").Pokemon[]} */
    let results
    if (annotateFor) {
      /** @type {{ pokemon?: import("@rm/types").Pokemon[] } | null} */
      const scan = await this.evalQuery(
        `${mem}/api/pokemon/v3/scan`,
        scanBody(true),
        'POST',
        secret,
        httpAuth,
      ).catch(() => null)
      if (Array.isArray(scan?.pokemon)) {
        results = scan.pokemon
        golbatFailures.delete(mem)
        results.forEach((pkmn) => annotated.add(pkmn))
      } else {
        log.warn(
          TAGS.pokemon,
          'personal shiny: Golbat v3 scan failed, using the v2 scan',
        )
        this.noteGolbatRefused(mem, scan)
      }
    }
    if (!results) {
      results = await this.evalQuery(
        mem ? `${mem}/api/pokemon/v2/scan` : null,
        mem ? scanBody(false) : query.limit(queryLimits.pokemon),
        'POST',
        secret,
        httpAuth,
      )
    }
    const shinyNames = new Map(
      shinyPlayers.map((player) => [player.id, player.name]),
    )
    /**
     * Names of the players Golbat found the Pokémon shiny for; an empty list
     * tells the resolver it was checked
     * @param {Partial<import("@rm/types").Pokemon>} result
     * @param {import("@rm/types").Pokemon & { shiny_for?: string[] }} pkmn
     */
    const markShiny = (result, pkmn) => {
      if (!annotated.has(pkmn)) return result
      /** @param {string[] | undefined} playerIds */
      const toNames = (playerIds) =>
        [
          ...new Set(
            (playerIds || []).map((playerId) => shinyNames.get(playerId)),
          ),
        ].filter(Boolean)
      return {
        ...result,
        personal_shiny: toNames(pkmn.shiny_for),
        personal_background: toNames(pkmn.background_for),
      }
    }

    if (mem && manualId !== null) {
      const loadedIds = Array.isArray(results)
        ? new Set(results.map((pkmn) => `${pkmn.id}`))
        : new Set()
      if (!loadedIds.has(`${manualId}`)) {
        const manualResult = await this.evalQuery(
          `${mem}/api/pokemon/id/${encodeURIComponent(manualId)}`,
          null,
          'GET',
          secret,
          httpAuth,
        ).catch(() => null)
        if (manualResult) {
          results = Array.isArray(results)
            ? [...results, manualResult]
            : [manualResult]
        }
      }
    }

    if (!Array.isArray(results)) {
      results = []
    }

    const finalResults = []
    const pvpResults = []
    const listOfIds = []

    // form checker
    for (let i = 0; i < results.length; i += 1) {
      const pkmn = results[i]
      const id = getWildFilterKey(pkmn.pokemon_id, pkmn.form)
      const filter = filterMap[id] || globalFilter
      let noPvp = true

      if (pvp && pkmn.pvp) {
        noPvp = false
        listOfIds.push(pkmn.id)
        pvpResults.push(pkmn)
      }
      const result = filter.build(pkmn)
      if (noPvp && filter.valid(result) && !hiddenShinyOnly(filter, result)) {
        finalResults.push(markShiny(result, pkmn))
      }
    }
    // second query for pvp
    if (!mem && queryPvp) {
      const pvpQuery = this.query()
      pvpQuery.where('expire_timestamp', '>=', ts)
      applyManualIdFilter(pvpQuery, {
        manualId,
        latColumn: 'lat',
        lonColumn: 'lon',
        idColumn: 'id',
        bounds: {
          minLat: args.minLat,
          maxLat: args.maxLat,
          minLon: args.minLon,
          maxLon: args.maxLon,
        },
      })
      pvpQuery.whereNotIn('id', listOfIds)
      pvpQuery.whereNotNull('pvp')
      if (!getAreaSql(pvpQuery, areaRestrictions, onlyAreas)) {
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
        filterMap[getWildFilterKey(pkmn.pokemon_id, pkmn.form)] || globalFilter
      const result = filter.build(pkmn)
      if (filter.valid(result) && !hiddenShinyOnly(filter, result)) {
        finalResults.push(markShiny(result, pkmn))
      }
    }

    return finalResults
  }

  /**
   * The Golbat scan clauses of the user's regular filters
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {{ filterMap: Record<string, PkmnBackend>, globalFilter: PkmnBackend }} filterSet
   * @param {(filter: PkmnBackend) => boolean} [skip] filters left out
   * @returns {import('@rm/types').DnfFilter[]}
   */
  static buildScanClauses(
    perms,
    args,
    { filterMap, globalFilter },
    skip = () => false,
  ) {
    const { onlyHundoIv, onlyZeroIv } = args.filters
    const filters = Object.values(filterMap)
      .filter((filter) => !skip(filter))
      .flatMap((filter) => filter.buildApiFilter())
    if (perms.iv || perms.pvp) {
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
    return filters
  }

  /**
   * The user's filters as they apply to personal shinies: every IV range is
   * replaced by the filter's shiny IV range, the other conditions stay
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   */
  static getShinyFilters(perms, args, ctx) {
    return this.getFilters(
      perms,
      {
        ...args,
        filters: Object.fromEntries(
          Object.entries(args.filters).map(([key, filter]) => [
            key,
            key.includes('-') || key === 'onlyIvOr'
              ? toShinyFilter(filter)
              : filter,
          ]),
        ),
      },
      ctx,
    )
  }

  /**
   * Scan clauses for the personal shinies the user's filters show, built like
   * the regular ones from the shiny filters
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {import('@rm/types').DnfFilter[]}
   */
  static getShinyClauses(perms, args, ctx) {
    if (!perms.personalShiny || args.filters.onlyLegacy) return []
    const { filterMap, globalFilter } = this.getShinyFilters(perms, args, ctx)
    // Only Shiny without a shiny IV range: all the shinies of that Pokémon
    const clauses = Object.values(filterMap)
      .filter((filter) => hasShinyRange(filter) || isShinyOnlyFilter(filter))
      .flatMap((filter) => {
        const built = filter.buildApiFilter()
        if (built.length || !isShinyOnlyFilter(filter)) return built
        // Only Shiny on a filter equal to the global one: its conditions are
        // the global ones, for this Pokémon
        const pokemon = [{ id: filter.pokemon, form: filter.form }]
        const viaGlobal = globalFilter.buildApiFilter(pokemon)
        return viaGlobal.length
          ? viaGlobal
          : [{ pokemon, iv: { min: -1, max: 100 } }]
      })
    const pokemon = Object.keys(filterMap).map((key) => {
      const [id, form] = key.split('-', 2).map(Number)
      return { id, form }
    })
    if (!globalFilter.mods.onlyLinkGlobal) pokemon.push({ id: -1 })
    if (pokemon.length && hasShinyRange(globalFilter)) {
      clauses.push(...globalFilter.buildApiFilter(pokemon))
    }
    return clauses
  }

  /**
   * Golbat refused a personal scan (e.g. its rates aren't loaded): it is
   * treated as not filtering personal shinies for a minute, instead of every
   * request trying it first
   * @param {string} mem
   * @param {unknown} result what the scan returned
   */
  static noteGolbatRefused(mem, result) {
    // only an answer that refuses counts (an HTTP error, which evalQuery
    // passes on as the response); a timeout on a big area doesn't
    if (!result || typeof (/** @type {any} */ (result).status) !== 'number') {
      return
    }
    // the scans of one map request fail together, so they count once
    const now = Date.now()
    const last = golbatFailures.get(mem)
    if (last && now - last.at < GOLBAT_FAILURE_GAP_MS) return
    const failures = (last?.count || 0) + 1
    golbatFailures.set(mem, { count: failures, at: now })
    if (failures < GOLBAT_REFUSED_AFTER) return
    golbatFailures.delete(mem)
    golbatRefused.set(mem, Date.now() + GOLBAT_REFUSED_MS)
    // it may have been downgraded: its status is read again now
    golbatCapabilities.recheck(mem)
  }

  /**
   * Whether the Golbat endpoint advertises personal shiny filtering
   * (`annotate_for`) in /api/status and hasn't refused it lately. Turned off
   * with `authentication.perms.personalShiny.golbat`, then ReactMap always
   * checks the candidates itself.
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<boolean>}
   */
  static async supportsPersonalShiny({ mem }) {
    if (config.getSafe('authentication.perms.personalShiny.golbat') === false) {
      return false
    }
    if ((golbatRefused.get(mem) || 0) > Date.now()) return false
    return golbatCapabilities.supportsFilter(mem, 'annotate_for')
  }

  /**
   * Pokémon in the area that are shiny for any of the given players and match
   * the personal shiny conditions of the user's filters (area restrictions
   * still apply). Golbat filters them itself when it supports personal shiny,
   * otherwise every candidate is checked here.
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import('../services/personalShiny').ShinyPlayer[]} players
   * @param {Map<string, number>} rates
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async getPersonalShiny(perms, args, players, rates, ctx) {
    const { mem, secret, httpAuth, hasSize, hasHeight } = ctx
    const { onlyAreas = [] } = args.filters
    const shinyFilters = this.getShinyFilters(perms, args, ctx)
    const queryLimits = config.getSafe('api.queryLimits')
    // the personal background quick select: every Pokémon with a background
    // for the user, like the 0% / 100% quick selects, whatever the filters
    const background = !!args.personalBackgroundScan
    // personal shinies "include": every shiny for the user within the shiny
    // IV ranges, whatever the other filters
    const includeAll = !background && !!args.personalShinyScan
    const golbatRolls = !!mem && (await this.supportsPersonalShiny(ctx))
    // only personal shinies: all of them, narrowed down by every condition
    // the filters set; every Pokémon the filters apply to is scanned
    // the legacy filter has no personal shiny conditions
    const regular =
      !background &&
      !args.filters.onlyLegacy &&
      args.filters.onlyPersonalShinyExclusive
        ? this.getFilters(perms, args, ctx)
        : null
    const backgroundPokemon = [...(rates.backgrounds?.keys() || [])].map(
      (key) => {
        const [id, form] = key.split('-', 2).map(Number)
        return { id, form }
      },
    )
    const filtered = Object.keys(shinyFilters.filterMap).map((key) => {
      const [id, form] = key.split('-', 2).map(Number)
      return { id, form }
    })
    let clauses = includeAll
      ? [{}]
      : background
        ? golbatRolls
          ? [{}]
          : backgroundPokemon.length
            ? [{ pokemon: backgroundPokemon }]
            : []
        : regular
          ? regular.globalFilter.mods.onlyLinkGlobal
            ? filtered.length
              ? [{ pokemon: filtered }]
              : []
            : [{}]
          : this.getShinyClauses(perms, args, ctx)
    if (Array.isArray(args.speciesIds)) {
      const species = new Set(args.speciesIds)
      clauses = clauses
        .map((clause) => ({
          ...clause,
          pokemon: clause.pokemon
            ? clause.pokemon.filter((pokemon) => species.has(pokemon.id))
            : args.speciesIds.map((id) => ({ id })),
        }))
        .filter((clause) => clause.pokemon.length)
    }
    if (!clauses.length) return []
    const { globalFilter } = shinyFilters
    const globalActive = hasShinyRange(globalFilter)
    /**
     * The filter that shows this Pokémon (its build is used), null if none
     * @param {import("@rm/types").Pokemon} pkmn
     * @returns {PkmnBackend | null}
     */
    const matching = (pkmn) => {
      if (mem && !filterRTree(pkmn, perms.areaRestrictions, onlyAreas)) {
        return null
      }
      const key = getWildFilterKey(pkmn.pokemon_id, pkmn.form)
      if (background) return shinyFilters.filterMap[key] || globalFilter
      if (includeAll) {
        // within the Pokémon's own shiny IV range, or else the global one;
        // 0-100 is every shiny, also those without IVs
        const own = shinyFilters.filterMap[key]
        const [min, max] = getShinyRange(
          own?.filter?.personal_shiny_iv ? own.filter : globalFilter.filter,
        )
        const inRange =
          (min <= 0 && max >= 100) ||
          (typeof pkmn.iv === 'number' && pkmn.iv >= min && pkmn.iv <= max)
        return inRange ? own || globalFilter : null
      }
      if (regular) {
        const filter = regular.filterMap[key] || regular.globalFilter
        if (filter === regular.globalFilter && filter.mods.onlyLinkGlobal) {
          return null
        }
        return passesAll(filter, pkmn) ? filter : null
      }
      const own = shinyFilters.filterMap[key]
      // the Pokémon's own shiny range, or the global one where it applies
      if (
        own &&
        (hasShinyRange(own) || isShinyOnlyFilter(own)) &&
        own.expertFilter?.(own.build(pkmn))
      ) {
        return own
      }
      return globalActive &&
        (!!own || !globalFilter.mods.onlyLinkGlobal) &&
        globalFilter.expertFilter?.(globalFilter.build(pkmn))
        ? globalFilter
        : null
    }

    /** @type {{ pokemon?: (import("@rm/types").Pokemon & { shiny_for?: string[] })[] } | null} */
    let scan = null
    const ids = [...new Set(players.map((player) => player.id))].slice(
      0,
      MAX_GOLBAT_PLAYER_IDS,
    )
    // what the scan is for: the condition sent to Golbat, the check done
    // here and the field the names go to
    const [condition, check, field] = background
      ? ['background_for', backgroundFor, 'personal_background']
      : ['shiny_for', shinyFor, 'personal_shiny']
    if (golbatRolls) {
      // Golbat refuses personal scans until its rates are loaded; then the
      // candidates are checked here instead
      scan = await this.evalQuery(
        `${mem}/api/pokemon/v3/scan`,
        JSON.stringify({
          min: { latitude: args.minLat, longitude: args.minLon },
          max: { latitude: args.maxLat, longitude: args.maxLon },
          limit: queryLimits.pokemon + queryLimits.pokemonPvp,
          filters: clauses.map((clause) => ({
            ...toV3Filter(clause),
            [condition]: ids,
          })),
          annotate_for: ids,
        }),
        'POST',
        secret,
        httpAuth,
      ).catch(() => null)
      if (!Array.isArray(scan?.pokemon)) {
        log.warn(
          TAGS.pokemon,
          'personal shiny: Golbat scan failed, checking the candidates here',
        )
        this.noteGolbatRefused(mem, scan)
        scan = null
      }
    }
    // a Golbat that rolls them failed this time: not every Pokémon in the box
    // is fetched and checked here instead, which would add to its load
    let noSplit = !!args.noSplit
    if (golbatRolls && !scan) {
      noSplit = true
      if (background) {
        const species = Array.isArray(args.speciesIds)
          ? new Set(args.speciesIds)
          : null
        const wanted = backgroundPokemon.filter(
          (pokemon) => !species || species.has(pokemon.id),
        )
        if (!wanted.length) return []
        clauses = [{ pokemon: wanted }]
      }
    }
    if (scan) {
      golbatFailures.delete(mem)
      const names = new Map(players.map((player) => [player.id, player.name]))
      /** @param {any} pkmn @param {string} key */
      const namesOf = (pkmn, key) =>
        [...new Set((pkmn[key] || []).map((id) => names.get(id)))].filter(
          Boolean,
        )
      // Golbat annotates both, so both are kept: the other one isn't then
      // rolled here with ReactMap's own rates (an empty list means none)
      return scan.pokemon
        .map((pkmn) => ({
          pkmn,
          filter: matching(pkmn),
          shiny: namesOf(pkmn, 'shiny_for'),
          backgrounds: namesOf(pkmn, 'background_for'),
        }))
        .filter(
          ({ filter, shiny, backgrounds }) =>
            filter && (background ? backgrounds : shiny).length,
        )
        .map(({ pkmn, filter, shiny, backgrounds }) => ({
          ...filter.build(pkmn),
          personal_shiny: shiny,
          personal_background: backgrounds,
        }))
    }

    /** @type {import("@rm/types").Pokemon[]} */
    let results
    if (mem) {
      // every Pokémon in the box has to be checked, but a Golbat scan is capped,
      // so a (nearly) full box is split in four and rescanned
      /**
       * @param {number} minLat @param {number} minLon
       * @param {number} maxLat @param {number} maxLon
       * @param {number} depth
       * @returns {Promise<import("@rm/types").Pokemon[]>}
       */
      const limit = queryLimits.pokemon + queryLimits.pokemonPvp
      const v2Capped = Math.min(limit, GOLBAT_DEFAULT_LIMIT) * V2_CAPPED_SHARE
      // the v3 scan is tried first as it says whether it was capped
      // a Golbat without the v3 scan is remembered for a while, so it isn't
      // asked (and the failure logged) on every request
      let useV3 = !((golbatNoV3.get(mem) || 0) > Date.now())
      const scanBox = async (minLat, minLon, maxLat, maxLon, depth) => {
        const body = (/** @type {boolean} */ v3) =>
          JSON.stringify({
            min: { latitude: minLat, longitude: minLon },
            max: { latitude: maxLat, longitude: maxLon },
            limit,
            filters: v3 ? clauses.map(toV3Filter) : clauses,
          })
        /** @type {import("@rm/types").Pokemon[]} */
        let found = null
        let capped = false
        if (useV3) {
          /** @type {{ pokemon?: import("@rm/types").Pokemon[], limit_reached?: boolean } | null} */
          const v3 = await this.evalQuery(
            `${mem}/api/pokemon/v3/scan`,
            body(true),
            'POST',
            secret,
            httpAuth,
          ).catch(() => null)
          if (Array.isArray(v3?.pokemon)) {
            found = v3.pokemon
            capped = !!v3.limit_reached
          } else {
            useV3 = false
            // only an answer without it (an HTTP error), not a timeout
            if (typeof (/** @type {any} */ (v3)?.status) === 'number') {
              golbatNoV3.set(mem, Date.now() + GOLBAT_NO_V3_MS)
            }
          }
        }
        if (!found) {
          found = await this.evalQuery(
            `${mem}/api/pokemon/v2/scan`,
            body(false),
            'POST',
            secret,
            httpAuth,
          )
          if (!Array.isArray(found)) return []
          capped = found.length >= v2Capped
        }
        // the search covers a big area: one scan, not up to 64
        if (!capped || depth >= (noSplit ? 0 : MAX_SPLIT_DEPTH)) {
          return found
        }
        const midLat = (minLat + maxLat) / 2
        const midLon = (minLon + maxLon) / 2
        const parts = await Promise.all([
          scanBox(minLat, minLon, midLat, midLon, depth + 1),
          scanBox(minLat, midLon, midLat, maxLon, depth + 1),
          scanBox(midLat, minLon, maxLat, midLon, depth + 1),
          scanBox(midLat, midLon, maxLat, maxLon, depth + 1),
        ])
        return parts.flat()
      }
      const scanned = await scanBox(
        args.minLat,
        args.minLon,
        args.maxLat,
        args.maxLon,
        0,
      )
      // Pokémon on a shared edge show up in two boxes
      results = [
        ...new Map(scanned.map((pkmn) => [`${pkmn.id}`, pkmn])).values(),
      ]
    } else {
      const query = this.query()
        .select([
          '*',
          hasSize && !hasHeight ? 'size AS height' : 'size',
          ref('pokemon.id').castTo('CHAR').as('id'),
        ])
        .where('expire_timestamp', '>=', Math.floor(Date.now() / 1000))
        .whereBetween('lat', [args.minLat, args.maxLat])
        .andWhereBetween('lon', [args.minLon, args.maxLon])
      if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) return []
      // when only the selected Pokémon can show, only they take up the limit
      const selected = [
        ...new Set(
          Object.keys(shinyFilters.filterMap).map((key) => +key.split('-')[0]),
        ),
      ]
      if (Array.isArray(args.speciesIds)) {
        query.whereIn('pokemon_id', args.speciesIds)
      }
      if (background) {
        query.whereIn(
          'pokemon_id',
          backgroundPokemon.map((pokemon) => pokemon.id),
        )
      } else if (globalFilter.mods.onlyLinkGlobal && selected.length) {
        query.whereIn('pokemon_id', selected)
      }
      results = await query.limit(queryLimits.pokemon)
    }
    if (!Array.isArray(results)) return []

    return results
      .map((pkmn) => ({ pkmn, filter: matching(pkmn) }))
      .filter(({ filter }) => filter)
      .map(({ pkmn, filter }) => ({
        pkmn,
        filter,
        names: check(pkmn, players, rates),
      }))
      .filter(({ names }) => names.length)
      .map(({ pkmn, filter, names }) => ({
        ...filter.build(pkmn),
        [field]: names,
      }))
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
    return this.getStatsHandle(preferredConnection)?.knex ?? null
  }

  /**
   * @param {number | null | undefined} preferredConnection
   * @returns {{
   *   knex: import('knex').Knex,
   *   connection: number,
   *   spawnSource?: import('@rm/types').DbContext & { connection: number },
   * } | null}
   */
  static getStatsHandle(preferredConnection = null) {
    const dbManager = state.db
    if (!dbManager) return null
    const { connections } = dbManager
    if (!connections?.length) return null

    const spawnSources = dbManager.models?.Spawnpoint

    const getSpawnByConnection = (connection) =>
      Array.isArray(spawnSources)
        ? spawnSources.find((source) => source.connection === connection)
        : undefined

    const hasConnection = (connection) =>
      typeof connection === 'number' && Boolean(connections?.[connection])

    if (!Array.isArray(spawnSources) || !spawnSources.length) {
      return null
    }

    let candidate = null

    if (typeof preferredConnection === 'number') {
      candidate = spawnSources.find(
        (source) =>
          source.connection === preferredConnection &&
          source.hasPokemonShinyStats &&
          hasConnection(source.connection),
      )
    }

    if (!candidate) {
      candidate = spawnSources.find(
        (source) =>
          source.hasPokemonShinyStats && hasConnection(source.connection),
      )
    }

    if (!candidate) {
      return null
    }

    const knexInstance = connections?.[candidate.connection]
    if (!knexInstance) {
      return null
    }

    return {
      knex: knexInstance,
      connection: candidate.connection,
      spawnSource: getSpawnByConnection(candidate.connection),
    }
  }

  /**
   * @param {import("@rm/types").DbContext} ctx
   * @returns {boolean}
   */
  static supportsShinyStats(ctx) {
    const statsHandle = this.getStatsHandle(ctx?.connection)
    if (!statsHandle?.knex) {
      return false
    }
    const flag =
      typeof statsHandle.spawnSource?.hasPokemonShinyStats === 'boolean'
        ? statsHandle.spawnSource.hasPokemonShinyStats
        : typeof ctx?.hasPokemonShinyStats === 'boolean'
          ? ctx.hasPokemonShinyStats
          : false
    return flag
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
      const statsHandle = this.getStatsHandle(preferredConnection)
      knexInstance = statsHandle?.knex ?? null
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
    grouped.forEach((entries, key) => {
      let shinySum = 0
      let checkSum = 0
      let sinceDate = null
      // 20000 checks would give >99% of distinguishing even 1/512 from 1/256
      for (let i = 0; i < entries.length && checkSum < 20000; i++) {
        const { shiny, checks, date } = entries[i]
        shinySum += shiny
        checkSum += checks
        sinceDate = date
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
    const { hasSize, hasHeight, mem, secret, httpAuth } = ctx
    const ts = Math.floor(Date.now() / 1000)
    const { filterMap, globalFilter } = this.getFilters(perms, args, ctx)
    const manualIdFilter = normalizeManualId(args.filters.onlyManualId)
    const queryLimits = config.getSafe('api.queryLimits')

    if (!perms.iv && !perms.pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(
        (x) => x.charAt(0) !== 'o',
      )
      if (!noPokemonSelect) return []
    }

    const query = this.query().where('expire_timestamp', '>=', ts)
    query.select([
      '*',
      hasSize && !hasHeight ? 'size AS height' : 'size',
      ref('id').castTo('CHAR').as('id'),
    ])
    if (
      !getAreaSql(query, perms.areaRestrictions, args.filters.onlyAreas || [])
    ) {
      return []
    }
    const manualId = applyManualIdFilter(query, {
      manualId: manualIdFilter,
      latColumn: 'lat',
      lonColumn: 'lon',
      idColumn: 'id',
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    })
    const filters = mem
      ? Object.values(filterMap).flatMap((filter) => filter.buildApiFilter())
      : []
    if ((perms.iv || perms.pvp) && mem)
      filters.push(...globalFilter.buildApiFilter())

    // like getAll: a Golbat that rolls personal shinies marks the results
    /** @type {{ id: string, name: string }[]} */
    const shinyPlayers = Array.isArray(args.personalShinyPlayers)
      ? args.personalShinyPlayers
      : []
    const annotateFor =
      mem && shinyPlayers.length && (await this.supportsPersonalShiny(ctx))
        ? [...new Set(shinyPlayers.map((player) => player.id))].slice(
            0,
            MAX_GOLBAT_PLAYER_IDS,
          )
        : null
    // "shiny" in the filter: with a Golbat that rolls personal shinies it
    // asks for them (shiny_for); otherwise the other conditions are fetched
    // and it is checked here
    const hasShinyTerm = filters.some((clause) => clause.personal_shiny)
    /** @param {boolean} v3 */
    const scanFilters = (v3) =>
      filters.map(({ personal_shiny: shinyTerm, ...clause }) =>
        shinyTerm && v3 && annotateFor
          ? toV3Filter({ ...clause, shiny_for: annotateFor })
          : v3
            ? toV3Filter(clause)
            : clause,
      )
    /** @param {boolean} v3 */
    const scanBody = (v3) =>
      JSON.stringify({
        min: {
          latitude: args.minLat,
          longitude: args.minLon,
        },
        max: {
          latitude: args.maxLat,
          longitude: args.maxLon,
        },
        limit: queryLimits.pokemon + queryLimits.pokemonPvp,
        filters: scanFilters(v3),
        ...(v3 ? { annotate_for: annotateFor } : {}),
      })
    /** @type {WeakSet<object>} results Golbat checked for the players */
    const annotated = new WeakSet()
    let results
    if (annotateFor) {
      /** @type {{ pokemon?: import("@rm/types").Pokemon[] } | null} */
      const scan = await this.evalQuery(
        `${mem}/api/pokemon/v3/scan`,
        scanBody(true),
        'POST',
        secret,
        httpAuth,
      ).catch(() => null)
      if (Array.isArray(scan?.pokemon)) {
        results = scan.pokemon
        golbatFailures.delete(mem)
        results.forEach((pkmn) => annotated.add(pkmn))
      } else {
        log.warn(
          TAGS.pokemon,
          'personal shiny: Golbat v3 scan failed, using the v2 scan',
        )
        this.noteGolbatRefused(mem, scan)
      }
    }
    if (!results) {
      results = await this.evalQuery(
        mem ? `${mem}/api/pokemon/v2/scan` : null,
        mem ? scanBody(false) : query,
        'POST',
        secret,
        httpAuth,
      )
    }
    const shinyNames = new Map(
      shinyPlayers.map((player) => [player.id, player.name]),
    )
    // a shiny term Golbat didn't check is checked here
    const localRates =
      hasShinyTerm && shinyPlayers.length
        ? await getRates(this.getStatsKnex())
        : null
    /** @param {string[] | undefined} playerIds */
    const toNames = (playerIds) =>
      [
        ...new Set(
          (playerIds || []).map((playerId) => shinyNames.get(playerId)),
        ),
      ].filter(Boolean)

    if (mem && manualId !== null) {
      const loaded = new Set(results.map((pkmn) => `${pkmn.id}`))
      if (!loaded.has(`${manualId}`)) {
        const manualResult = await this.evalQuery(
          `${mem}/api/pokemon/id/${encodeURIComponent(manualId)}`,
          null,
          'GET',
          secret,
          httpAuth,
        ).catch(() => null)
        if (manualResult) {
          results = [...results, manualResult]
        }
      }
    }
    const filtered = results.filter(
      (item) =>
        !mem ||
        filterRTree(item, perms.areaRestrictions, args.filters.onlyAreas),
    )

    const built = filtered
      .map((item) => {
        const filter =
          filterMap[getWildFilterKey(item.pokemon_id, item.form)] ||
          globalFilter
        const result = filter.build(item)
        // an empty list tells the resolver Golbat checked it
        if (annotated.has(item)) {
          return {
            ...result,
            personal_shiny: toNames(item.shiny_for),
            personal_background: toNames(item.background_for),
          }
        }
        return localRates
          ? {
              ...result,
              personal_shiny: shinyFor(item, shinyPlayers, localRates),
            }
          : result
      })
      .filter((pkmn) => {
        const filter =
          filterMap[getWildFilterKey(pkmn.pokemon_id, pkmn.form)] ||
          globalFilter
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
    const statsHandle = this.getStatsHandle(ctx?.connection)
    if (!statsHandle?.knex) {
      return null
    }
    const hasStats =
      typeof statsHandle.spawnSource?.hasPokemonShinyStats === 'boolean'
        ? statsHandle.spawnSource.hasPokemonShinyStats
        : typeof ctx?.hasPokemonShinyStats === 'boolean'
          ? ctx.hasPokemonShinyStats
          : false
    if (!hasStats) {
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
        statsHandle.knex,
        statsHandle.connection,
      )
      return stats.get(key) || null
    } catch (e) {
      log.error(TAGS.pokemon, 'Failed to fetch shiny stats', e)
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        if (statsHandle.spawnSource) {
          statsHandle.spawnSource.hasPokemonShinyStats = false
        }
      }
      return null
    }
  }

  /**
   * @param {import("@rm/types").DbContext} ctx
   */
  static async getAvailable({ mem, secret, httpAuth }) {
    const ts = Math.floor(Date.now() / 1000)

    /** @type {import("@rm/types").AvailablePokemon[]} */
    const available = await this.evalQuery(
      mem ? `${mem}/api/pokemon/available` : null,
      mem
        ? undefined
        : this.query()
            .select(['pokemon_id AS id', 'form'])
            .count('pokemon_id AS count')
            .where('expire_timestamp', '>=', ts)
            .groupBy('pokemon_id', 'form')
            .orderBy(['pokemon_id', 'form']),
      'GET',
      secret,
      httpAuth,
    )
    const normalizedAvailable = available.reduce(
      (acc, pkmn) => {
        // Wild Ditto reports disguise form ids here, not true Ditto form ids.
        // Normalize them to a single wild-filter key for the Pokémon drawer.
        const key = getWildFilterKey(pkmn.id, pkmn.form)
        acc.available.add(key)
        const current = Number(acc.rarity.get(key) ?? 0)
        const count = Number(pkmn.count ?? 0)
        acc.rarity.set(key, current + count)
        return acc
      },
      { available: new Set(), rarity: new Map() },
    )
    return {
      available: [...normalizedAvailable.available],
      rarity: Object.fromEntries(normalizedAvailable.rarity),
    }
  }

  /**
   * @param {string} id
   * @param {import("@rm/types").DbContext} ctx
   */
  static async getOne(id, { mem, secret, httpAuth }) {
    if (mem) {
      const one = await this.evalQuery(
        `${mem}/api/pokemon/id/${encodeURIComponent(id)}`,
        undefined,
        'GET',
        secret,
        httpAuth,
      )
      // Match the SQL projection ({lat, lon} only). Returning the raw Golbat
      // record would leak IV/CP/level past the iv perm and area restrictions
      // — a deep link only needs centering.
      return one && typeof one === 'object' && 'lat' in one && 'lon' in one
        ? { lat: one.lat, lon: one.lon }
        : null
    }
    return this.query().select(['lat', 'lon']).where('id', id).first()
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @param {number} distance
   * @param {ReturnType<typeof import("server/src/utils/getBbox").getBboxFromCenter>} bbox
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async searchPersonal(perms, args, ctx) {
    const { search = '', locale, kind, players, rates } = args
    const text = `${search}`.trim().toLowerCase()
    const ids = new Set(
      Object.keys(state.event.masterfile.pokemon)
        .filter(
          (pkmn) =>
            !text ||
            i18next
              .t(`poke_${pkmn}`, { lng: locale })
              .toLowerCase()
              .includes(text),
        )
        .map(Number),
    )
    if (!ids.size) return []
    // one scan of the search radius: every Pokémon in it has to be checked
    const bbox = getBboxFromCenter(
      args.lat,
      args.lon,
      config.getSafe('api.searchSoftKmLimit'),
    )
    const found = await this.getPersonalShiny(
      perms,
      {
        ...bbox,
        personalBackgroundScan: kind === 'background',
        // with a search text only the matching species are scanned
        speciesIds: text ? [...ids] : null,
        noSplit: true,
        filters: {
          onlyAreas: args.onlyAreas || [],
          onlyLinkGlobal: false,
          // all of the user's shinies: a filter without any condition, not
          // the map's defaults (which set PvP ranks)
          onlyPersonalShinyExclusive: kind === 'shiny',
          onlyIvOr: { ...new PokemonFilter(), personal_shiny_iv: [0, 100] },
        },
      },
      players,
      rates,
      ctx,
    )
    return found
      .filter((pkmn) => ids.has(pkmn.pokemon_id))
      .map((pkmn) => ({
        ...pkmn,
        distance: +getDistance(
          point([pkmn.lon, pkmn.lat]),
          point([args.lon, args.lat]),
          { units: 'meters' },
        ).toFixed(2),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, config.getSafe('api.searchResultsLimit'))
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @param {number} distance
   * @param {ReturnType<typeof import("server/src/utils/getBbox").getBboxFromCenter>} bbox
   * @returns {Promise<Partial<import("@rm/types").Pokemon>[]>}
   */
  static async search(perms, args, { mem, secret, httpAuth }, distance, bbox) {
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
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere('expire_timestamp', '>=', ts)
      .limit(searchLimit)
      .orderBy('distance')
    query.select([
      ref('id').castTo('CHAR').as('id'),
      'lat',
      'lon',
      'form',
      'costume',
      'gender',
      'iv',
      'shiny',
      'expire_timestamp',
    ])
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
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
