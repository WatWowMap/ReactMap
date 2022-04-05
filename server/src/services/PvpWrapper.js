const Ohbem = require('ohbem')
const NodeCache = require('node-cache')

const { api: { pvp } } = require('./config')

class PvpWrapper extends Ohbem {
  constructor(config) {
    const leagueObj = Object.fromEntries(config.leagues.map(league => [league.name, league.cp]))
    const hasLittle = config.leagues.find(league => league.name === 'little')
    if (hasLittle) {
      leagueObj.little = hasLittle.littleCupRules ? 500 : { little: false, cap: 500 }
    }
    super({
      leagues: leagueObj,
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
    try {
      const key = `${pokemon.id},${pokemon.updated}`
      if (this.rmCache.has(key)) return this.rmCache.get(key)

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
      if (pokemon.pokemon_id !== 132) {
        // Skip ditto
        // eslint-disable-next-line no-console
        console.error('[PKMN] Unable to process PVP Stats for Pokemon with ID#: ', pokemon.id, `#${pokemon.pokemon_id} - ${pokemon.form}`, '\n', e.message)
      }
      return {}
    }
  }
}

module.exports = pvp.reactMapHandlesPvp ? new PvpWrapper(pvp) : null
