// @ts-check
const { Model } = require('objection')
const config = require('config')

const getAreaSql = require('../services/functions/getAreaSql')

const { searchResultsLimit, portalUpdateLimit, queryLimits } =
  config.getSafe('api')

module.exports = class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }

  /**
   *
   * @param {import('types').Permissions} perms
   * @param {object} args
   * @returns {Promise<import('types').FullPortal[]>}
   */
  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const {
      filters: { onlyAreas = [] },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - portalUpdateLimit * 60 * 60 * 24,
      )
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }
    return query.limit(queryLimits.portals)
  }

  /**
   *
   * @param {import('types').Permissions} perms
   * @param {object} args
   * @param {import('types').DbContext} context
   * @param {ReturnType<typeof import('objection').raw>} distance
   * @returns {Promise<import('types').FullPortal[]>}
   */
  static async search(perms, args, { isMad }, distance) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search } = args
    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereRaw(`LOWER(name) LIKE '%${search}%'`)
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - portalUpdateLimit * 60 * 60 * 24,
      )
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
  }

  /**
   *
   * @param {number} id
   * @returns {Promise<import('types').FullPortal>}
   */
  static async getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
