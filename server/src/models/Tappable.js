// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { applyManualIdFilter } = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')

class Tappable extends Model {
  static get tableName() {
    return 'tappable'
  }

  /**
   * @param {import('@rm/types').Permissions} perms
   * @param {{
   *  filters: Record<string, any>,
   *  minLat: number,
   *  maxLat: number,
   *  minLon: number,
   *  maxLon: number,
   * }} args
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<import('@rm/types').FullTappable[]>}
   */
  static async getAll(perms, args, ctx) {
    if (!perms?.tappables) return []

    const { filters: filterArgs = {}, minLat, maxLat, minLon, maxLon } = args

    const { queryLimits = {} } = config.getSafe('api')
    const timestamp = getEpoch()

    const query = this.query().select([
      'id',
      'lat',
      'lon',
      'type',
      'fort_id',
      'item_id',
      'count',
      'expire_timestamp',
      'expire_timestamp_verified',
      'updated',
    ])

    applyManualIdFilter(query, {
      manualId: filterArgs.onlyManualId,
      latColumn: 'lat',
      lonColumn: 'lon',
      idColumn: 'id',
      bounds: { minLat, maxLat, minLon, maxLon },
    })

    const onlyAreas = filterArgs.onlyAreas || []
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, ctx?.isMad)) {
      return []
    }

    query.whereNull('pokemon_id').whereNotNull('item_id')

    query.andWhere('expire_timestamp', '>', timestamp)

    const itemIds = []
    Object.keys(filterArgs).forEach((key) => {
      if (!key || key.startsWith('only')) return
      switch (key.charAt(0)) {
        case 'q': {
          const itemId = Number.parseInt(key.slice(1), 10)
          if (!Number.isNaN(itemId) && itemId !== 0) {
            itemIds.push(itemId)
          }
          break
        }
        default:
          break
      }
    })

    if (itemIds.length) {
      query.whereIn('item_id', itemIds)
    }

    query.orderBy('updated', 'desc')

    const limit = queryLimits.tappables || queryLimits.pokestops || 5000
    const results = await query.limit(limit)

    return results.map((row) => ({
      ...row,
      expire_timestamp_verified: !!row.expire_timestamp_verified,
    }))
  }

  /**
   * Retrieve tappable metadata for a specific tappable id.
   * @param {import('@rm/types').Permissions} perms
   * @param {string | number} tappableId
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<import('@rm/types').Tappable[]>}
   */
  static async getById(perms, tappableId, ctx) {
    if (!perms?.tappables || !tappableId) {
      return []
    }

    const query = this.query().select([
      'id',
      'lat',
      'lon',
      'type',
      'fort_id',
      'item_id',
      'count',
      'expire_timestamp',
      'expire_timestamp_verified',
      'updated',
    ])

    if (
      !getAreaSql(query, perms.areaRestrictions, [], ctx?.isMad, 'tappable')
    ) {
      return []
    }

    query.where('id', tappableId).orderBy('updated', 'desc')

    const results = await query.limit(1)

    return results.map((row) => ({
      ...row,
      expire_timestamp_verified: !!row.expire_timestamp_verified,
    }))
  }

  /**
   * Returns filter keys available for tappables
   * @returns {Promise<{ available: string[] }>}
   */
  static async getAvailable() {
    const rows = await this.query()
      .select('item_id')
      .count('id as total')
      .whereNull('pokemon_id')
      .whereNotNull('item_id')
      .groupBy('item_id')

    const available = Array.from(
      new Set(
        rows
          .map((row) => row.item_id)
          .filter((itemId) => itemId !== null)
          .map((itemId) => `q${itemId}`),
      ),
    )

    return { available }
  }
}

module.exports = { Tappable }
