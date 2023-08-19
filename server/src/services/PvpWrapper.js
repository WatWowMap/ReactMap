const Ohbem = require('ohbem')
const NodeCache = require('node-cache')
const config = require('config')
const { log, HELPERS } = require('@rm/logger')

module.exports = class PvpWrapper extends Ohbem {
  constructor() {
    super({
      leagues: config.getSafe('api.pvp.leagueObj'),
      pokemonData: {},
      levelCaps: config.getSafe('api.pvp.levels'),
      cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    })
    this.rmCache = new NodeCache({ stdTTL: 60 * 60 * 1.5 })
    ;(async () => {
      this.updatePokemonData(await Ohbem.fetchPokemonData())
    })()
  }

  /**
   * @param {import("@rm/types").Pokemon} pokemon
   * @param {number} currentTs
   * @returns {import("@rm/types").CleanPvp}
   */
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
      log.error(
        HELPERS.pokemon,
        'Unable to process PVP Stats for Pokemon with ID#: ',
        pokemon.id,
        `${pokemon.pokemon_id}-${pokemon.form}`,
        '\n',
        e,
        pokemon,
      )
      return {}
    }
  }
}
