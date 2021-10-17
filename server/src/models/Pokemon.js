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
const leagueObj = Object.fromEntries(leagues.map(league => [league.name, league.cp]))

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
    ohbem = new Ohbem({
      leagues: leagueObj,
      pokemonData: await Ohbem.fetchPokemonData(),
      levelCaps: pvpLevels,
      cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    })
  }

  static getPerms = field => {
    switch (field) {
      case 'iv': return 'iv'
      case 'level':
      case 'atk_iv':
      case 'def_iv':
      case 'sta_iv': return 'stats'
      default: return 'pvp'
    }
  }

  static arrayCheck = (filter, key, reference) => filter[key].every((v, i) => v === reference[key][i])

  static getRelevantKeys = (filter, reference, perms) => {
    const relevantKeys = []
    if (filter) {
      keys.forEach(key => {
        if (!this.arrayCheck(filter, key, reference) && perms[this.getPerms(key)]) {
          relevantKeys.push(key)
        }
      })
    }
    return relevantKeys
  }

  static satisfiesGlobal = (fields, global, pkmn, onlyHundoIv, onlyZeroIv, onlyXsRat, onlyXlKarp) => (
    (fields && global && fields.some(
      field => pkmn[field] >= global[field][0] && pkmn[field] <= global[field][1],
    )) || (onlyHundoIv && pkmn.iv === 100) || (onlyZeroIv && pkmn.iv === 0)
    || (onlyXsRat && pkmn.weight <= 2.40625 && pkmn.pokemon_id === 19)
    || (onlyXlKarp && pkmn.weight >= 13.125 && pkmn.pokemon_id === 129)
  )

  static getParsedPvp = (pokemon) => {
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

  static getRanks = (league, data, filterId, args) => {
    const [min, max] = this.getMinMax(filterId, league, args)
    let best = 4096
    const filtered = data.filter(pkmn => {
      const result = this.pvpCheck(pkmn, league, min, max, args)
      if (pkmn.rank < best && result) best = pkmn.rank
      return result
    })
    return { filtered, best }
  }

  static pvpCheck = (pkmn, league, min, max, args) => {
    const rankCheck = pkmn.rank <= max && pkmn.rank >= min
    const cpCheck = dbType === 'chuck' || reactMapHandlesPvp || pkmn.cp >= pvpMinCp[league]
    const megaCheck = !pkmn.evolution || args.onlyPvpMega
    const capCheck = dbType === 'chuck' || reactMapHandlesPvp ? pkmn.capped || args[`onlyPvp${pkmn.cap}`] : true
    return rankCheck && cpCheck && megaCheck && capCheck
  }

  static getMinMax = (filterId, key, args) => {
    const globalOn = !this.arrayCheck(args.onlyIvOr, key, args.onlyStandard)
    const specificFilter = args[filterId]
    const [globalMin, globalMax] = args.onlyIvOr[key]
    let min = 0
    let max = 0
    if (specificFilter && !this.arrayCheck(specificFilter, key, args.onlyStandard)) {
      const [pkmnMin, pkmnMax] = specificFilter[key]
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

  static formChecker = (pokemon, relevant = [], filter) => filter && relevant.every(
    key => (pokemon[key] >= filter[key][0] && pokemon[key] <= filter[key][1]),
  )

  static async getPokemon(args, perms, isMad) {
    const ts = Date.now() / 1000
    const {
      stats, iv: ivs, pvp, areaRestrictions,
    } = perms
    const {
      onlyStandard, onlyIvOr, onlyXlKarp, onlyXsRat, onlyZeroIv, onlyHundoIv, onlyLinkGlobal,
    } = args.filters

    const basicPokemon = []
    const fancyPokemon = {}
    const orRelevant = this.getRelevantKeys(onlyIvOr, onlyStandard, perms)

    Object.entries(args.filters).forEach(([pkmn, filter]) => {
      if (!pkmn.startsWith('o')) {
        const relevantFilters = this.getRelevantKeys(filter, onlyStandard, perms)
        const [id] = pkmn.split('-')
        if (relevantFilters.length && (ivs || stats || pvp)) {
          fancyPokemon[pkmn] = relevantFilters
        } else {
          basicPokemon.push(id)
        }
      }
    })
    const needsJs = Object.keys(fancyPokemon).length || orRelevant.some(field => leagueObj[field])

    const query = this.query()
    if (isMad) {
      getMadSql(query)
    }
    query.where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(pokemon => {
        if (basicPokemon.length) {
          pokemon.whereIn('pokemon_id', basicPokemon)
        }
        if (needsJs) {
          pokemon.orWhereNotNull('cp')
        } else {
          if (orRelevant.length) {
            orRelevant.forEach(field => {
              pokemon.andWhereBetween(isMad ? madKeys[field] : field, onlyIvOr[field])
            })
          }
          if (onlyXlKarp) {
            pokemon.orWhere('pokemon_id', 129)
              .andWhere('weight', '>=', 13.125)
          }
          if (onlyXsRat) {
            pokemon.orWhere('pokemon_id', 19)
              .andWhere('weight', '<=', 2.40625)
          }
          if (onlyZeroIv && ivs) {
            pokemon.orWhere(isMad ? raw(ivCalc) : 'iv', 0)
          }
          if (onlyHundoIv && ivs) {
            pokemon.orWhere(isMad ? raw(ivCalc) : 'iv', 100)
          }
        }
      })
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, isMad, 'pokemon')
    }
    const results = await query

    const filteredResults = results.map(pkmn => {
      const newPkmn = pkmn

      if (pkmn.pokemon_id === 132) {
        newPkmn.ditto_form = pkmn.form
        newPkmn.form = masterfile[pkmn.pokemon_id].defaultFormId
      }
      newPkmn.filterId = `${newPkmn.pokemon_id}-${newPkmn.form}`

      if (onlyLinkGlobal && !args.filters[newPkmn.filterId]) {
        return null
      }
      if (!pkmn.seen_type) {
        if (pkmn.spawn_id === null) {
          newPkmn.seen_type = pkmn.pokestop_id ? 'nearby_stop' : 'nearby_cell'
        } else {
          newPkmn.seen_type = 'encounter'
        }
      } else {
        newPkmn.seen_type = pkmn.seen_type
      }
      if (pkmn.cp) {
        if (pvp) {
          const parsed = reactMapHandlesPvp ? this.getOhbemPvp(newPkmn) : this.getParsedPvp(newPkmn)
          newPkmn.cleanPvp = {}
          newPkmn.bestPvp = 4096
          Object.keys(parsed).forEach(league => {
            const { filtered, best } = this.getRanks(league, parsed[league], newPkmn.filterId, args.filters)
            if (filtered.length) {
              newPkmn.cleanPvp[league] = filtered
              if (best < newPkmn.bestPvp) {
                newPkmn.bestPvp = best
              }
              newPkmn[league] = best
            }
          })
        }
        if (this.formChecker(pkmn, fancyPokemon[newPkmn.filterId], args.filters[newPkmn.filterId])) {
          return newPkmn
        }
        if (this.satisfiesGlobal(orRelevant, onlyIvOr, pkmn, onlyHundoIv, onlyZeroIv, onlyXsRat, onlyXlKarp)) {
          return newPkmn
        }
      } else if (args.filters[newPkmn.filterId]) {
        return newPkmn
      }
      return null
    })

    return filteredResults.filter(pkmn => pkmn)
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
    const ts = Math.floor(Date.now() / 1000)
    const results = await this.query()
      .select('pokemon_id', 'form')
      .where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy('pokemon_id', 'form')
      .orderBy('pokemon_id', 'form')
    return results.map(pkmn => `${pkmn.pokemon_id}-${pkmn.form}`)
  }
}

module.exports = Pokemon
