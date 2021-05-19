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

    // quick check to make sure no Pokemon are returned when none are enabled for users with only Pokemon perms
    if (!ivs && !stats && !pvp) {
      const noPokemonSelect = Object.keys(args.filters).find(x => x.charAt(0) !== 'o')
      if (!noPokemonSelect) return []
    }

    const query = this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter.every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, notGlobal) => {
      const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', 'gl', 'ul']
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter[key], key) && stats) queryBase.andWhereBetween(key, filter[key]); break
          case 'iv':
            if (!arrayCheck(filter[key], key) && ivs && notGlobal) queryBase.andWhereBetween(key, filter[key]); break
          case 'gl':
          case 'ul':
            if (!arrayCheck(filter[key], key)) {
              // makes sure the base query doesn't return everything if only GL and UL stats are selected for the Pokemon
              queryBase.whereNull('pokemon_id')
            } break
        }
      })
    }

    // query builder
    query.andWhere(ivOr => {
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
    const listOfIds = []

    // form checker
    results.forEach(pkmn => {
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      if (pvp && (pkmn.pvp_rankings_great_league || pkmn.pvp_rankings_ultra_league)) {
        pkmn.great = JSON.parse(pkmn.pvp_rankings_great_league)
        pkmn.ultra = JSON.parse(pkmn.pvp_rankings_ultra_league)
      }
      if (!onlyExcludeList.includes(`${pkmn.pokemon_id}-${pkmn.form}`)) {
        finalResults.push(pkmn)
        if (pvp) {
          listOfIds.push(pkmn.id)
        }
      }
    })

    // second query for pvp
    if (pvp) {
      const getMinMax = (filterId, stat) => {
        const min = args.filters[filterId][stat][0] <= onlyIvOr[stat][0]
          ? args.filters[filterId][stat][0] : onlyIvOr[stat][0]

        const max = args.filters[filterId][stat][1] >= onlyIvOr[stat][1]
          ? args.filters[filterId][stat][1] : onlyIvOr[stat][1]

        return [min, max]
      }

      const check = (pkmn, league, min, max) => (
        pkmn.rank <= max && pkmn.rank >= min
        && pkmn.cp >= pvpMinCp[league]
      )

      const getRanks = (league, data, filterId) => {
        const parsed = JSON.parse(data)
        const [min, max] = args.filters[filterId] ? getMinMax(filterId, league) : onlyIvOr[league]
        return parsed.filter(pkmn => check(pkmn, league, min, max))
      }

      const pvpResults = await this.query()
        .select(['*', raw(true).as('pvp')])
        .where('expire_timestamp', '>=', ts)
        .andWhereBetween('lat', [args.minLat, args.maxLat])
        .andWhereBetween('lon', [args.minLon, args.maxLon])
        .whereNotIn('id', listOfIds)
        .andWhere(pvpBuilder => {
          pvpBuilder.whereNotNull('pvp_rankings_great_league')
            .orWhereNotNull('pvp_rankings_ultra_league')
        })

      pvpResults.forEach(pkmn => {
        if (pkmn.form === 0) {
          pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
        }
        const filterId = `${pkmn.pokemon_id}-${pkmn.form}`

        if (pkmn.pvp_rankings_great_league) {
          const rankCheck = getRanks('gl', pkmn.pvp_rankings_great_league, filterId)
          pkmn.great = rankCheck.length > 0 ? rankCheck : undefined
        }
        if (pkmn.pvp_rankings_ultra_league) {
          const rankCheck = getRanks('ul', pkmn.pvp_rankings_ultra_league, filterId)
          pkmn.ultra = rankCheck.length > 0 ? rankCheck : undefined
        }
        if (!onlyExcludeList.includes(filterId) && (pkmn.great || pkmn.ultra)) {
          finalResults.push(pkmn)
        }
      })
    }

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
