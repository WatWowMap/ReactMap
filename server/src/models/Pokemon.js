/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')
const legacyFilter = require('../services/legacyFilter')
const { api: { pvpMinCp } } = require('../services/config')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const {
      onlyStandard, onlyExcludeList, onlyIvOr,
    } = args.filters
    let queryPvp = false
    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    const check = (pkmn, league, min, max) => (
      pkmn.rank <= max && pkmn.rank >= min
      && pkmn.cp >= pvpMinCp[league]
    )

    const getRanks = (league, data, filterId) => {
      const parsed = JSON.parse(data)
      const [min, max] = getMinMax(filterId, league)
      let best = 4096
      let worst = 1
      const filtered = parsed.filter(pkmn => {
        if (pkmn.rank < best) best = pkmn.rank
        if (pkmn.rank > worst) worst = pkmn.rank
        return check(pkmn, league, min, max)
      })
      return { filtered, best, worst }
    }

    const getMinMax = (filterId, league) => {
      const globalOn = !arrayCheck(onlyIvOr, league)
      const specificFilter = args.filters[filterId]
      const [globalMin, globalMax] = onlyIvOr[league]
      let min = 0
      let max = 0
      if (specificFilter) {
        const [pkmnMin, pkmnMax] = specificFilter[league]
        if (specificFilter && !globalOn) {
          min = pkmnMin
          max = pkmnMax
        } else if (specificFilter && globalOn) {
          min = pkmnMin <= globalMin ? pkmnMin : globalMin
          max = pkmnMax >= globalMax ? pkmnMax : globalMax
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
      const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', 'gl', 'ul']
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter, key) && stats) queryBase.andWhereBetween(key, filter[key]); break
          case 'iv':
            if (!arrayCheck(filter, key) && ivs && notGlobal) queryBase.andWhereBetween(key, filter[key]); break
          case 'gl':
          case 'ul':
            if (!arrayCheck(filter, key)) {
              queryPvp = true
              // makes sure the base query doesn't return everything if only GL and UL stats are selected for the Pokemon
              if (notGlobal) {
                queryBase.whereNull('pokemon_id')
              }
            } break
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
          if (pkmn.includes('-') && !onlyExcludeList.includes(pkmn)) {
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
      if (pvp
        && (pkmn.pvp_rankings_great_league
          || pkmn.pvp_rankings_ultra_league)) {
        noPvp = false
        listOfIds.push(pkmn.id)
        pvpResults.push(pkmn)
      }
      if (!onlyExcludeList.includes(`${pkmn.pokemon_id}-${pkmn.form}`) && noPvp) {
        finalResults.push(pkmn)
      }
    })

    // second query for pvp
    if (pvp && queryPvp) {
      pvpResults.push(...await this.query()
        .select(['*', raw(true).as('pvp')])
        .where('expire_timestamp', '>=', ts)
        .andWhereBetween('lat', [args.minLat, args.maxLat])
        .andWhereBetween('lon', [args.minLon, args.maxLon])
        .whereNotIn('id', listOfIds)
        .andWhere(pvpBuilder => {
          pvpBuilder.whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        }))
    }

    pvpResults.forEach(pkmn => {
      if (pkmn.form === 0 && pkmn.pvp) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
      pkmn.rankSum = {
        gl: {},
        ul: {},
      }
      if (pkmn.pvp_rankings_great_league) {
        const rankCheck = getRanks('gl', pkmn.pvp_rankings_great_league, filterId)
        if (rankCheck.filtered.length > 0) {
          pkmn.great = rankCheck.filtered
          pkmn.rankSum.best = rankCheck.best
          pkmn.rankSum.worst = rankCheck.worst
          pkmn.rankSum.gl.best = rankCheck.best
          pkmn.rankSum.gl.worst = rankCheck.worst
        }
      }
      if (pkmn.pvp_rankings_ultra_league) {
        const rankCheck = getRanks('ul', pkmn.pvp_rankings_ultra_league, filterId)
        if (rankCheck.filtered.length > 0) {
          pkmn.ultra = rankCheck.filtered
          if (pkmn.rankSum.best) {
            pkmn.rankSum.best = pkmn.rankSum.best > rankCheck.best ? pkmn.rankSum.best : rankCheck.best
          } else {
            pkmn.rankSum.best = rankCheck.best
          }
          if (pkmn.rankSum.worst) {
            pkmn.rankSum.worst = pkmn.rankSum.worst < rankCheck.worst ? pkmn.rankSum.worst : rankCheck.worst
          } else {
            pkmn.rankSum.worst = rankCheck.worst
          }
          pkmn.rankSum.ul.best = rankCheck.best
          pkmn.rankSum.ul.worst = rankCheck.worst
        }
      }
      if (!onlyExcludeList.includes(filterId) && ((pkmn.great || pkmn.ultra) || !pkmn.pvp)) {
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

  static async getAvailablePokemon() {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select('pokemon_id', 'form')
      .orderBy('pokemon_id', 'asc')
      .where('expire_timestamp', '>=', ts)
      .groupBy('pokemon_id', 'form')
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
