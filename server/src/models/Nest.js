/* eslint-disable no-nested-ternary */
const { Model } = require('objection')
const i18next = require('i18next')

const { Event, Db } = require('../services/initialization')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit, queryLimits },
  defaultFilters: {
    nests: { avgFilter },
  },
} = require('../services/config')

module.exports = class Nest extends Model {
  static get tableName() {
    return 'nests'
  }

  static get idColumn() {
    return 'nest_id'
  }

  /**
   *
   * @param {import('../types').Permissions} perms
   * @param {object} args
   * @param {import('../types').DbContext} ctx
   * @returns
   */
  static async getAll(perms, args, { polygon }) {
    const { areaRestrictions } = perms
    const { minLat, minLon, maxLat, maxLon, filters } = args
    const pokemon = []
    Object.keys(filters).forEach((pkmn) => {
      if (!pkmn.startsWith('o')) {
        pokemon.push(pkmn.split('-')[0])
      }
    })
    const query = this.query()
      .select(['*', 'nest_id AS id'])
      .whereNotNull('pokemon_id')
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
      .whereIn('pokemon_id', pokemon)
    if (!avgFilter.every((x, i) => x === filters.onlyAvgFilter[i])) {
      query.andWhereBetween('pokemon_avg', filters.onlyAvgFilter)
    }
    if (polygon) {
      query.select(this.raw('ST_AsGeoJSON(polygon)').as('polygon'))
    }
    if (!getAreaSql(query, areaRestrictions, filters.onlyAreas || [])) {
      return []
    }
    const results = await query.limit(queryLimits.nests)

    const submittedNameMap = await Db.query(
      'NestSubmission',
      'getAllByIds',
      results.map((x) => x.nest_id),
    ).then((submissions) =>
      Object.fromEntries(submissions.map((x) => [x.nest_id, x])),
    )

    /** @type {Nest[]} */
    const withNames = results.map((x) => ({
      ...x,
      name: submittedNameMap[x.id]?.name || x.name,
      submitted_by: submittedNameMap[x.id]?.submitted_by,
    }))

    return Nest.secondaryFilter(withNames, filters, polygon)
  }

  /**
   *
   * @param {Nest[]} queryResults
   * @param {object} filters
   * @param {boolean} polygon
   * @returns {Nest[]}
   */
  static secondaryFilter(queryResults, filters, polygon) {
    const returnedResults = []
    queryResults.forEach((pkmn) => {
      if (pkmn.pokemon_form == 0 || pkmn.pokemon_form === null) {
        const formId = Event.masterfile.pokemon[pkmn.pokemon_id].defaultFormId
        if (formId) pkmn.pokemon_form = formId
      }
      pkmn.polygon_path = polygon
        ? typeof pkmn.polygon === 'string' && pkmn.polygon
          ? pkmn.polygon
          : JSON.stringify(pkmn.polygon || { type: 'Polygon', coordinates: [] })
        : JSON.stringify({
            type: 'Polygon',
            coordinates: JSON.parse(pkmn.polygon_path || '[]').map((line) =>
              line.map((point) => [point[1], point[0]]),
            ),
          })
      if (filters[`${pkmn.pokemon_id}-${pkmn.pokemon_form}`]) {
        returnedResults.push(pkmn)
      }
    })
    return returnedResults
  }

  /**
   * Returns available nesting species from the db
   * @returns
   */
  static async getAvailable() {
    const results = await this.query()
      .select(['pokemon_id', 'pokemon_form'])
      .whereNotNull('pokemon_id')
      .groupBy('pokemon_id', 'pokemon_form')
      .orderBy('pokemon_id', 'asc')

    return {
      available: results.map((pokemon) => {
        if (pokemon.pokemon_form == 0 || pokemon.pokemon_form === null) {
          return `${pokemon.pokemon_id}-${
            Event.masterfile.pokemon[pokemon.pokemon_id].defaultFormId || 0
          }`
        }
        return `${pokemon.pokemon_id}-${pokemon.pokemon_form || 0}`
      }),
    }
  }

  /**
   *
   * @param {import('../types').Permissions} perms
   * @param {object} args
   * @param {import('../types').DbContext} ctx
   * @param {import('objection').Raw} distance
   * @returns
   */
  static async search(perms, args, { isMad }, distance) {
    const { search, locale, onlyAreas = [] } = args
    const pokemonIds = Object.keys(Event.masterfile.pokemon).filter((pkmn) =>
      i18next.t(`poke_${pkmn}`, { lng: locale }).toLowerCase().includes(search),
    )

    const submittedNests = await Db.query('NestSubmission', 'search', search)

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
      .whereNotNull('pokemon_id')
      .where((builder) => {
        builder
          .whereIn('pokemon_id', pokemonIds)
          .orWhereIn(
            'nest_id',
            submittedNests.map((x) => x.id),
          )
          .orWhere('name', 'like', `%${search}%`)
      })
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
  }

  /**
   *
   * @param {number} id
   * @returns
   */
  static async getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
