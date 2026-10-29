// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { applyManualIdFilter } = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')

// Golbat stores the first loot item's LootItemProto field name as reward_type
const REWARD_FILTERS = [
  { prefix: 'q', rewardTypes: ['item'], column: 'item_id' },
  { prefix: 'c', rewardTypes: ['pokemon_candy'], column: 'reward_pokemon_id' },
  { prefix: 'x', rewardTypes: ['xl_candy'], column: 'reward_pokemon_id' },
  {
    prefix: 'm',
    rewardTypes: ['mega_energy_pokemon_id', 'temp_evo_pokemon_branch'],
    column: 'reward_pokemon_id',
  },
]

const SELECT_COLUMNS = [
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
]

/** @param {boolean} [hasTappableRewards] */
const getSelectColumns = (hasTappableRewards) =>
  hasTappableRewards
    ? [...SELECT_COLUMNS, 'reward_type', 'reward_pokemon_id']
    : SELECT_COLUMNS

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
  static async getAll(perms, args, { hasTappableRewards }) {
    if (!perms?.tappables) return []

    const { filters: filterArgs = {}, minLat, maxLat, minLon, maxLon } = args

    const { queryLimits = {} } = config.getSafe('api')
    const timestamp = getEpoch()

    /** @type {Record<string, number[]>} */
    const ids = Object.fromEntries(
      REWARD_FILTERS.map(({ prefix }) => [prefix, []]),
    )
    Object.keys(filterArgs).forEach((key) => {
      if (!key || key.startsWith('only') || !ids[key.charAt(0)]) return
      const id = Number.parseInt(key.slice(1), 10)
      if (!Number.isNaN(id) && id !== 0) {
        ids[key.charAt(0)].push(id)
      }
    })

    const hasIdFilter = Object.values(ids).some((list) => list.length)
    // sources without reward columns only have items to match a selection
    if (!hasTappableRewards && hasIdFilter && !ids.q.length) return []

    const query = this.query().select(getSelectColumns(hasTappableRewards))

    applyManualIdFilter(query, {
      manualId: filterArgs.onlyManualId,
      latColumn: 'lat',
      lonColumn: 'lon',
      idColumn: 'id',
      bounds: { minLat, maxLat, minLon, maxLon },
    })

    const onlyAreas = filterArgs.onlyAreas || []
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }

    query.whereNull('pokemon_id')

    query.andWhere('expire_timestamp', '>', timestamp)

    if (hasTappableRewards) {
      query.andWhere((rewards) => {
        REWARD_FILTERS.forEach(({ prefix, rewardTypes, column }) => {
          if (hasIdFilter && !ids[prefix].length) return
          rewards.orWhere((reward) => {
            reward.whereIn('reward_type', rewardTypes).whereNotNull(column)
            if (hasIdFilter) reward.whereIn(column, ids[prefix])
          })
        })
      })
    } else {
      query.whereNotNull('item_id')
      if (ids.q.length) {
        query.whereIn('item_id', ids.q)
      }
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
  static async getById(perms, tappableId, { hasTappableRewards }) {
    if (!perms?.tappables || !tappableId) {
      return []
    }

    const query = this.query().select(getSelectColumns(hasTappableRewards))

    if (!getAreaSql(query, perms.areaRestrictions, [])) {
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
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<{ available: string[] }>}
   */
  static async getAvailable({ hasTappableRewards }) {
    if (!hasTappableRewards) {
      const rows = await this.query()
        .select('item_id')
        .whereNull('pokemon_id')
        .whereNotNull('item_id')
        .groupBy('item_id')

      return { available: rows.map((row) => `q${row.item_id}`) }
    }

    const rows = await this.query()
      .select('reward_type', 'item_id', 'reward_pokemon_id')
      .whereNull('pokemon_id')
      .whereIn(
        'reward_type',
        REWARD_FILTERS.flatMap(({ rewardTypes }) => rewardTypes),
      )
      .groupBy('reward_type', 'item_id', 'reward_pokemon_id')

    const available = new Set()
    rows.forEach((row) => {
      const filter = REWARD_FILTERS.find(({ rewardTypes }) =>
        rewardTypes.includes(row.reward_type),
      )
      const id = filter && row[filter.column]
      if (id) available.add(`${filter.prefix}${id}`)
    })

    return { available: [...available] }
  }
}

module.exports = { Tappable }
