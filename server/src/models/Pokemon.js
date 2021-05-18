/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')
const legacyFilter = require('../services/legacyFilter')

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
    const query = this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])

    // checks if IVs/Stats are s  et to default and skips them if so
    const arrayCheck = (filter, key) => filter.every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, isPvp, pkmn, forms) => {
      const keys = isPvp ? ['gl', 'ul'] : ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv']
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter[key], key) && stats) queryBase.andWhereBetween(key, filter[key]); break
          case 'iv':
            if (!arrayCheck(filter[key], key) && ivs && pkmn) queryBase.andWhereBetween(key, filter[key]); break
          case 'gl':
          case 'ul':
            if (!arrayCheck(filter[key], key) && pvp) {
              const dbKey = key === 'gl' ? 'great' : 'ultra'
              if (pkmn) {
                queryBase.orWhere(pvpPoke => {
                  pvpPoke.where('pokemon_id', pkmn)
                    .whereIn('form', forms)
                    .whereNotNull(`pvp_rankings_${dbKey}_league`)
                })
              } else {
                queryBase.orWhere(ivOrPvp => {
                  ivOrPvp.whereNotNull(`pvp_rankings_${dbKey}_league`)
                })
              }
            } break
        }
      })
    }

    query.andWhere(ivOr => {
      for (const [pkmn, filter] of Object.entries(args.filters)) {
        if (pkmn.includes('-') && !onlyExcludeList.includes(pkmn)) {
          const [id, form] = pkmn.split('-')
          const finalForm = masterfile[id].default_form_id == form ? [0, form] : [form]
          ivOr.orWhere(poke => {
            poke.where('pokemon_id', id)
            poke.whereIn('form', finalForm)
            if (ivs || stats) {
              generateSql(poke, filter, false, id, finalForm)
            }
          })
        } else if (pkmn === 'onlyIvOr' && (ivs || stats)) {
          ivOr.whereBetween('iv', (ivs ? filter.iv : onlyStandard.iv))
          generateSql(ivOr, filter, false)
        }
      }
    })

    const results = await query
    const finalResults = []
    const listOfIds = []

    results.forEach(pkmn => {
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
      if (pvp && (pkmn.pvp_rankings_great_league || pkmn.pvp_rankings_ultra_league)) {
        pkmn.great = JSON.parse(pkmn.pvp_rankings_great_league)
        pkmn.ultra = JSON.parse(pkmn.pvp_rankings_ultra_league)
      }
      if (!onlyExcludeList.includes(filterId)) {
        finalResults.push(pkmn)
        listOfIds.push(pkmn.id)
      }
    })

    const getMinMax = (filterId, stat) => {
      const min = args.filters[filterId][stat][0] <= onlyIvOr[stat][0]
        ? args.filters[filterId][stat][0] : onlyIvOr[stat][0]

      const max = args.filters[filterId][stat][1] >= onlyIvOr[stat][1]
        ? args.filters[filterId][stat][1] : onlyIvOr[stat][1]

      return [min, max]
    }

    if (pvp) {
      const pvpQuery = this.query()
        .select(['*', raw(true).as('pvp')])
        .where('expire_timestamp', '>=', ts)
        .andWhereBetween('lat', [args.minLat, args.maxLat])
        .andWhereBetween('lon', [args.minLon, args.maxLon])
        .whereNotIn('id', listOfIds)
        .andWhere(pvpOr => {
          for (const [pkmn, filter] of Object.entries(args.filters)) {
            if (pkmn.includes('-') && !onlyExcludeList.includes(pkmn)) {
              const [id, form] = pkmn.split('-')
              const finalForm = masterfile[id].default_form_id == form ? [0, form] : [form]
              pvpOr.orWhere(poke => {
                poke.where('pokemon_id', id)
                poke.whereIn('form', finalForm)
                if (ivs || stats) {
                  generateSql(poke, filter, true, id, finalForm)
                }
              })
            } else if (pkmn === 'onlyIvOr' && (ivs || stats)) {
              generateSql(pvpOr, filter, true)
            }
          }
        })
      const pvpResults = await pvpQuery.debug()
      pvpResults.forEach(pkmn => {
        if (pkmn.form === 0) {
          pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
        }
        const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
        if (pkmn.pvp_rankings_great_league) {
          const gl = JSON.parse(pkmn.pvp_rankings_great_league)
          const [min, max] = args.filters[filterId] ? getMinMax(filterId, 'gl') : onlyIvOr.gl
          const check = (rank) => (rank <= max && rank >= min)
          const ranks = gl.map(x => x.rank)
          pkmn.hasGl = ranks.some(check)
          if (pkmn.hasGl) pkmn.great = gl
        }
        if (!pkmn.hasGl && pkmn.pvp_rankings_ultra_league) {
          const ul = JSON.parse(pkmn.pvp_rankings_ultra_league)
          const [min, max] = args.filters[filterId] ? getMinMax(filterId, 'ul') : onlyIvOr.ul
          const check = (rank) => (rank <= max && rank >= min)
          const ranks = ul.map(x => x.rank)
          pkmn.hasUl = ranks.some(check)
          if (pkmn.hasUl) pkmn.ultra = ul
        }
        if (!onlyExcludeList.includes(filterId) && (pkmn.hasGl || pkmn.hasUl)) {
          finalResults.push(pkmn)
        }
      })
    }

    return finalResults
  }

  static async getLegacy(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = this.query()
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
