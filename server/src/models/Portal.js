// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')

class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }

  /**
   *
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} _ctx
   * @returns {Promise<import("@rm/types").FullPortal[]>}
   */
  // eslint-disable-next-line no-unused-vars
  static async getAll(perms, args, _ctx) {
    const { portalUpdateLimit, queryLimits } = config.getSafe('api')

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
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} context
   * @param {ReturnType<typeof import('objection').raw>} distance
   * @param {ReturnType<typeof import("server/src/utils/getBbox").getBboxFromCenter>} bbox
   * @returns {Promise<import("@rm/types").FullPortal[]>}
   */
  static async search(perms, args, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '' } = args
    const { searchResultsLimit, portalUpdateLimit } = config.getSafe('api')

    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereILike('name', `%${search}%`)
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - portalUpdateLimit * 60 * 60 * 24,
      )
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }
    return query
  }

  /**
   *
   * @param {number} id
   * @returns {Promise<import("@rm/types").FullPortal>}
   */
  static async getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}

module.exports = { Portal }
