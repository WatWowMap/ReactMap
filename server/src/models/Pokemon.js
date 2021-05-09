/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const { onlyStandard, onlyIvOr } = args.filters
    const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv']

    const query = this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter.every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, bool) => {
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter[key], key) && stats) queryBase.andWhereBetween(key, filter[key]); break
          case 'iv':
            if (!arrayCheck(filter[key], key) && ivs && bool) queryBase.andWhereBetween(key, filter[key]); break
        }
      })
    }

    // adds correct form id if missing & checks if they were actually requested
    const formFixer = queryResults => {
      const fixedResults = []
      const ivToCompare = ivs ? onlyIvOr : onlyStandard
      const { length } = queryResults

      for (let i = 0; i < length; i += 1) {
        const pkmn = queryResults[i]
        if (pvp) {
          if (pkmn.pvp_rankings_great_league !== null) {
            pkmn.great = JSON.parse(pkmn.pvp_rankings_great_league)
          }
          if (pkmn.pvp_rankings_ultra_league !== null) {
            pkmn.ultra = JSON.parse(pkmn.pvp_rankings_ultra_league)
          }
        }
        if (pkmn.form === 0) {
          const formId = masterfile[pkmn.pokemon_id].default_form_id
          if (formId) pkmn.form = formId
          if (!ivs && !stats
            && args.filters[`${pkmn.pokemon_id}-${pkmn.form}`]) {
            fixedResults.push(pkmn)
          } else {
            const ivOrCheck = keys.map(key => (
              pkmn[key] >= ivToCompare[key][0] && pkmn[key] <= ivToCompare[key][1]
            ))
            if (ivOrCheck.every(val => val)
              || args.filters[`${pkmn.pokemon_id}-${pkmn.form}`]) {
              fixedResults.push(pkmn)
            }
          }
        } else {
          fixedResults.push(pkmn)
        }
      }
      return queryResults
    }

    // does a faster sql query if the user is only filtering by pokemon
    if (!ivs && !stats) {
      const pokemonList = []
      Object.keys(args.filters).forEach(pkmn => {
        if (pkmn.includes('-')) pokemonList.push(pkmn.split('-')[0])
      })
      query.whereIn('pokemon_id', pokemonList)
      const results = await query
      return formFixer(results)
    }

    // generates sql based off of ivOr and individual filters
    query.andWhere(ivOr => {
      for (const [pkmn, filter] of Object.entries(args.filters)) {
        if (pkmn.includes('-')) {
          ivOr.orWhere(poke => {
            poke.where('pokemon_id', pkmn.split('-')[0])
            generateSql(poke, filter, true)
          })
        } else if (pkmn === 'onlyIvOr') {
          ivOr.whereBetween('iv', (ivs ? filter.iv : onlyStandard.iv))
          generateSql(ivOr, filter)
        }
      }
    })

    const results = await query
    return formFixer(results)
  }
}

module.exports = Pokemon
