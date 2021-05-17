/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { stats, iv: ivs, pvp } = perms
    const {
      onlyStandard, onlyExcludeList,
    } = args.filters
    const keys = ['iv', 'level', 'atk_iv', 'def_iv', 'sta_iv', 'gl', 'ul']
    const query = this.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])

    // checks if IVs/Stats are set to default and skips them if so
    const arrayCheck = (filter, key) => filter.every((v, i) => v === onlyStandard[key][i])

    // generates specific SQL for each slider that isn't set to default, along with perm checks
    const generateSql = (queryBase, filter, pkmn, bool) => {
      keys.forEach(key => {
        switch (key) {
          default:
            if (!arrayCheck(filter[key], key) && stats) queryBase.andWhereBetween(key, filter[key]); break
          case 'iv':
            if (!arrayCheck(filter[key], key) && ivs && bool) queryBase.andWhereBetween(key, filter[key]); break
          case 'gl':
          case 'ul':
            if (!arrayCheck(filter[key], key) && pvp) {
              const [min, max] = filter[key]
              const dbKey = key === 'gl' ? 'great' : 'ultra'
              // Temporary until I find a better solution for filtering arrays
              for (let i = 0; i < 3; i += 1) {
                queryBase.orWhere(raw(`pvp_rankings_${dbKey}_league->"$[${i}].rank" between ${min} and ${max}`))
              }
            } break
        }
      })
    }

    query.andWhere(ivOr => {
      for (const [pkmn, filter] of Object.entries(args.filters)) {
        if (pkmn.includes('-') && !onlyExcludeList.includes(pkmn)) {
          const [id, form] = pkmn.split('-')
          ivOr.orWhere(poke => {
            poke.where('pokemon_id', id)
            if (masterfile[id].default_form_id == form) {
              poke.whereIn('form', [form, 0])
            } else {
              poke.where('form', form)
            }
            if (ivs || stats) {
              generateSql(poke, filter, pkmn, true)
            }
          })
        } else if (pkmn === 'onlyIvOr' && (ivs || stats)) {
          ivOr.whereBetween('iv', (ivs ? filter.iv : onlyStandard.iv))
          generateSql(ivOr, filter, pkmn)
        }
      }
    })

    const results = await query

    const finalResults = []
    results.forEach(pkmn => {
      if (pkmn.form === 0) {
        pkmn.form = masterfile[pkmn.pokemon_id].default_form_id
      }
      if (!onlyExcludeList.includes(`${pkmn.pokemon_id}-${pkmn.form}`)) {
        finalResults.push(pkmn)
      }
    })

    return finalResults
  }

  static async getAvailablePokemon() {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .distinct('pokemon_id', 'form')
      .orderBy('pokemon_id', 'asc')
      .where('expire_timestamp', '>=', ts)
      .debug()
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
