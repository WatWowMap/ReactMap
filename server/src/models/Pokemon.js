/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')
const legacyFilter = require('../services/legacyFilter')
const {
  api: { pvpMinCp },
  database: {
    settings:
    { leagues },
  },
} = require('../services/config')
const dbSelection = require('../services/functions/dbSelection')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static get idColumn() {
    return dbSelection('pokemon') === 'mad'
      ? 'encounter_id' : 'id'
  }

  static async getPokemon(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const {
      onlyStandard, onlyIvOr, onlyXlKarp, onlyXsRat, onlyZeroIv,
    } = args.filters
    const dbType = dbSelection('pokemon')
    const levelCalc = 'IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL)'
    const ivCalc = 'IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL)'

    let queryPvp = false

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    const check = (pkmn, league, min, max) => {
      const rankCheck = pkmn.rank <= max && pkmn.rank >= min
      const cpCheck = dbType === 'chuck' ? true : pkmn.cp >= pvpMinCp[league]
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

    // decide if the Pokemon passes global or local filter
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

    // parse PVP JSON(s)
    const getParsedPvp = (pokemon) => {
      if (dbType === 'chuck') {
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

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter[key].every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, notGlobal) => {
      const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', ...leagues]
      const madKeys = [ivCalc, raw(levelCalc), 'individual_attack', 'individual_stamina', 'individual_defense']

      keys.forEach((key, i) => {
        switch (key) {
          default:
            if (!arrayCheck(filter, key) && dbType !== 'mad') {
              queryPvp = true
              // makes sure the base query doesn't return everything if only PVP stats are selected for the Pokemon
              if (notGlobal) {
                queryBase.whereNull('pokemon_id')
              }
            } break
          case 'iv':
            if (!arrayCheck(filter, key) && ivs && notGlobal) {
              queryBase.andWhereBetween(isMad ? raw(ivCalc) : key, filter[key])
            } break
          case 'level':
          case 'atk_iv':
          case 'def_iv':
          case 'sta_iv':
            if (!arrayCheck(filter, key) && stats) {
              queryBase.andWhereBetween(isMad ? madKeys[i] : key, filter[key])
            } break
        }
      })
    }

    // query builder
    const query = this.query()
    if (isMad) {
      query.join('trs_spawn', 'pokemon.spawnpoint_id', 'trs_spawn.spawnpoint')
        .select([
          'encounter_id AS id',
          'pokemon_id',
          'pokemon.latitude AS lat',
          'pokemon.longitude AS lon',
          'individual_attack AS atk_iv',
          'individual_defense AS def_iv',
          'individual_stamina AS sta_iv',
          'move_1',
          'move_2',
          'cp',
          'weight',
          'height AS size',
          'gender',
          'form',
          'costume',
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
    }
    query.where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .andWhereBetween(isMad ? 'pokemon.latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'pokemon.longitude' : 'lon', [args.minLon, args.maxLon])
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
            ivOr.whereBetween(isMad ? raw(ivCalc) : 'iv', (ivs ? filter.iv : onlyStandard.iv))
            generateSql(ivOr, filter)
          }
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
          ivOr.orWhere('iv', 0)
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
      if (pvp && dbType !== 'mad'
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
      if (dbType === 'chuck') {
        pvpQuery.whereNotNull('pvp')
      } else {
        pvpQuery.andWhere(pvpBuilder => {
          pvpBuilder.whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        })
      }
      pvpResults.push(...await pvpQuery)
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

  static async getLegacy(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
    return legacyFilter(results, args, perms)
  }

  static async getAvailablePokemon(isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select('pokemon_id', 'form')
      .where(isMad ? 'disappear_time' : 'expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy('pokemon_id', 'form')
      .orderBy('pokemon_id', 'form')
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
