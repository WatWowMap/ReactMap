import { Model } from 'objection'

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }

  static async getPokemon(args) {
    const ts = Math.floor((new Date).getTime() / 1000)
    let count = 1
    let query = `this.query()
        .where("expire_timestamp", ">=", ${ts})
        .andWhereBetween("lat", [${args.minLat}, ${args.maxLat}])
        .andWhereBetween("lon", [${args.minLon}, ${args.maxLon}])`

    for (const [pkmn, filter] of Object.entries(args.filters)) {
      const pokemon_id = pkmn.split('-')[0]

      const indicator = count ? 'and' : 'or'

      query += `
        .${indicator}Where(builder => {
          builder.where("pokemon_id", ${pokemon_id})
            .andWhereBetween("iv", [${filter.iv[0]}, ${filter.iv[1]}])
            .andWhereBetween("level", [${filter.level[0]}, ${filter.level[1]}])
            .andWhereBetween("atk_iv", [${filter.atk[0]}, ${filter.atk[1]}])
            .andWhereBetween("def_iv", [${filter.def[0]}, ${filter.def[1]}])
            .andWhereBetween("sta_iv", [${filter.sta[0]}, ${filter.sta[1]}])`
      if (!count) query += `})`
      count = 0
    }
    query += `})`

    return count ? [] : await eval(query)
  }
}

export default Pokemon