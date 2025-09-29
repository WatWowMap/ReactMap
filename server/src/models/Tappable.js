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

    const { queryLimits = {}, tappableUpdateLimit = 6 } = config.getSafe('api')
    const timestamp = getEpoch()

    const query = this.query().select([
      'id',
      'lat',
      'lon',
      'type',
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

    query.andWhere((builder) => {
      builder
        .whereNull('expire_timestamp')
        .orWhere('expire_timestamp', '>', timestamp)
    })

    if (tappableUpdateLimit > 0) {
      query.andWhere('updated', '>', timestamp - tappableUpdateLimit * 60 * 60)
    }

    const itemIds = []
    Object.keys(filterArgs).forEach((key) => {
      if (!key || key.startsWith('only')) return
      switch (key.charAt(0)) {
        case 'q': {
          const itemId = Number.parseInt(key.slice(1), 10)
          if (!Number.isNaN(itemId)) {
            itemIds.push(itemId)
          }
          break
        }
        case 's':
          break
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
