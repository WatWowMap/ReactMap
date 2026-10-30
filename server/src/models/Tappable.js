// @ts-check
const { Model, raw } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { applyManualIdFilter } = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')
const { getMegaEnergyFilterKey } = require('../utils/megaEnergyFilterKey')

const MEGA_ENERGY_REWARD_TYPES = [
  'mega_energy_pokemon_id',
  'temp_evo_pokemon_branch',
]
const SUPPORTED_REWARD_TYPES = [
  'item',
  'pokemon_candy',
  'xl_candy',
  ...MEGA_ENERGY_REWARD_TYPES,
]
// No column carries the temp evolution, so read it from the rewards JSON.
const TEMP_EVOLUTION_SQL =
  'json_extract(rewards, "$[0].temp_evo_pokemon_branch.temp_evo_id")'

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
    if (hasTappableRewards) {
      query.select([
        'reward_type',
        'reward_pokemon_id',
        raw(TEMP_EVOLUTION_SQL).as('temp_evolution'),
      ])
    }

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
    if (hasTappableRewards) {
      query.whereIn('reward_type', SUPPORTED_REWARD_TYPES)
    } else {
      query.whereNotNull('item_id')
    }

    query.andWhere('expire_timestamp', '>', timestamp)

    const itemIds = []
    const candyIds = []
    const xlCandyIds = []
    const megaEnergy = []
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
        case 'c':
        case 'x': {
          const pokemonId = Number.parseInt(key.slice(1), 10)
          if (!Number.isNaN(pokemonId)) {
            ;(key.charAt(0) === 'c' ? candyIds : xlCandyIds).push(pokemonId)
          }
          break
        }
        case 'm': {
          const [pokemonId, amount, tempEvolution] = key
            .slice(1)
            .split('-', 3)
            .map(Number)
          if (Number.isInteger(pokemonId) && Number.isInteger(amount)) {
            megaEnergy.push([pokemonId, amount, tempEvolution || 0])
          }
          break
        }
        default:
          break
      }
    })

    if (hasTappableRewards) {
      if (
        itemIds.length ||
        candyIds.length ||
        xlCandyIds.length ||
        megaEnergy.length
      ) {
        query.andWhere((rewards) => {
          if (itemIds.length) {
            rewards.orWhereIn('item_id', itemIds)
          }
          if (candyIds.length) {
            rewards.orWhere((candy) =>
              candy
                .where('reward_type', 'pokemon_candy')
                .whereIn('reward_pokemon_id', candyIds),
            )
          }
          if (xlCandyIds.length) {
            rewards.orWhere((xlCandy) =>
              xlCandy
                .where('reward_type', 'xl_candy')
                .whereIn('reward_pokemon_id', xlCandyIds),
            )
          }
          megaEnergy.forEach(([pokemonId, amount, tempEvolution]) => {
            rewards.orWhere((mega) =>
              mega
                .whereIn('reward_type', MEGA_ENERGY_REWARD_TYPES)
                .where('reward_pokemon_id', pokemonId)
                .where('count', amount)
                .whereRaw(`COALESCE(${TEMP_EVOLUTION_SQL}, 0) = ?`, [
                  tempEvolution,
                ]),
            )
          })
        })
      }
    } else if (itemIds.length) {
      query.whereIn('item_id', itemIds)
    } else if (candyIds.length || xlCandyIds.length || megaEnergy.length) {
      // Only item tappables exist without the reward columns.
      return []
    }

    query.orderBy('updated', 'desc')

    const limit = queryLimits.tappables || queryLimits.pokestops || 5000
    const results = await query.limit(limit)

    return results.map((row) => ({
      ...row,
      expire_timestamp_verified: !!row.expire_timestamp_verified,
      ...(hasTappableRewards && {
        temp_evolution: Number(row.temp_evolution) || null,
      }),
    }))
  }

  /**
   * Retrieve tappable metadata for a specific tappable id.
   * @param {import('@rm/types').Permissions} perms
   * @param {string | number} tappableId
   * @returns {Promise<import('@rm/types').Tappable[]>}
   */
  static async getById(perms, tappableId) {
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
    if (hasTappableRewards) {
      const rewards = await this.query()
        .distinct([
          'reward_type',
          'item_id',
          'reward_pokemon_id',
          raw(
            `CASE WHEN reward_type IN (${MEGA_ENERGY_REWARD_TYPES.map(
              () => '?',
            ).join(', ')}) THEN \`count\` END`,
            MEGA_ENERGY_REWARD_TYPES,
          ).as('amount'),
          raw(TEMP_EVOLUTION_SQL).as('temp_evolution'),
        ])
        .whereNull('pokemon_id')
        .whereIn('reward_type', SUPPORTED_REWARD_TYPES)

      const available = new Set()
      rewards.forEach((reward) => {
        if (reward.reward_type === 'item') {
          if (reward.item_id) available.add(`q${reward.item_id}`)
        } else if (reward.reward_pokemon_id) {
          switch (reward.reward_type) {
            case 'pokemon_candy':
              available.add(`c${reward.reward_pokemon_id}`)
              break
            case 'xl_candy':
              available.add(`x${reward.reward_pokemon_id}`)
              break
            default:
              available.add(
                getMegaEnergyFilterKey(
                  reward.reward_pokemon_id,
                  reward.amount,
                  reward.temp_evolution,
                ),
              )
          }
        }
      })

      return { available: [...available] }
    }

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
