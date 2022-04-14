/* eslint-disable no-console */
const Ohbem = require('ohbem')
const NodeCache = require('node-cache')

module.exports = class PvpWrapper extends Ohbem {
  constructor(config) {
    super({
      leagues: config.leagueObj,
      pokemonData: {},
      levelCaps: config.levels,
      cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    })
    this.rmCache = new NodeCache({ stdTTL: 60 * 60 * 1.5 });

    (async () => {
      this.updatePokemonData(await Ohbem.fetchPokemonData())
    })()
  }

  resultWithCache(pokemon, currentTs) {
    if (pokemon.pokemon_id === 132) return {}

    const key = `${pokemon.id},${pokemon.updated}`
    if (this.rmCache.has(key)) return this.rmCache.get(key)
    try {
      const result = this.queryPvPRank(
        pokemon.pokemon_id,
        pokemon.form,
        pokemon.costume,
        pokemon.gender,
        pokemon.atk_iv,
        pokemon.def_iv,
        pokemon.sta_iv,
        pokemon.level,
      )
      this.rmCache.set(key, result, pokemon.expire_timestamp - currentTs)
      return result
    } catch (e) {
      console.error('[PKMN] Unable to process PVP Stats for Pokemon with ID#: ', pokemon.id, `#${pokemon.pokemon_id} - ${pokemon.form}`, '\n', e.message)
      return {}
    }
  }
}
