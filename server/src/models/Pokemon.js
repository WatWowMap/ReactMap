/* eslint-disable no-eval */
/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    let count = 1
    let query = `this.query()
        .where("expire_timestamp", ">=", ${ts})
        .andWhereBetween("lat", [${args.minLat}, ${args.maxLat}])
        .andWhereBetween("lon", [${args.minLon}, ${args.maxLon}])`

    for (const [pkmn, filter] of Object.entries(args.filters)) {
      const pokemonId = pkmn.split('-')[0]

      const indicator = count ? 'and' : 'or'

      query += `
        .${indicator}Where(builder => {
          builder.where("pokemon_id", ${pokemonId})
            .andWhereBetween("iv", [${filter.iv[0]}, ${filter.iv[1]}])
            .andWhereBetween("level", [${filter.level[0]}, ${filter.level[1]}])
            .andWhereBetween("atk_iv", [${filter.atk[0]}, ${filter.atk[1]}])
            .andWhereBetween("def_iv", [${filter.def[0]}, ${filter.def[1]}])
            .andWhereBetween("sta_iv", [${filter.sta[0]}, ${filter.sta[1]}])`
      if (!count) query += '})'
      count = 0
    }
    query += '})'

    // eslint-disable-next-line no-return-await
    return count ? [] : await eval(query)
  }
}

module.exports = Pokemon
