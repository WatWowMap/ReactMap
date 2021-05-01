/* eslint-disable no-eval */
/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    let query = `this.query()
        .where("expire_timestamp", ">=", ${ts})
        .andWhereBetween("lat", [${args.minLat}, ${args.maxLat}])
        .andWhereBetween("lon", [${args.minLon}, ${args.maxLon}])`

    for (const [pkmn, filter] of Object.entries(args.filters)) {
      const {
        iv, level, atk, def, sta,
      } = filter
      const base = `.andWhereBetween("level", [${level}])
        .andWhereBetween("atk_iv", [${atk}])
        .andWhereBetween("def_iv", [${def}])
        .andWhereBetween("sta_iv", [${sta}])`

      if (pkmn === 'ivOr') {
        query += `
          .andWhere(builder => {
            builder.whereBetween("iv", [${iv}])
            ${base}`
      } else {
        const pokemonId = pkmn.split('-')[0]
        query += `
          .orWhere(builder => {
            builder.where("pokemon_id", ${pokemonId})
              .andWhereBetween("iv", [${filter.iv}])
            ${base}})`
      }
    }
    query += '})'
    const results = await eval(query)
    const { length } = results
    const {
      iv, level, atk, def, sta,
    } = args.filters.ivOr

    const secondaryFilter = queryResults => {
      const filteredResults = []
      for (let i = 0; i < length; i += 1) {
        const pkmn = queryResults[i]
        if (pkmn.form === 0) {
          const formId = masterfile[pkmn.pokemon_id].default_form_id
          if (formId) pkmn.form = formId
        }
        const ivPass = pkmn.iv >= iv[0] && pkmn.iv <= iv[1]
        const levelPass = pkmn.level >= level[0] && pkmn.level <= level[1]
        const atkPass = pkmn.atk_iv >= atk[0] && pkmn.atk_iv <= atk[1]
        const defPass = pkmn.def_iv >= def[0] && pkmn.def_iv <= def[1]
        const staPass = pkmn.sta_iv >= sta[0] && pkmn.sta_iv <= sta[1]

        if (args.filters[`${pkmn.pokemon_id}-${pkmn.form}`]
          || (ivPass && levelPass && atkPass && defPass && staPass)) {
          filteredResults.push(pkmn)
        }
      }
      return filteredResults
    }
    return secondaryFilter(results)
  }
}

module.exports = Pokemon
