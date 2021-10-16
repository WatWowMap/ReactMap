/* eslint-disable no-restricted-syntax */
const { Model, raw, ref } = require('objection')
const Ohbem = require('ohbem')
const { pokemon: masterfile } = require('../data/masterfile.json')
const legacyFilter = require('../services/legacyFilter')
const {
  api: { pvpMinCp },
  database: {
    settings: { leagues, reactMapHandlesPvp, pvpLevels },
  },
} = require('../services/config')
const dbSelection = require('../services/functions/dbSelection')
const getAreaSql = require('../services/functions/getAreaSql')

const dbType = dbSelection('pokemon')
const levelCalc = 'IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL)'
const ivCalc = 'IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL)'
const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', ...leagues.map(league => league.name)]
const madKeys = {
  iv: raw(ivCalc),
  level: raw(levelCalc),
  atk_iv: 'individual_attack',
  def_iv: 'individual_defense',
  sta_iv: 'individual_stamina',
}
let ohbem = null

const getMadSql = q => (
  q.leftJoin('trs_spawn', 'pokemon.spawnpoint_id', 'trs_spawn.spawnpoint')
    .select([
      ref('encounter_id')
        .castTo('CHAR')
        .as('id'),
      'pokemon.latitude AS lat',
      'pokemon.longitude AS lon',
      'individual_attack AS atk_iv',
      'individual_defense AS def_iv',
      'individual_stamina AS sta_iv',
      'weather_boosted_condition AS weather',
      raw('IF(calc_endminsec, 1, NULL)')
        .as('expire_timestamp_verified'),
      raw('Unix_timestamp(disappear_time)')
        .as('expire_timestamp'),
      raw('Unix_timestamp(last_modified)')
        .as('updated'),
      raw(ivCalc)
        .as('iv'),
      raw(levelCalc)
        .as('level'),
    ])
)

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static get idColumn() {
    return dbSelection('pokemon') === 'mad'
      ? 'encounter_id' : 'id'
  }

  static async initOhbem() {
    const leagueObj = {}
    leagues.forEach(league => leagueObj[league.name] = league.cp)
    ohbem = new Ohbem({
      leagues: leagueObj,
      pokemonData: await Ohbem.fetchPokemonData(),
      levelCaps: pvpLevels,
      cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    })
  }

  static async getPokemon(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const {
      stats, iv: ivs, pvp, areaRestrictions,
    } = perms
    const {
      onlyStandard, onlyIvOr, onlyXlKarp, onlyXsRat, onlyZeroIv, onlyHundoIv, onlyPvpMega, onlyGlobal,
    } = args.filters
    let queryPvp = false

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    const pvpCheck = (pkmn, league, min, max) => {
      const rankCheck = pkmn.rank <= max && pkmn.rank >= min
      const cpCheck = dbType === 'chuck' || reactMapHandlesPvp || pkmn.cp >= pvpMinCp[league]
      const megaCheck = !pkmn.evolution || onlyPvpMega
      const capCheck = dbType === 'chuck' || reactMapHandlesPvp ? pkmn.capped || args.filters[`onlyPvp${pkmn.cap}`] : true
      return rankCheck && cpCheck && megaCheck && capCheck
    }

    const getRanks = (league, data, filterId) => {
      const [min, max] = getMinMax(filterId, league)
      let best = 4096
      const filtered = data.filter(pkmn => {
        if (pkmn.rank < best) best = pkmn.rank
        return pvpCheck(pkmn, league, min, max)
      })
      return { filtered, best }
    }

    // decide if the Pokemon passes global or local filter
    const getMinMax = (filterId, league) => {
      const globalOn = !arrayCheck(onlyIvOr, league, onlyStandard)
      const specificFilter = args.filters[filterId]
      const [globalMin, globalMax] = onlyIvOr[league]
      let min = 0
      let max = 0
      if (specificFilter && !arrayCheck(specificFilter, league, onlyStandard)) {
        const [pkmnMin, pkmnMax] = specificFilter[league]
        if (globalOn) {
          min = pkmnMin <= globalMin ? pkmnMin : globalMin
          max = pkmnMax >= globalMax ? pkmnMax : globalMax
        } else {
          min = pkmnMin
          max = pkmnMax
        }
      } else if (globalOn) {
        min = globalMin
        max = globalMax
      }
      return [min, max]
    }

    // parse PVP JSON(s)
    const getParsedPvp = (pokemon) => {
      if (dbType === 'chuck') {
        return JSON.parse(pokemon.pvp)
      }
      const parsed = {}
      const pvpKeys = ['great', 'ultra']
      pvpKeys.forEach(league => {
        if (pokemon[`pvp_rankings_${league}_league`]) {
          parsed[league] = JSON.parse(pokemon[`pvp_rankings_${league}_league`])
        }
      })
      return parsed
    }

    // checks if filters are set to default and skips them if so
    const arrayCheck = (filter, key, reference) => filter[key].every((v, i) => v === reference[key][i])

    // cycles through the above arrayCheck
    const getRelevantKeys = (filter) => {
      const relevantKeys = []
      keys.forEach(key => {
        if (!arrayCheck(filter, key, onlyStandard)) {
          relevantKeys.push(key)
        }
      })
      return relevantKeys
    }

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, relevant) => {
      relevant.forEach(key => {
        switch (key) {
          case 'iv':
            if (ivs) {
              queryBase.andWhereBetween(isMad ? madKeys[key] : key, filter[key])
            } break
          case 'level':
          case 'atk_iv':
          case 'def_iv':
          case 'sta_iv':
            if (stats) {
              queryBase.andWhereBetween(isMad ? madKeys[key] : key, filter[key])
            } break
          default:
            if (pvp) {
              queryPvp = true
              if (!relevant.includes('iv')
                && !relevant.includes('level')
                && !relevant.includes('atk_iv')
                && !relevant.includes('def_iv')
                && !relevant.includes('sta_iv')) {
                // doesn't return everything if only pvp stats for individual pokemon
                queryBase.whereNull('pokemon_id')
              }
            } break
        }
      })
    }

    const basicPokemon = []
    const matchesGlobalAnd = []
    const fancyPokemon = {}
    const orRelevant = getRelevantKeys(onlyIvOr)
    const andRelevant = getRelevantKeys(onlyGlobal)

    Object.entries(args.filters).forEach(([pkmn, filter]) => {
      if (!pkmn.startsWith('o')) {
        const relevantFilters = getRelevantKeys(filter)
        const [id] = pkmn.split('-')
        if (relevantFilters.length && (ivs || stats || pvp)) {
          if (keys.every(key => arrayCheck(filter, key, onlyGlobal))) {
            matchesGlobalAnd.push(id)
          } else {
            const stringify = JSON.stringify(filter)
            if (!fancyPokemon[stringify]) fancyPokemon[stringify] = { ...filter, relevantFilters, pokemon: [] }
            fancyPokemon[stringify].pokemon.push(id)
          }
        } else {
          basicPokemon.push(id)
        }
      }
    })

    // query builder
    const query = this.query()
      .select(['*', raw('CONCAT(pokemon_id, "-", form)')
        .as('filterId')])
    if (isMad) {
      getMadSql(query)
    }
    if (orRelevant.length || fancyPokemon.length || matchesGlobalAnd.length || basicPokemon.length
      || onlyXlKarp || onlyXsRat || onlyZeroIv || onlyHundoIv) {
      query.where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [args.minLat, args.maxLat])
        .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [args.minLon, args.maxLon])
        .andWhere(ivOr => {
          if (orRelevant.length) {
            ivOr.where(orGlobal => {
              generateSql(orGlobal, onlyIvOr, orRelevant)
            })
          }
          Object.values(fancyPokemon).forEach(pkmnGroup => {
            ivOr.orWhere(fancyPkmn => {
              fancyPkmn.whereIn('pokemon_id', pkmnGroup.pokemon)
              generateSql(fancyPkmn, pkmnGroup, pkmnGroup.relevantFilters)
            })
          })
          if (matchesGlobalAnd.length) {
            ivOr.orWhere(ivAnd => {
              generateSql(ivAnd, onlyGlobal, andRelevant)
              ivAnd.whereIn('pokemon_id', matchesGlobalAnd)
            })
          }
          if (basicPokemon.length) {
            ivOr.orWhereIn('pokemon_id', basicPokemon)
          }
          if (onlyXlKarp) {
            ivOr.orWhere('pokemon_id', 129)
              .andWhere('weight', '>=', 13.125)
          }
          if (onlyXsRat) {
            ivOr.orWhere('pokemon_id', 19)
              .andWhere('weight', '<=', 2.40625)
          }
          if (onlyZeroIv && ivs) {
            ivOr.orWhere(isMad ? raw(ivCalc) : 'iv', 0)
          }
          if (onlyHundoIv && ivs) {
            ivOr.orWhere(isMad ? raw(ivCalc) : 'iv', 100)
          }
        })
    }
    if (areaRestrictions.length > 0) {
      getAreaSql(query, areaRestrictions, isMad, 'pokemon')
    }

    const results = await query
    const finalResults = []
    const pvpResults = []
    const listOfIds = []

    // form checker
    results.forEach(pkmn => {
      let noPvp = true
      const satisfyFilters = args.filters[pkmn.filterId]
        || this.satisfiesGlobal(orRelevant, onlyIvOr, pkmn, onlyHundoIv, onlyZeroIv, onlyXsRat, onlyXlKarp)
      if (pkmn.pokemon_id === 132) {
        pkmn.ditto_form = pkmn.form
        pkmn.form = masterfile[pkmn.pokemon_id].defaultFormId
      }
      if (!pkmn.seen_type) {
        if (pkmn.spawn_id === null) {
          pkmn.seen_type = pkmn.pokestop_id ? 'nearby_stop' : 'nearby_cell'
        } else {
          pkmn.seen_type = 'encounter'
        }
      }
      if (pvp && satisfyFilters && ((pkmn.pvp_rankings_great_league
        || pkmn.pvp_rankings_ultra_league
        || pkmn.pvp)
        || (dbType === 'mad' && reactMapHandlesPvp && pkmn.cp))) {
        noPvp = false
        listOfIds.push(pkmn.id)
        pvpResults.push(pkmn)
      }
      if (noPvp && satisfyFilters) {
        finalResults.push(pkmn)
      }
    })

    // second query for pvp
    if (queryPvp && (dbType !== 'mad' || reactMapHandlesPvp)) {
      const pvpQuery = this.query()
      if (isMad) {
        getMadSql(pvpQuery)
      }
      pvpQuery
        .select([
          '*',
          raw(true)
            .as('pvpCheck'),
          raw('CONCAT(pokemon_id, "-", form)')
            .as('filterId')])
        .where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [args.minLat, args.maxLat])
        .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [args.minLon, args.maxLon])
      if (listOfIds.length) {
        if (isMad) {
          pvpQuery.whereRaw(`encounter_id NOT IN ( ${listOfIds.join(',')} )`)
        } else {
          pvpQuery.whereNotIn('id', listOfIds)
        }
      }
      if (reactMapHandlesPvp) {
        pvpQuery.whereNotNull('cp')
      } else if (dbType === 'chuck') {
        pvpQuery.whereNotNull('pvp')
      } else {
        pvpQuery.andWhere(pvpBuilder => {
          pvpBuilder.whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        })
      }
      if (areaRestrictions.length > 0) {
        getAreaSql(pvpQuery, areaRestrictions, isMad, 'pokemon')
      }
      pvpResults.push(...await pvpQuery)
    }

    // filter pokes with pvp data
    pvpResults.forEach(pkmn => {
      const parsed = reactMapHandlesPvp ? this.getOhbemPvp(pkmn) : getParsedPvp(pkmn)
      pkmn.cleanPvp = {}
      pkmn.bestPvp = 4096
      if (!pkmn.seen_type) pkmn.seen_type = 'encounter'
      Object.keys(parsed).forEach(league => {
        const { filtered, best } = getRanks(league, parsed[league], pkmn.filterId)
        if (filtered.length > 0) {
          pkmn.cleanPvp[league] = filtered
          if (best < pkmn.bestPvp) pkmn.bestPvp = best
        }
      })
      if ((Object.keys(pkmn.cleanPvp).length > 0 || !pkmn.pvpCheck)) {
        finalResults.push(pkmn)
      }
    })
    return finalResults
  }

  static satisfiesGlobal = (fields, global, pkmn, onlyHundoIv, onlyZeroIv, onlyXsRat, onlyXlKarp) => (
    (fields && global && fields.some(
      field => pkmn[field] >= global[field][0] && pkmn[field] <= global[field][1],
    )) || (onlyHundoIv && pkmn.iv === 100) || (onlyZeroIv && pkmn.iv === 0)
    || (onlyXsRat && pkmn.weight <= 2.40625 && pkmn.pokemon_id === 19)
    || (onlyXlKarp && pkmn.weight >= 13.125 && pkmn.pokemon_id === 129)
  )

  static getOhbemPvp(pokemon) {
    return ohbem.queryPvPRank(
      pokemon.pokemon_id,
      pokemon.form,
      pokemon.costume,
      pokemon.gender,
      pokemon.atk_iv,
      pokemon.def_iv,
      pokemon.sta_iv,
      pokemon.level,
    )
  }

  static async getLegacy(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const query = this.query()
      .where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [args.minLon, args.maxLon])
    if (isMad) {
      getMadSql(query)
    }
    const results = await query
    return legacyFilter(results, args, perms, ohbem)
  }

  static async getAvailablePokemon(isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select('pokemon_id', 'form')
      .where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy('pokemon_id', 'form')
      .orderBy('pokemon_id', 'form')
    return results.map(pkmn => `${pkmn.pokemon_id}-${pkmn.form}`)
  }
}

module.exports = Pokemon
