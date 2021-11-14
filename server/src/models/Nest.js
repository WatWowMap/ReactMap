const { Model } = require('objection')
const i18next = require('i18next')
const { pokemon: masterfile } = require('../data/masterfile.json')
const getAreaSql = require('../services/functions/getAreaSql')
const { pokemon: masterPkmn } = require('../data/masterfile.json')
const { api: { searchResultsLimit } } = require('../services/config')

class Nest extends Model {
  static get tableName() {
    return 'nests'
  }

  static get idColumn() {
    return 'nest_id'
  }

  static async getNestingSpecies(args, perms) {
    const { areaRestrictions } = perms
    const pokemon = []
    Object.keys(args.filters).forEach(pkmn => {
      if (!pkmn.startsWith('g')) {
        pokemon.push(pkmn.split('-')[0])
      }
    })
    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .whereIn('pokemon_id', pokemon)
    if (areaRestrictions?.length > 0) {
      getAreaSql(query, areaRestrictions)
    }
    const results = await query

    const fixedForms = queryResults => {
      const returnedResults = []
      queryResults.forEach(pkmn => {
        if (pkmn.pokemon_form == 0 || pkmn.pokemon_form === null) {
          const formId = masterfile[pkmn.pokemon_id].defaultFormId
          if (formId) pkmn.pokemon_form = formId
        }
        if (args.filters[`${pkmn.pokemon_id}-${pkmn.pokemon_form}`]) {
          returnedResults.push(pkmn)
        }
      })
      return returnedResults
    }
    return fixedForms(results)
  }

  static async getAvailableNestingSpecies() {
    const results = await this.query()
      .select(['pokemon_id', 'pokemon_form'])
      .groupBy('pokemon_id', 'pokemon_form')
      .orderBy('pokemon_id', 'asc')

    return results.map(pokemon => {
      if (pokemon.pokemon_form == 0 || pokemon.pokemon_form === null) {
        return `${pokemon.pokemon_id}-${masterfile[pokemon.pokemon_id].defaultFormId || 0}`
      }
      return `${pokemon.pokemon_id}-${pokemon.pokemon_form || 0}`
    })
  }

  static async search(args, perms, isMad, distance) {
    const { search, locale } = args
    const pokemonIds = Object.keys(masterPkmn).filter(pkmn => (
      i18next.t(`poke_${pkmn}`, { lng: locale }).toLowerCase().includes(search)
    ))
    const query = this.query()
      .select([
        'nest_id AS id',
        'name',
        'lat',
        'lon',
        'pokemon_id AS nest_pokemon_id',
        'pokemon_form AS nest_pokemon_form',
        distance,
      ])
      .whereIn('pokemon_id', pokemonIds)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (perms.areaRestrictions?.length > 0) {
      getAreaSql(query, perms.areaRestrictions, isMad)
    }
    return query
  }
}

module.exports = Nest
