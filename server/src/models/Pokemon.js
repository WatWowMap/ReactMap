/* eslint-disable no-restricted-syntax */
const { Model, raw, ref } = require('objection')
const Ohbem = require('ohbem')
const requireFromString = require('require-from-string')

const { pokemon: masterfile } = require('../data/masterfile.json')
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
      '*',
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

  static expertFilter = (filter) => {
    const input = filter.toUpperCase()
    const tokenizer = /\s*([()|&!,]|([ADSL]?|CP|LC|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
    let result = ''
    let expectClause = true // expect a clause or '('
    let stack = 0
    let lastIndex = 0
    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = tokenizer.exec(input)) !== null) {
      if (match.index > lastIndex) {
        return null
      }
      if (expectClause) {
        if (match[3] !== undefined) {
          const lower = parseFloat(match[3])
          let column = 'iv'
          let subColumn
          switch (match[2]) {
            case 'A': column = 'atk_iv'; break
            case 'D': column = 'def_iv'; break
            case 'S': column = 'sta_iv'; break
            case 'L': column = 'level'; break
            case 'CP': column = 'cp'; break
            case 'GL':
              column = 'cleanPvp'
              subColumn = 'great'; break
            case 'UL':
              column = 'cleanPvp'
              subColumn = 'ultra'; break
            case 'LC':
              column = 'cleanPvp'
              subColumn = 'little'; break
            default: break
          }
          let upper = lower
          if (match[4] !== undefined) {
            upper = parseFloat(match[4])
          }
          if (subColumn) {
            result += `((pokemon['${column}']['${subColumn}'] || []).some(x => x.rank >= ${lower} && x.rank <= ${upper}))`
          } else {
            result += `(pokemon['${column}'] !== null && pokemon['${column}'] >= ${lower} && pokemon['${column}'] <= ${upper})`
          }
          expectClause = false
        } else {
          switch (match[1]) {
            case '(':
              // eslint-disable-next-line no-plusplus
              if (++stack > 1000000000) {
                return null
              }
              result += '('
              break
            case '!':
              result += '!'
              break
            default:
              return null
          }
        }
      } else if (match[3] !== undefined) {
        return null
      } else {
        switch (match[1]) {
          case '(':
          case '!':
            return null
          case ')':
            result += ')'
            // eslint-disable-next-line no-plusplus
            if (--stack < 0) {
              return null
            }
            break
          case '&':
            result += '&&'
            expectClause = true
            break
          case '|':
          case ',':
            result += '||'
            expectClause = true
            break
          default: break
        }
      }
      lastIndex = tokenizer.lastIndex
    }
    if (expectClause || stack !== 0 || lastIndex < filter.length) {
      return null
    }
    return requireFromString(`module.exports = (pokemon) => ${result};`)
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
    const [min, max] = args.onlyLegacy
      ? [0, 4096]
      : this.getMinMax(filterId, league, args)
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

  static getMinMax = (filterId, league, args) => {
    const globalOn = !this.arrayCheck(args.onlyIvOr, league, args.onlyStandard)
    const specificFilter = args[filterId]
    const [globalMin, globalMax] = args.onlyIvOr[league]
    let min = 0
    let max = 0
    if (specificFilter && !this.arrayCheck(specificFilter, league, args.onlyStandard)) {
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

  static formChecker = (pokemon, relevant = [], filter) => filter && relevant.every(
    key => (pokemon[key] >= filter[key][0] && pokemon[key] <= filter[key][1]),
  )

  static async getPokemon(args, perms, isMad) {
    const ts = Date.now() / 1000
    const {
      stats, iv: ivs, pvp, areaRestrictions,
    } = perms
    const {
      onlyStandard, onlyIvOr, onlyXlKarp, onlyXsRat, onlyZeroIv, onlyHundoIv, onlyLinkGlobal, onlyLegacy,
    } = args.filters

    const basicPokemon = []
    const fancyPokemon = {}
    const orRelevant = onlyLegacy
      ? this.expertFilter(onlyIvOr.adv)
      : this.getRelevantKeys(onlyIvOr, onlyStandard, perms)

    Object.entries(args.filters).forEach(([pkmn, filter]) => {
      if (!pkmn.startsWith('o')) {
        const relevantFilters = filter.adv
          ? this.expertFilter(filter.adv)
          : this.getRelevantKeys(filter, onlyStandard, perms)
        const [id] = pkmn.split('-')
        if ((relevantFilters.length || filter.adv) && (ivs || stats || pvp)) {
          fancyPokemon[pkmn] = relevantFilters
        } else {
          basicPokemon.push(id)
        }
      }
    })
    const needsJs = Object.keys(fancyPokemon).length
      || (onlyIvOr.adv && onlyLegacy)
      || orRelevant.some(field => leagueObj[field])

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

    return results.filter(pkmn => {
      if (pkmn.pokemon_id === 132) {
        pkmn.ditto_form = pkmn.form
        pkmn.form = masterfile[pkmn.pokemon_id].defaultFormId
      }
      pkmn.filterId = `${pkmn.pokemon_id}-${pkmn.form}`

      if (onlyLinkGlobal && !args.filters[pkmn.filterId]) {
        return null
      }
      if (!ivs) {
        delete pkmn.iv
      }
      if (!stats) {
        delete pkmn.cp
        delete pkmn.atk_iv
        delete pkmn.def_iv
        delete pkmn.sta_iv
        delete pkmn.level
      }
      if (!pkmn.seen_type) {
        if (pkmn.spawn_id === null) {
          pkmn.seen_type = pkmn.pokestop_id ? 'nearby_stop' : 'nearby_cell'
        } else {
          pkmn.seen_type = 'encounter'
        }
      }
      if (pkmn.cp || pkmn.iv) {
        if (pvp) {
          const parsed = reactMapHandlesPvp ? this.getOhbemPvp(pkmn) : this.getParsedPvp(pkmn)
          pkmn.cleanPvp = {}
          pkmn.bestPvp = 4096
          Object.keys(parsed).forEach(league => {
            const { filtered, best } = this.getRanks(league, parsed[league], pkmn.filterId, args.filters)
            if (filtered.length) {
              pkmn.cleanPvp[league] = filtered
              if (best < pkmn.bestPvp) {
                pkmn.bestPvp = best
              }
              pkmn[league] = best
            }
          })
        }
        if (onlyLegacy) {
          if (args.filters[pkmn.filterId]?.adv && fancyPokemon[pkmn.filterId](pkmn)) {
            return pkmn
          }
          if (onlyIvOr.adv && orRelevant(pkmn)) {
            return pkmn
          }
        } else {
          if (this.formChecker(pkmn, fancyPokemon[pkmn.filterId], args.filters[pkmn.filterId])) {
            return pkmn
          }
          if (this.satisfiesGlobal(orRelevant, onlyIvOr, pkmn, onlyHundoIv, onlyZeroIv, onlyXsRat, onlyXlKarp)) {
            return pkmn
          }
        }
      } else if (args.filters[pkmn.filterId]) {
        return pkmn
      }
      return null
    })
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
