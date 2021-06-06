/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')
const legacyFilter = require('../services/legacyFilter')
const {
  api: { pvpMinCp },
  database: {
    settings:
    { type, leagues },
  },
} = require('../services/config')
const dbSelection = require('../services/functions/dbSelection')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static get idColumn() {
    return dbSelection('pokemon').type === 'mad'
      ? 'encounter_id' : 'id'
  }

  static async getPokemon(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const {
      onlyStandard, onlyIvOr,
    } = args.filters
    let queryPvp = false

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    const check = (pkmn, league, min, max) => {
      const rankCheck = pkmn.rank <= max && pkmn.rank >= min
      const cpCheck = type === 'chuck' ? true : pkmn.cp >= pvpMinCp[league]
      return rankCheck && cpCheck
    }

    const getRanks = (league, data, filterId) => {
      const [min, max] = getMinMax(filterId, league)
      let best = 4096
      const filtered = data.filter(pkmn => {
        if (pkmn.rank < best) best = pkmn.rank
        return check(pkmn, league, min, max)
      })
      return { filtered, best }
    }

    // decide if Pokemon passes global or local filter
    const getMinMax = (filterId, league) => {
      const globalOn = !arrayCheck(onlyIvOr, league)
      const specificFilter = args.filters[filterId]
      const [globalMin, globalMax] = onlyIvOr[league]
      let min = 0
      let max = 0
      if (specificFilter && !arrayCheck(specificFilter, league)) {
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

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter[key].every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, notGlobal) => {
      const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', ...leagues]
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter, key)) {
              queryPvp = true
              // makes sure the base query doesn't return everything if only GL and UL stats are selected for the Pokemon
              if (notGlobal) {
                queryBase.whereNull('pokemon_id')
              }
            } break
          case 'iv':
            if (!arrayCheck(filter, key) && ivs && notGlobal) queryBase.andWhereBetween(key, filter[key]); break
          case 'atk_iv':
          case 'def_iv':
          case 'sta_iv':
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween(key, filter[key]); break
        }
      })
    }

    // query builder
    const query = this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere(ivOr => {
        for (const [pkmn, filter] of Object.entries(args.filters)) {
          if (pkmn.includes('-')) {
            const [id, form] = pkmn.split('-')
            const finalForm = masterfile[id].default_form_id == form ? [0, form] : [form]
            ivOr.orWhere(poke => {
              poke.where('pokemon_id', id)
              poke.whereIn('form', finalForm)
              if (ivs || stats || pvp) {
                generateSql(poke, filter, true)
              }
            })
          } else if (pkmn === 'onlyIvOr' && (ivs || stats || pvp)) {
            ivOr.whereBetween('iv', (ivs ? filter.iv : onlyStandard.iv))
            generateSql(ivOr, filter)
          }
        }
      })

    const results = await query
    const finalResults = []
    const pvpResults = []
    const listOfIds = []

    // form checker
    results.forEach(pkmn => {
      let noPvp = true
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      if (pkmn.pokemon_id === 132) {
        pkmn.ditto_form = pkmn.form
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      if (pvp
        && (pkmn.pvp_rankings_great_league
          || pkmn.pvp_rankings_ultra_league
          || pkmn.pvp)) {
        noPvp = false
        listOfIds.push(pkmn.id)
        pvpResults.push(pkmn)
      }
      if (noPvp) {
        finalResults.push(pkmn)
      }
    })

    // second query for pvp
    if (pvp && queryPvp) {
      const pvpQuery = this.query()
        .select(['*', raw(true).as('pvpCheck')])
        .where('expire_timestamp', '>=', ts)
        .andWhereBetween('lat', [args.minLat, args.maxLat])
        .andWhereBetween('lon', [args.minLon, args.maxLon])
        .whereNotIn('id', listOfIds)
      if (type === 'chuck') {
        pvpQuery.whereNotNull('pvp')
      } else {
        pvpQuery.andWhere(pvpBuilder => {
          pvpBuilder.whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        })
      }
      pvpResults.push(...await pvpQuery)
    }

    const getParsedPvp = (pokemon) => {
      if (type === 'chuck') {
        return JSON.parse(pokemon.pvp)
      }
      const parsed = {}
      const keys = ['great', 'ultra']
      keys.forEach(league => {
        if (pokemon[`pvp_rankings_${league}_league`]) {
          parsed[league] = JSON.parse(pokemon[`pvp_rankings_${league}_league`])
        }
      })
      return parsed
    }

    // filter pokes with pvp data
    pvpResults.forEach(pkmn => {
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
      const parsed = getParsedPvp(pkmn)
      pkmn.cleanPvp = {}
      pkmn.bestPvp = 4096
      Object.keys(parsed).forEach(league => {
        const { filtered, best } = getRanks(league, parsed[league], filterId)
        if (filtered.length > 0) {
          pkmn.cleanPvp[league] = filtered
          if (best < pkmn.bestPvp) pkmn.bestPvp = best
        }
      })
      if (Object.keys(pkmn.cleanPvp).length > 0 || !pkmn.pvpCheck) {
        finalResults.push(pkmn)
      }
    })
    return finalResults
  }

  static async getMadPokemon(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const {
      onlyStandard,
    } = args.filters

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter[key].every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, notGlobal) => {
      const keys = ['atk_iv', 'def_iv', 'sta_iv', 'level']
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter, key) && ivs && notGlobal) queryBase.andWhereBetween(key, filter[key]); break
          case 'atk_iv':
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween('individual_attack', filter[key]); break
          case 'def_iv':
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween('individual_defense', filter[key]); break
          case 'sta_iv':
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween('individual_stamina', filter[key]); break
          case 'level':
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween(raw('IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL)'), filter[key]); break
        }
      })
    }
    // query builder
    const query = this.query()
      .leftJoin('trs_spawn', 'pokemon.spawnpoint_id', 'trs_spawn.spawnpoint')
      .select([
        'encounter_id as id',
        'pokemon_id',
        'pokemon.latitude as lat',
        'pokemon.longitude as lon',
        'individual_attack as atk_iv',
        'individual_defense as def_iv',
        'individual_stamina as sta_iv',
        'move_1',
        'move_2',
        'cp',
        'weight',
        'height as size',
        'gender',
        'form',
        'costume',
        'weather_boosted_condition as weather',
        'calc_endminsec',
        raw('Unix_timestamp(Convert_tz(disappear_time, "+00:00", @@global.time_zone)) AS expire_timestamp'),
        raw('IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL) as iv'),
        raw('IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL) as level'),
        raw('Unix_timestamp(Convert_tz(last_modified, "+00:00", @@global.time_zone)) AS updated'),
      ])
      .where(raw('Unix_timestamp(Convert_tz(disappear_time, "+00:00", @@global.time_zone))'), '>=', ts)
      .andWhereBetween('pokemon.latitude', [args.minLat, args.maxLat])
      .andWhereBetween('pokemon.longitude', [args.minLon, args.maxLon])
      .andWhere(ivOr => {
        for (const [pkmn, filter] of Object.entries(args.filters)) {
          if (pkmn.includes('-')) {
            const [id, form] = pkmn.split('-')
            const finalForm = masterfile[id].default_form_id == form ? [0, form] : [form]
            ivOr.orWhere(poke => {
              poke.where('pokemon_id', id)
              poke.whereIn('form', finalForm)
              if (ivs || stats || pvp) {
                generateSql(poke, filter, true)
              }
            })
          } else if (pkmn === 'onlyIvOr' && (ivs || stats || pvp)) {
            ivOr.whereBetween(raw('IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL)'), (ivs ? filter.iv : onlyStandard.iv))
            generateSql(ivOr, filter)
          }
        }
      })

    const results = await query

    // form checker/normalizer
    return results.map(pkmn => {
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      if (pkmn.calc_endminsec) {
        pkmn.expire_timestamp_verified = true
      }
      return pkmn
    })
  }

  static async getLegacy(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
    return legacyFilter(results, args, perms)
  }

  static async getAvailablePokemon() {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select('pokemon_id as id', 'form', 'expire_timestamp as time')
      .orderBy('pokemon_id', 'asc')
      .where('expire_timestamp', '>=', ts)
    // .groupBy('pokemon_id', 'form')
    return results.map(pkmn => {
      if (pkmn.form === 0) {
        const formId = masterfile[pkmn.pokemon_id].default_form_id
        if (formId) pkmn.form = formId
      }
      return `${pkmn.pokemon_id}-${pkmn.form}`
    })
  }
}

module.exports = Pokemon
