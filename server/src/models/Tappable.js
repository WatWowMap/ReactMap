// @ts-check
const { Model, raw } = require('objection')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { getAreaSql, areaRestrictionsDenyAll } = require('../utils/getAreaSql')
const {
  applyManualIdFilter,
  normalizeManualId,
} = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')
const { getMegaEnergyFilterKey } = require('../utils/megaEnergyFilterKey')
const {
  evalScannerQuery,
  describeScannerResponse,
  fetchFortById,
} = require('../utils/evalScannerQuery')
const { filterRTree } = require('../utils/filterRTree')
const { golbatCapabilities } = require('../services/GolbatCapabilities')

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
// A pokemon tappable only stores the species, the encountered pokemon shares
// its id and carries the form and costume shown on the marker.
const POKEMON_FORM_SQL =
  '(SELECT form FROM pokemon WHERE pokemon.id = tappable.id)'
const POKEMON_COSTUME_SQL =
  '(SELECT costume FROM pokemon WHERE pokemon.id = tappable.id)'

/**
 * Filter key of a tappable, null for rewards that are not shown. Pokemon
 * tappables are keyed by species, as Golbat only knows the species.
 * @param {{
 *  pokemon_id?: number | null,
 *  item_id?: number | null,
 *  reward_type?: string | null,
 *  reward_pokemon_id?: number | null,
 *  count?: number | null,
 *  temp_evolution?: number | null,
 * }} tappable
 * @returns {string | null}
 */
function getTappableFilterKey(tappable) {
  if (tappable.pokemon_id) return `${tappable.pokemon_id}`
  if (tappable.item_id) return `q${tappable.item_id}`
  if (!tappable.reward_pokemon_id) return null
  switch (tappable.reward_type) {
    case 'pokemon_candy':
      return `c${tappable.reward_pokemon_id}`
    case 'xl_candy':
      return `x${tappable.reward_pokemon_id}`
    case 'mega_energy_pokemon_id':
    case 'temp_evo_pokemon_branch':
      return getMegaEnergyFilterKey(
        tappable.reward_pokemon_id,
        tappable.count,
        tappable.temp_evolution,
      )
    default:
      return null
  }
}

/**
 * Splits the selected filter keys by reward kind.
 * @param {Record<string, any>} filterArgs
 */
function parseFilterKeys(filterArgs) {
  const keys = new Set()
  const itemIds = []
  const candyIds = []
  const xlCandyIds = []
  const megaEnergy = []
  const pokemonIds = []
  Object.keys(filterArgs).forEach((key) => {
    if (!key || key.startsWith('only')) return
    switch (key.charAt(0)) {
      case 'q': {
        const itemId = Number.parseInt(key.slice(1), 10)
        if (!Number.isNaN(itemId) && itemId !== 0) {
          itemIds.push(itemId)
          keys.add(key)
        }
        break
      }
      case 'c':
      case 'x': {
        const pokemonId = Number.parseInt(key.slice(1), 10)
        if (!Number.isNaN(pokemonId)) {
          ;(key.charAt(0) === 'c' ? candyIds : xlCandyIds).push(pokemonId)
          keys.add(key)
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
          keys.add(key)
        }
        break
      }
      default: {
        const pokemonId = Number(key)
        if (Number.isInteger(pokemonId) && pokemonId > 0) {
          pokemonIds.push(pokemonId)
          keys.add(key)
        }
        break
      }
    }
  })
  return { keys, itemIds, candyIds, xlCandyIds, megaEnergy, pokemonIds }
}

/**
 * DNF clauses for Golbat's /api/tappable/scan. Golbat cannot match the temp
 * evolution, so the results are checked against the exact keys afterwards.
 * @param {ReturnType<typeof parseFilterKeys>} selected
 */
function buildDnfFilters(selected) {
  const filters = []
  if (selected.itemIds.length) {
    filters.push({ reward_type: ['item'], item_id: selected.itemIds })
  }
  if (selected.candyIds.length) {
    filters.push({
      reward_type: ['pokemon_candy'],
      reward_pokemon_id: selected.candyIds,
    })
  }
  if (selected.xlCandyIds.length) {
    filters.push({
      reward_type: ['xl_candy'],
      reward_pokemon_id: selected.xlCandyIds,
    })
  }
  selected.megaEnergy.forEach(([pokemonId, amount]) => {
    filters.push({
      reward_type: MEGA_ENERGY_REWARD_TYPES,
      reward_pokemon_id: [pokemonId],
      count: { min: amount, max: amount },
    })
  })
  if (selected.pokemonIds.length) {
    filters.push({ pokemon_id: selected.pokemonIds })
  }
  return filters
}

/**
 * Maps a Golbat tappable to the shape the SQL query returns.
 * @param {Record<string, any>} tappable
 * @returns {import('@rm/types').FullTappable}
 */
function mapScanTappable(tappable) {
  const rewards = Array.isArray(tappable.rewards) ? tappable.rewards : []
  return {
    id: tappable.id,
    lat: tappable.lat,
    lon: tappable.lon,
    type: tappable.type,
    fort_id: tappable.fort_id ?? null,
    item_id: tappable.item_id ?? null,
    pokemon_id: tappable.pokemon_id ?? null,
    form: null,
    costume: null,
    reward_type: tappable.reward_type ?? null,
    reward_pokemon_id: tappable.reward_pokemon_id ?? null,
    temp_evolution:
      Number(rewards[0]?.temp_evo_pokemon_branch?.temp_evo_id) || null,
    count: tappable.count ?? null,
    expire_timestamp: tappable.expire_timestamp ?? null,
    expire_timestamp_verified: !!tappable.expire_timestamp_verified,
    updated: tappable.updated,
  }
}

/** @param {string} [mem] */
const supportsTappableScan = (mem) =>
  !!mem && golbatCapabilities.get(mem)?.features?.tappable_scan === true

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
  static async getAll(
    perms,
    args,
    { hasTappableRewards, mem, secret, httpAuth },
  ) {
    if (!perms?.tappables) return []

    const { filters: filterArgs = {}, minLat, maxLat, minLon, maxLon } = args

    const { queryLimits = {} } = config.getSafe('api')
    const limit = queryLimits.tappables || queryLimits.pokestops || 5000
    const onlyAreas = filterArgs.onlyAreas || []
    const selected = parseFilterKeys(filterArgs)

    if (supportsTappableScan(mem)) {
      // filterRTree allows everything on empty area inputs, unlike getAreaSql
      if (areaRestrictionsDenyAll(perms.areaRestrictions, onlyAreas)) return []
      try {
        const res = await evalScannerQuery(
          TAGS.tappables,
          `${mem}/api/tappable/scan`,
          JSON.stringify({
            min: { lat: minLat, lon: minLon },
            max: { lat: maxLat, lon: maxLon },
            // 0 = Golbat's default, the display limit applies after the local
            // key and area checks
            limit: 0,
            // an empty list also matches everything, omit it to be explicit
            filters: selected.keys.size ? buildDnfFilters(selected) : undefined,
          }),
          'POST',
          secret,
          httpAuth,
        )
        if (res && Array.isArray(res.tappables)) {
          const manualId = normalizeManualId(filterArgs.onlyManualId)
          if (
            manualId !== null &&
            !res.tappables.some((t) => t && `${t.id}` === `${manualId}`)
          ) {
            try {
              const one = await fetchFortById(
                TAGS.tappables,
                `${mem}/api/tappable/id/${encodeURIComponent(manualId)}`,
                secret,
                httpAuth,
              )
              if (one) res.tappables.unshift(one)
            } catch {
              // by-id miss mirrors SQL finding no such row
            }
          }
          return res.tappables
            .map(mapScanTappable)
            .filter((tappable) => {
              const key = getTappableFilterKey(tappable)
              return (
                key &&
                (!selected.keys.size || selected.keys.has(key)) &&
                filterRTree(tappable, perms.areaRestrictions, onlyAreas)
              )
            })
            .sort((a, b) => b.updated - a.updated)
            .slice(0, limit)
        }
        log.warn(
          TAGS.tappables,
          `[TAPPABLE] /api/tappable/scan gave no tappables array — ${describeScannerResponse(
            res,
          )} — falling back to SQL for this source`,
        )
      } catch (e) {
        log.warn(
          TAGS.tappables,
          `[TAPPABLE] /api/tappable/scan error — falling back to SQL for this source: ${e}`,
        )
      }
    }

    const query = this.query().select([
      'id',
      'lat',
      'lon',
      'type',
      'fort_id',
      'item_id',
      'pokemon_id',
      raw(POKEMON_FORM_SQL).as('form'),
      raw(POKEMON_COSTUME_SQL).as('costume'),
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

    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }

    query.where((supported) =>
      supported.whereNotNull('pokemon_id').orWhere((reward) => {
        reward.whereNull('pokemon_id')
        if (hasTappableRewards) {
          reward.whereIn('reward_type', SUPPORTED_REWARD_TYPES)
        } else {
          reward.whereNotNull('item_id')
        }
      }),
    )

    query.andWhere('expire_timestamp', '>', getEpoch())

    const { itemIds, candyIds, xlCandyIds, megaEnergy, pokemonIds } = selected
    const hasRewardFilters =
      candyIds.length || xlCandyIds.length || megaEnergy.length
    if (
      itemIds.length ||
      pokemonIds.length ||
      (hasTappableRewards && hasRewardFilters)
    ) {
      query.andWhere((rewards) => {
        if (itemIds.length) {
          rewards.orWhereIn('item_id', itemIds)
        }
        if (pokemonIds.length) {
          rewards.orWhereIn('pokemon_id', pokemonIds)
        }
        if (!hasTappableRewards) return
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
    } else if (hasRewardFilters) {
      // Only item and pokemon tappables exist without the reward columns.
      return []
    }

    query.orderBy('updated', 'desc')

    const results = await query.limit(limit)

    return results.map((row) => ({
      ...row,
      expire_timestamp_verified: !!row.expire_timestamp_verified,
      form: row.form ?? null,
      costume: Number(row.costume) || null,
      ...(hasTappableRewards && {
        temp_evolution: Number(row.temp_evolution) || null,
      }),
    }))
  }

  /**
   * Retrieve tappable metadata for a specific tappable id.
   * @param {import('@rm/types').Permissions} perms
   * @param {string | number} tappableId
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<import('@rm/types').Tappable[]>}
   */
  static async getById(perms, tappableId, { mem, secret, httpAuth } = {}) {
    if (!perms?.tappables || !tappableId) {
      return []
    }

    if (supportsTappableScan(mem)) {
      if (areaRestrictionsDenyAll(perms.areaRestrictions, [])) return []
      try {
        const one = await fetchFortById(
          TAGS.tappables,
          `${mem}/api/tappable/id/${encodeURIComponent(tappableId)}`,
          secret,
          httpAuth,
        )
        if (!one) return []
        const tappable = mapScanTappable(one)
        return filterRTree(tappable, perms.areaRestrictions, [])
          ? [tappable]
          : []
      } catch (e) {
        log.warn(
          TAGS.tappables,
          `[TAPPABLE] /api/tappable/id error — falling back to SQL for this source: ${e}`,
        )
      }
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
  static async getAvailable({ hasTappableRewards, mem, secret, httpAuth }) {
    if (supportsTappableScan(mem)) {
      try {
        const available = await this.getAvailableFromEndpoint(
          mem,
          secret,
          httpAuth,
        )
        if (available) return { available }
        log.warn(
          TAGS.tappables,
          '[TAPPABLE] /api/tappable/available malformed — falling back to SQL for this source',
        )
      } catch (e) {
        log.warn(
          TAGS.tappables,
          `[TAPPABLE] /api/tappable/available error — falling back to SQL for this source: ${e}`,
        )
      }
    }

    const columns = ['item_id', 'pokemon_id']
    if (hasTappableRewards) {
      columns.push(
        'reward_type',
        'reward_pokemon_id',
        raw(
          `CASE WHEN reward_type IN (${MEGA_ENERGY_REWARD_TYPES.map(
            () => '?',
          ).join(', ')}) THEN \`count\` END`,
          MEGA_ENERGY_REWARD_TYPES,
        ).as('count'),
        raw(TEMP_EVOLUTION_SQL).as('temp_evolution'),
      )
    }
    const rewards = await this.query()
      .distinct(columns)
      .whereNotNull('pokemon_id')
      .orWhere((reward) => {
        reward.whereNull('pokemon_id')
        if (hasTappableRewards) {
          reward.whereIn('reward_type', SUPPORTED_REWARD_TYPES)
        } else {
          reward.whereNotNull('item_id')
        }
      })

    const available = new Set(rewards.map(getTappableFilterKey))
    available.delete(null)
    return { available: [...available] }
  }

  /**
   * Filter keys from Golbat's /api/tappable/available, null when malformed.
   * Its reward options carry no amount, so mega energy amounts and temp
   * evolutions are read from a scan of just the mega energy tappables.
   * @param {string} mem
   * @param {string} [secret]
   * @param {{ username: string, password: string } | null} [httpAuth]
   * @returns {Promise<string[] | null>}
   */
  static async getAvailableFromEndpoint(mem, secret, httpAuth) {
    const res = await evalScannerQuery(
      TAGS.tappables,
      `${mem}/api/tappable/available`,
      undefined,
      'GET',
      secret,
      httpAuth,
    )
    if (!res || !Array.isArray(res.rewards) || !Array.isArray(res.encounters)) {
      return null
    }
    const available = new Set()
    res.encounters.forEach((encounter) => {
      available.add(getTappableFilterKey(encounter))
    })
    const megaPokemonIds = new Set()
    res.rewards.forEach((reward) => {
      if (MEGA_ENERGY_REWARD_TYPES.includes(reward.reward_type)) {
        if (reward.reward_pokemon_id) {
          megaPokemonIds.add(reward.reward_pokemon_id)
        }
      } else {
        available.add(getTappableFilterKey(reward))
      }
    })
    if (megaPokemonIds.size) {
      const scan = await evalScannerQuery(
        TAGS.tappables,
        `${mem}/api/tappable/scan`,
        JSON.stringify({
          min: { lat: -90, lon: -180 },
          max: { lat: 90, lon: 180 },
          limit: 0,
          filters: [
            {
              reward_type: MEGA_ENERGY_REWARD_TYPES,
              reward_pokemon_id: [...megaPokemonIds],
            },
          ],
        }),
        'POST',
        secret,
        httpAuth,
      )
      if (!scan || !Array.isArray(scan.tappables)) return null
      scan.tappables.forEach((tappable) => {
        available.add(getTappableFilterKey(mapScanTappable(tappable)))
      })
    }
    available.delete(null)
    return [...available]
  }
}

module.exports = { Tappable }
