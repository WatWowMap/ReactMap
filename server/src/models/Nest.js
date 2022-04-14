const { Model } = require('objection')
const i18next = require('i18next')
const { Event } = require('../services/initialization')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit, queryLimits },
  defaultFilters: { nests: { avgFilter } },
} = require('../services/config')
const fetchNests = require('../services/api/fetchNests')

module.exports = class Nest extends Model {
  static get tableName() {
    return 'nests'
  }

  static get idColumn() {
    return 'nest_id'
  }

  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const pokemon = []
    Object.keys(args.filters).forEach(pkmn => {
      if (!pkmn.startsWith('o')) {
        pokemon.push(pkmn.split('-')[0])
      }
    })
    const query = this.query()
      .select(['*', 'nest_id AS id'])
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .whereIn('pokemon_id', pokemon)
    if (!avgFilter.every((x, i) => x === args.filters.onlyAvgFilter[i])) {
      query.andWhereBetween('pokemon_avg', args.filters.onlyAvgFilter)
    }
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, false, 'nests')
    }
    const results = await query.limit(queryLimits.nests)

    const fixedForms = queryResults => {
      const returnedResults = []
      queryResults.forEach(pkmn => {
        if (pkmn.pokemon_form == 0 || pkmn.pokemon_form === null) {
          const formId = Event.masterfile.pokemon[pkmn.pokemon_id].defaultFormId
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

  static async getAvailable() {
    const results = await this.query()
      .select(['pokemon_id', 'pokemon_form'])
      .groupBy('pokemon_id', 'pokemon_form')
      .orderBy('pokemon_id', 'asc')

    return results.map(pokemon => {
      if (pokemon.pokemon_form == 0 || pokemon.pokemon_form === null) {
        return `${pokemon.pokemon_id}-${Event.masterfile.pokemon[pokemon.pokemon_id].defaultFormId || 0}`
      }
      return `${pokemon.pokemon_id}-${pokemon.pokemon_form || 0}`
    })
  }

  static async search(perms, args, { isMad }, distance) {
    const { search, locale } = args
    const pokemonIds = Object.keys(Event.masterfile.pokemon).filter(pkmn => (
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
    if (perms.areaRestrictions?.length) {
      getAreaSql(query, perms.areaRestrictions, isMad, 'nests')
    }
    const results = await query

    return results.length ? results : fetchNests()
  }

  static getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
