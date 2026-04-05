// @ts-check
const { Model, raw } = require('objection')
const config = require('@rm/config')
const i18next = require('i18next')

const { log, TAGS } = require('@rm/logger')

const { getAreaSql } = require('../utils/getAreaSql')
const { applyManualIdFilter } = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')
const { state } = require('../services/state')
const { getSharedPvpWrapper } = require('../services/PvpWrapper')

const DEFAULT_IV = 15
const STATION_TABLE = 'station'
const STATION_BATTLE_ROW_ALIAS = 'station_battle_row'
const STATION_BATTLE_FILTER_ALIAS = 'station_battle_filter'
const STATION_BATTLE_SEARCH_ALIAS = 'station_battle_search'
const STATION_BATTLE_ROW_TABLE = `station_battle as ${STATION_BATTLE_ROW_ALIAS}`
const STATION_BATTLE_FILTER_TABLE = `station_battle as ${STATION_BATTLE_FILTER_ALIAS}`
const STATION_BATTLE_SEARCH_TABLE = `station_battle as ${STATION_BATTLE_SEARCH_ALIAS}`
const STATION_BATTLE_FIELDS = [
  'battle_level',
  'battle_start',
  'battle_end',
  'battle_pokemon_id',
  'battle_pokemon_form',
  'battle_pokemon_costume',
  'battle_pokemon_gender',
  'battle_pokemon_alignment',
  'battle_pokemon_bread_mode',
  'battle_pokemon_move_1',
  'battle_pokemon_move_2',
]
const STATION_BATTLE_STAT_FIELDS = [
  'battle_pokemon_stamina',
  'battle_pokemon_cp_multiplier',
]
const STATION_SEARCH_BATTLE_FIELDS = [
  'battle_level',
  'battle_start',
  'battle_pokemon_id',
  'battle_pokemon_form',
  'battle_pokemon_costume',
  'battle_pokemon_gender',
  'battle_pokemon_alignment',
  'battle_pokemon_bread_mode',
  'battle_end',
]

/**
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @param {import('@rm/types').FullStation} station
 * @returns {number | null}
 */
function estimateStationCp(pokemonData, station) {
  const { battle_pokemon_id: pokemonId, battle_pokemon_form: form } = station
  const multiplier = Number(station.battle_pokemon_cp_multiplier)

  if (
    !pokemonData ||
    !pokemonId ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    return null
  }

  const base = pokemonData.findBaseStats(pokemonId, form ?? 0, 0)
  if (!base) return null
  const { attack, defense } = base
  if (typeof attack !== 'number' || typeof defense !== 'number') {
    return null
  }

  const attackStat = attack + DEFAULT_IV
  const defenseStat = defense + DEFAULT_IV
  const staminaStat = Number(station.battle_pokemon_stamina)
  if (!Number.isFinite(staminaStat)) {
    return null
  }

  const cp = Math.floor(
    (attackStat *
      multiplier *
      Math.sqrt(defenseStat * multiplier * staminaStat)) /
      10,
  )
  return cp < 10 ? 10 : cp
}

/**
 * @param {string} alias
 * @param {boolean} [includeStats]
 * @returns {string[]}
 */
function getAliasedStationBattleSelect(alias, includeStats = false) {
  return [
    ...STATION_BATTLE_FIELDS,
    ...(includeStats ? STATION_BATTLE_STAT_FIELDS : []),
  ].map((field) => `${alias}.${field} as ${alias}_${field}`)
}

/**
 * @param {string} field
 * @returns {string}
 */
function getStationColumn(field) {
  return `${STATION_TABLE}.${field}`
}

/**
 * @param {string[]} fields
 * @returns {string[]}
 */
function getStationSelect(fields) {
  return fields.map((field) => `${getStationColumn(field)} as ${field}`)
}

/**
 * @param {string[]} fields
 * @param {string} aliasPrefix
 * @returns {string[]}
 */
function getAliasedStationSelect(fields, aliasPrefix) {
  return fields.map(
    (field) => `${getStationColumn(field)} as ${aliasPrefix}${field}`,
  )
}

/**
 * @param {number} ts
 * @param {import('objection').QueryBuilder<any>} builder
 * @param {string} alias
 */
function addSearchBattleMatchOrder(builder, alias, ts) {
  builder.orderByRaw(
    `CASE
      WHEN ${alias}.battle_start IS NULL
        OR ${alias}.battle_start = 0
        OR ${alias}.battle_start <= ?
      THEN 0
      ELSE 1
    END ASC`,
    [ts],
  )
  builder
    .orderByRaw(
      `CASE
        WHEN ${alias}.battle_start IS NULL
          OR ${alias}.battle_start = 0
          OR ${alias}.battle_start <= ?
        THEN NULL
        ELSE ${alias}.battle_start
      END ASC`,
      [ts],
    )
    .orderBy(`${alias}.battle_end`, 'desc')
    .orderBy(`${alias}.battle_pokemon_id`, 'asc')
    .orderBy(`${alias}.battle_pokemon_form`, 'asc')
    .orderBy(`${alias}.battle_pokemon_costume`, 'asc')
    .orderBy(`${alias}.battle_pokemon_gender`, 'asc')
    .orderBy(`${alias}.battle_pokemon_alignment`, 'asc')
    .orderBy(`${alias}.battle_pokemon_bread_mode`, 'asc')
    .orderBy(`${alias}.battle_level`, 'asc')
}

/**
 * @param {ReturnType<typeof Model.knex>} knexRef
 * @param {number[]} pokemonIds
 * @param {number} ts
 */
function getSearchBattleJsonSubquery(knexRef, pokemonIds, ts) {
  const jsonFields = STATION_SEARCH_BATTLE_FIELDS.flatMap((field) => [
    `'${field}'`,
    `${STATION_BATTLE_SEARCH_ALIAS}.${field}`,
  ]).join(', ')

  return knexRef(STATION_BATTLE_SEARCH_TABLE)
    .select(raw(`JSON_OBJECT(${jsonFields})`))
    .whereRaw(`${STATION_BATTLE_SEARCH_ALIAS}.station_id = ${STATION_TABLE}.id`)
    .andWhere(`${STATION_BATTLE_SEARCH_ALIAS}.battle_end`, '>', ts)
    .modify((builder) => {
      if (pokemonIds.length) {
        builder.whereIn(
          `${STATION_BATTLE_SEARCH_ALIAS}.battle_pokemon_id`,
          pokemonIds,
        )
      }
      addSearchBattleMatchOrder(builder, STATION_BATTLE_SEARCH_ALIAS, ts)
    })
    .limit(1)
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @returns {import('@rm/types').StationBattle | null}
 */
function enrichStationBattle(battle, pokemonData) {
  if (!battle) return null
  return {
    ...battle,
    battle_pokemon_estimated_cp: pokemonData
      ? estimateStationCp(pokemonData, battle)
      : null,
  }
}

/**
 * @param {Record<string, any>} row
 * @param {string} alias
 * @param {number} ts
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @returns {import('@rm/types').StationBattle | null}
 */
function getAliasedStationBattle(row, alias, ts, pokemonData) {
  const battleEnd = Number(row?.[`${alias}_battle_end`])
  if (!(battleEnd > ts)) {
    return null
  }
  return enrichStationBattle(
    {
      battle_level: row?.[`${alias}_battle_level`] ?? null,
      battle_start: row?.[`${alias}_battle_start`] ?? null,
      battle_end: row?.[`${alias}_battle_end`] ?? null,
      battle_pokemon_id: row?.[`${alias}_battle_pokemon_id`] ?? null,
      battle_pokemon_form: row?.[`${alias}_battle_pokemon_form`] ?? null,
      battle_pokemon_costume: row?.[`${alias}_battle_pokemon_costume`] ?? null,
      battle_pokemon_gender: row?.[`${alias}_battle_pokemon_gender`] ?? null,
      battle_pokemon_alignment:
        row?.[`${alias}_battle_pokemon_alignment`] ?? null,
      battle_pokemon_bread_mode:
        row?.[`${alias}_battle_pokemon_bread_mode`] ?? null,
      battle_pokemon_move_1: row?.[`${alias}_battle_pokemon_move_1`] ?? null,
      battle_pokemon_move_2: row?.[`${alias}_battle_pokemon_move_2`] ?? null,
      battle_pokemon_stamina: row?.[`${alias}_battle_pokemon_stamina`] ?? null,
      battle_pokemon_cp_multiplier:
        row?.[`${alias}_battle_pokemon_cp_multiplier`] ?? null,
    },
    pokemonData,
  )
}

/**
 * @param {import('@rm/types').FullStation} station
 * @param {number} ts
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @returns {import('@rm/types').StationBattle | null}
 */
function getFallbackStationBattle(station, ts, pokemonData) {
  if (!(Number(station?.battle_end) > ts)) return null
  if (
    station?.battle_level === null &&
    station?.battle_pokemon_id === null &&
    station?.battle_pokemon_form === null
  ) {
    return null
  }
  return enrichStationBattle(
    {
      battle_level: station.battle_level ?? null,
      battle_start: station.battle_start ?? null,
      battle_end: station.battle_end ?? null,
      battle_pokemon_id: station.battle_pokemon_id ?? null,
      battle_pokemon_form: station.battle_pokemon_form ?? null,
      battle_pokemon_costume: station.battle_pokemon_costume ?? null,
      battle_pokemon_gender: station.battle_pokemon_gender ?? null,
      battle_pokemon_alignment: station.battle_pokemon_alignment ?? null,
      battle_pokemon_bread_mode: station.battle_pokemon_bread_mode ?? null,
      battle_pokemon_move_1: station.battle_pokemon_move_1 ?? null,
      battle_pokemon_move_2: station.battle_pokemon_move_2 ?? null,
      battle_pokemon_stamina: station.battle_pokemon_stamina ?? null,
      battle_pokemon_cp_multiplier:
        station.battle_pokemon_cp_multiplier ?? null,
    },
    pokemonData,
  )
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @returns {string}
 */
function getStationBattleIdentity(battle) {
  return STATION_BATTLE_FIELDS.map((field) => {
    if (field === 'battle_start') {
      const battleStart = Number(battle?.[field])
      return !Number.isFinite(battleStart) || battleStart === 0
        ? ''
        : battleStart
    }
    return battle?.[field] ?? ''
  }).join(':')
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {number} ts
 * @returns {boolean}
 */
function isStationBattleActive(battle, ts) {
  const battleEnd = Number(battle?.battle_end)
  if (!(battleEnd > ts)) return false
  const battleStart = Number(battle?.battle_start)
  return !Number.isFinite(battleStart) || battleStart === 0 || battleStart <= ts
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} left
 * @param {import('@rm/types').StationBattle | null | undefined} right
 * @param {number} ts
 * @returns {number}
 */
function compareStationBattles(left, right, ts) {
  const leftActive = isStationBattleActive(left, ts)
  const rightActive = isStationBattleActive(right, ts)
  if (leftActive !== rightActive) {
    return leftActive ? -1 : 1
  }

  if (!leftActive) {
    const leftStart = Number(left?.battle_start) || Number.MAX_SAFE_INTEGER
    const rightStart = Number(right?.battle_start) || Number.MAX_SAFE_INTEGER
    if (leftStart !== rightStart) {
      return leftStart - rightStart
    }
  }

  const leftEnd = Number(left?.battle_end) || 0
  const rightEnd = Number(right?.battle_end) || 0
  if (leftEnd !== rightEnd) {
    return rightEnd - leftEnd
  }

  return getStationBattleIdentity(left).localeCompare(
    getStationBattleIdentity(right),
  )
}

/**
 * @param {import('@rm/types').StationBattle[]} battles
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @returns {import('@rm/types').StationBattle[]}
 */
function appendDistinctStationBattle(battles, battle, pokemonData) {
  if (!battle) return battles
  const battleIdentity = getStationBattleIdentity(battle)
  const existingBattle = battles.find(
    (currentBattle) =>
      getStationBattleIdentity(currentBattle) === battleIdentity,
  )
  if (existingBattle) {
    let statsChanged = false
    STATION_BATTLE_STAT_FIELDS.forEach((field) => {
      if (existingBattle[field] == null && battle[field] != null) {
        existingBattle[field] = battle[field]
        statsChanged = true
      }
    })
    if (statsChanged && pokemonData) {
      existingBattle.battle_pokemon_estimated_cp = estimateStationCp(
        pokemonData,
        existingBattle,
      )
    } else if (
      existingBattle.battle_pokemon_estimated_cp == null &&
      battle.battle_pokemon_estimated_cp != null
    ) {
      existingBattle.battle_pokemon_estimated_cp =
        battle.battle_pokemon_estimated_cp
    }
  } else {
    battles.push(battle)
  }
  return battles
}

/**
 * @param {(import('@rm/types').StationBattle | null | undefined)[]} battles
 * @param {number} ts
 * @returns {import('@rm/types').StationBattle | null}
 */
function getPreferredStationBattle(battles, ts) {
  const availableBattles = battles.filter(Boolean)
  if (!availableBattles.length) return null
  return [...availableBattles].sort((left, right) =>
    compareStationBattles(left, right, ts),
  )[0]
}

/**
 * @param {import('@rm/types').FullStation} station
 * @returns {import('@rm/types').FullStation}
 */
function clearStationBattleFallback(station) {
  ;[
    ...STATION_BATTLE_FIELDS,
    ...STATION_BATTLE_STAT_FIELDS,
    'battle_pokemon_estimated_cp',
  ].forEach((field) => {
    station[field] = null
  })
  station.is_battle_available = false
  return station
}

/**
 * @param {import('objection').QueryBuilder<any>} builder
 * @param {string} prefix
 * @param {{
 *  ts: number
 *  includeUpcoming: boolean
 *  onlyBattleTier: string | number
 *  battleLevels: number[]
 *  battleCombos: { pokemonId: number, form: number | null }[]
 * }} options
 */
function addBattleFilterClause(
  builder,
  prefix,
  { ts, includeUpcoming, onlyBattleTier, battleLevels, battleCombos },
) {
  builder
    .whereNotNull(`${prefix}battle_pokemon_id`)
    .andWhere(`${prefix}battle_end`, '>', ts)
  if (!includeUpcoming) {
    builder.andWhere((active) => {
      active
        .whereNull(`${prefix}battle_start`)
        .orWhere(`${prefix}battle_start`, 0)
        .orWhere(`${prefix}battle_start`, '<=', ts)
    })
  }
  if (onlyBattleTier === 'all') {
    builder.andWhere((match) => {
      let matchApplied = false
      if (battleLevels.length) {
        const levelMethod = matchApplied ? 'orWhereIn' : 'whereIn'
        match[levelMethod](`${prefix}battle_level`, battleLevels)
        matchApplied = true
      }
      battleCombos.forEach(({ pokemonId, form }) => {
        const comboMethod = matchApplied ? 'orWhere' : 'where'
        match[comboMethod]((combo) => {
          combo.where(`${prefix}battle_pokemon_id`, pokemonId)
          if (form === null) {
            combo.andWhereNull(`${prefix}battle_pokemon_form`)
          } else {
            combo.andWhere(`${prefix}battle_pokemon_form`, form)
          }
        })
        matchApplied = true
      })
      if (!matchApplied) {
        match.whereRaw('0 = 1')
      }
    })
  } else {
    builder.andWhere(`${prefix}battle_level`, onlyBattleTier)
  }
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {{
 *  ts: number
 *  includeUpcoming: boolean
 *  onlyBattleTier: string | number
 *  battleLevels: number[]
 *  battleCombos: { pokemonId: number, form: number | null }[]
 * }} options
 */
function matchesStationBattleFilter(
  battle,
  { ts, includeUpcoming, onlyBattleTier, battleLevels, battleCombos },
) {
  if (
    battle?.battle_pokemon_id === null ||
    battle?.battle_pokemon_id === undefined
  ) {
    return false
  }
  if (!(Number(battle?.battle_end) > ts)) {
    return false
  }
  if (!includeUpcoming) {
    const battleStart = Number(battle?.battle_start)
    if (Number.isFinite(battleStart) && battleStart > 0 && battleStart > ts) {
      return false
    }
  }
  if (onlyBattleTier !== 'all') {
    return Number(battle?.battle_level) === Number(onlyBattleTier)
  }

  let matchApplied = false
  let matched = false
  if (battleLevels.length) {
    matchApplied = true
    matched = battleLevels.includes(Number(battle?.battle_level))
  }
  if (
    battleCombos.some(({ pokemonId, form }) => {
      if (Number(battle?.battle_pokemon_id) !== pokemonId) {
        return false
      }
      if (form === null) {
        return battle?.battle_pokemon_form === null
      }
      return Number(battle?.battle_pokemon_form) === form
    })
  ) {
    matchApplied = true
    matched = true
  }

  return matchApplied && matched
}

/**
 * @param {import('@rm/types').FullStation} station
 * @param {import('ohbem').PokemonData | null} pokemonData
 * @param {number} ts
 */
function finalizeStation(station, pokemonData, ts) {
  const hasJoinedAvailableBattle =
    Array.isArray(station.battles) &&
    station.battles.some((battle) => {
      if (
        battle?.battle_pokemon_id == null ||
        !(Number(battle?.battle_end) > ts)
      ) {
        return false
      }
      const battleStart = Number(battle?.battle_start)
      return (
        !Number.isFinite(battleStart) || battleStart === 0 || battleStart <= ts
      )
    })
  if (
    station.is_battle_available &&
    station.battle_pokemon_id === null &&
    !hasJoinedAvailableBattle
  ) {
    station.is_battle_available = false
  }
  if (station.total_stationed_pokemon === null) {
    station.total_stationed_pokemon = 0
  }
  if (
    station.stationed_pokemon &&
    (station.total_stationed_gmax === undefined ||
      station.total_stationed_gmax === null)
  ) {
    const list =
      typeof station.stationed_pokemon === 'string'
        ? JSON.parse(station.stationed_pokemon)
        : station.stationed_pokemon || []
    let count = 0
    if (list)
      for (let i = 0; i < list.length; ++i)
        if (list[i].bread_mode === 2 || list[i].bread_mode === 3) ++count
    station.total_stationed_gmax = count
  }
  station.battle_pokemon_estimated_cp = pokemonData
    ? estimateStationCp(pokemonData, station)
    : null
  return station
}

class Station extends Model {
  static get tableName() {
    return 'station'
  }

  /**
   * Returns the bare essentials for displaying on the map
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<import("@rm/types").FullStation[]>}
   */
  static async getAll(
    perms,
    args,
    {
      isMad,
      hasMultiBattles,
      hasMultiBattlePokemonStats,
      hasStationedGmax,
      hasBattlePokemonStats,
    },
  ) {
    const { areaRestrictions } = perms
    const { stationUpdateLimit, stationInactiveLimitDays } =
      config.getSafe('api')
    const {
      onlyAreas,
      onlyAllStations,
      onlyMaxBattles,
      onlyBattleTier,
      onlyIncludeUpcoming = true,
      onlyGmaxStationed,
      onlyInactiveStations,
    } = args.filters

    const battleLevelFilters = new Set()
    const battleComboFilters = new Map()
    if (onlyMaxBattles && onlyBattleTier === 'all') {
      Object.entries(args.filters || {}).forEach(([key, value]) => {
        if (!value) return
        if (key.startsWith('j')) {
          const parsedLevel = Number(key.slice(1))
          if (Number.isFinite(parsedLevel)) {
            battleLevelFilters.add(parsedLevel)
          }
          return
        }
        if (/^\d+-/.test(key)) {
          const [idPart, formPart] = key.split('-', 2)
          const pokemonId = Number(idPart)
          if (!Number.isFinite(pokemonId)) return
          let formValue = null
          if (formPart && formPart !== 'null') {
            const parsedForm = Number(formPart)
            if (!Number.isFinite(parsedForm)) return
            formValue = parsedForm
          }
          const comboKey = `${pokemonId}-${formValue ?? 'null'}`
          if (!battleComboFilters.has(comboKey)) {
            battleComboFilters.set(comboKey, { pokemonId, form: formValue })
          }
        }
      })
    }
    const battleLevels = [...battleLevelFilters]
    const battleCombos = [...battleComboFilters.values()]
    const hasBattleConditions =
      onlyBattleTier !== 'all' ||
      battleLevels.length > 0 ||
      battleCombos.length > 0

    if (!onlyAllStations && !onlyInactiveStations && !perms.dynamax) {
      return []
    }

    const ts = getEpoch()
    const baseSelect = getStationSelect([
      'id',
      'name',
      'lat',
      'lon',
      'updated',
      'start_time',
      'end_time',
    ])

    const manualFilterOptions = {
      manualId: args.filters.onlyManualId,
      latColumn: getStationColumn('lat'),
      lonColumn: getStationColumn('lon'),
      idColumn: getStationColumn('id'),
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    }

    const select = [...baseSelect]
    const includeBattleData =
      perms.dynamax && (onlyMaxBattles || onlyGmaxStationed)

    const query = this.query()
    applyManualIdFilter(query, manualFilterOptions)
    const now = Date.now() / 1000
    const activeCutoff = now - stationUpdateLimit * 60 * 60
    const inactiveCutoff = now - stationInactiveLimitDays * 24 * 60 * 60
    const battleFilterOptions = {
      ts,
      includeUpcoming: !!onlyIncludeUpcoming,
      onlyBattleTier,
      battleLevels,
      battleCombos,
    }
    const shouldRestrictReturnedBattles = onlyMaxBattles && hasBattleConditions

    if (includeBattleData) {
      select.push(
        ...getStationSelect([
          'is_battle_available',
          'battle_level',
          'battle_start',
          'battle_end',
          'battle_pokemon_id',
          'battle_pokemon_form',
          'battle_pokemon_costume',
          'battle_pokemon_gender',
          'battle_pokemon_alignment',
          'battle_pokemon_bread_mode',
          'battle_pokemon_move_1',
          'battle_pokemon_move_2',
          'total_stationed_pokemon',
        ]),
      )
      select.push(
        `${getStationColumn(
          hasStationedGmax ? 'total_stationed_gmax' : 'stationed_pokemon',
        )} as ${hasStationedGmax ? 'total_stationed_gmax' : 'stationed_pokemon'}`,
      )
      if (hasBattlePokemonStats) {
        select.push(
          ...getStationSelect([
            'battle_pokemon_stamina',
            'battle_pokemon_cp_multiplier',
          ]),
        )
      }
      if (hasMultiBattles) {
        select.push(
          ...getAliasedStationBattleSelect(
            STATION_BATTLE_ROW_ALIAS,
            hasMultiBattlePokemonStats,
          ),
        )
        query.leftJoin(STATION_BATTLE_ROW_TABLE, (join) => {
          join
            .on('station.id', '=', `${STATION_BATTLE_ROW_ALIAS}.station_id`)
            .andOn(
              `${STATION_BATTLE_ROW_ALIAS}.battle_end`,
              '>',
              raw('?', [ts]),
            )
        })
      }
    }

    const applyStationFilters = (builder) => {
      if (onlyAllStations) return
      if (!perms.dynamax) {
        builder.whereRaw('0 = 1')
        return
      }

      builder.andWhere((station) => {
        let applied = false

        if (onlyMaxBattles) {
          if (hasBattleConditions) {
            const method = applied ? 'orWhere' : 'where'
            station[method]((battle) => {
              if (hasMultiBattles) {
                battle.where((multiBattle) => {
                  multiBattle.whereExists(
                    this.knex()
                      .select(1)
                      .from(STATION_BATTLE_FILTER_TABLE)
                      .whereRaw(
                        `${STATION_BATTLE_FILTER_ALIAS}.station_id = station.id`,
                      )
                      .modify((subquery) => {
                        addBattleFilterClause(
                          subquery,
                          `${STATION_BATTLE_FILTER_ALIAS}.`,
                          battleFilterOptions,
                        )
                      }),
                  )
                  multiBattle.orWhere((legacyBattle) => {
                    addBattleFilterClause(
                      legacyBattle,
                      `${STATION_TABLE}.`,
                      battleFilterOptions,
                    )
                  })
                })
              } else {
                addBattleFilterClause(
                  battle,
                  `${STATION_TABLE}.`,
                  battleFilterOptions,
                )
              }
            })
            applied = true
          }
        }

        if (onlyGmaxStationed) {
          if (hasStationedGmax) {
            const method = applied ? 'orWhere' : 'where'
            station[method](getStationColumn('total_stationed_gmax'), '>', 0)
            applied = true
          } else {
            const method = applied ? 'orWhere' : 'where'
            station[method]((gmax) => {
              gmax.whereRaw(
                "JSON_SEARCH(COALESCE(station.stationed_pokemon, '[]'), 'one', ?, NULL, '$[*].bread_mode') IS NOT NULL",
                ['2'],
              )
              gmax.orWhereRaw(
                "JSON_SEARCH(COALESCE(station.stationed_pokemon, '[]'), 'one', ?, NULL, '$[*].bread_mode') IS NOT NULL",
                ['3'],
              )
            })
            applied = true
          }
        }

        if (!applied) {
          station.whereRaw('0 = 1')
        }
      })
    }

    query.select(select)
    if (includeBattleData && hasMultiBattles) {
      query
        .orderBy('station.id', 'asc')
        .orderBy(`${STATION_BATTLE_ROW_ALIAS}.battle_end`, 'desc')
        .orderBy(`${STATION_BATTLE_ROW_ALIAS}.battle_start`, 'asc')
    }

    if (onlyInactiveStations) {
      query.andWhere((builder) => {
        builder.where((active) => {
          active
            .where(getStationColumn('end_time'), '>', ts)
            .andWhere(getStationColumn('updated'), '>', activeCutoff)
          applyStationFilters(active)
        })
        // Battle data etc of inactive stations should be ignored since they are outdated by design
        builder.orWhere((inactive) =>
          inactive
            .where(getStationColumn('end_time'), '<=', ts)
            .andWhere(getStationColumn('updated'), '>', inactiveCutoff),
        )
      })
    } else {
      query
        .andWhere(getStationColumn('end_time'), '>', ts)
        .andWhere(getStationColumn('updated'), '>', activeCutoff)
      applyStationFilters(query)
    }

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }

    /** @type {import('@rm/types').FullStation[]} */
    const stationRows = await query

    let pokemonData = null
    if (
      perms.dynamax &&
      (hasBattlePokemonStats || hasMultiBattlePokemonStats)
    ) {
      const needsEstimatedCp = stationRows.some((station) => {
        if (!station) return false
        const multiplier = Number(station.battle_pokemon_cp_multiplier)
        const joinedMultiplier = Number(
          station?.[`${STATION_BATTLE_ROW_ALIAS}_battle_pokemon_cp_multiplier`],
        )
        return Number.isFinite(multiplier) && multiplier > 0
          ? !!station.battle_pokemon_id
          : Number.isFinite(joinedMultiplier) &&
              joinedMultiplier > 0 &&
              !!station?.[`${STATION_BATTLE_ROW_ALIAS}_battle_pokemon_id`]
      })
      if (needsEstimatedCp) {
        try {
          pokemonData = await getSharedPvpWrapper().ensurePokemonData()
        } catch (e) {
          log.warn(
            TAGS.fetch,
            'Unable to load ohbem basics for station CP estimation',
            e,
          )
        }
      }
    }

    if (!includeBattleData || !hasMultiBattles) {
      return stationRows.map((station) => {
        if (includeBattleData) {
          const fallbackBattle = getFallbackStationBattle(
            station,
            ts,
            pokemonData,
          )
          station.battles = fallbackBattle ? [fallbackBattle] : []
        }
        return finalizeStation(station, pokemonData, ts)
      })
    }

    /** @type {Map<string, import('@rm/types').FullStation>} */
    const grouped = new Map()

    stationRows.forEach((row) => {
      let station = grouped.get(row.id)
      if (!station) {
        station = {
          ...row,
          battles: [],
        }
        grouped.set(row.id, station)
      }
      const battle = getAliasedStationBattle(
        row,
        STATION_BATTLE_ROW_ALIAS,
        ts,
        pokemonData,
      )
      if (battle) {
        station.battles.push(battle)
      }
    })

    return [...grouped.values()].map((station) => {
      const fallbackBattle = getFallbackStationBattle(station, ts, pokemonData)
      station.battles = appendDistinctStationBattle(
        [...station.battles],
        fallbackBattle,
        pokemonData,
      )
      if (shouldRestrictReturnedBattles) {
        const filteredBattles = station.battles.filter((battle) =>
          matchesStationBattleFilter(battle, battleFilterOptions),
        )
        if (filteredBattles.length) {
          station.battles = filteredBattles
        } else if (!onlyGmaxStationed) {
          station.battles = []
          clearStationBattleFallback(station)
        } else {
          station.battles = [...station.battles]
        }
      }
      return finalizeStation(station, pokemonData, ts)
    })
  }

  /**
   * Returns the full station after querying it by ID
   * @param {number} id
   */
  static async getOne(id) {
    /** @type {import('@rm/types').FullStation} */
    const result = await this.query().findById(id)
    return result
  }

  /**
   * Returns the stationed mons for a given station
   * @param {number} id
   * @param {import('@rm/types').DbContext} _ctx
   * @returns {Promise<import('@rm/types').StationPokemon[]>}
   */
  // eslint-disable-next-line no-unused-vars
  static async getDynamaxMons(id, _ctx) {
    /** @type {import('@rm/types').FullStation} */
    const result = await this.query().findById(id).select('stationed_pokemon')
    if (!result) {
      return []
    }
    return typeof result.stationed_pokemon === 'string'
      ? JSON.parse(result.stationed_pokemon)
      : result.stationed_pokemon || []
  }

  static async getAvailable({ hasMultiBattles }) {
    /** @type {import('@rm/types').FullStation[]} */
    const ts = getEpoch()
    const { stationUpdateLimit } = config.getSafe('api')
    const activeCutoff = Date.now() / 1000 - stationUpdateLimit * 60 * 60
    const results = hasMultiBattles
      ? await this.query()
          .distinct(
            getStationSelect([
              'battle_pokemon_id',
              'battle_pokemon_form',
              'battle_level',
            ]),
          )
          .where(getStationColumn('is_inactive'), false)
          .andWhere(getStationColumn('battle_end'), '>', ts)
          .andWhere(getStationColumn('updated'), '>', activeCutoff)
          .union((builder) => {
            builder
              .select([
                raw(
                  `${STATION_BATTLE_ROW_ALIAS}.battle_pokemon_id AS battle_pokemon_id`,
                ),
                raw(
                  `${STATION_BATTLE_ROW_ALIAS}.battle_pokemon_form AS battle_pokemon_form`,
                ),
                raw(`${STATION_BATTLE_ROW_ALIAS}.battle_level AS battle_level`),
              ])
              .from(STATION_TABLE)
              .join(STATION_BATTLE_ROW_TABLE, (join) => {
                join
                  .on(
                    'station.id',
                    '=',
                    `${STATION_BATTLE_ROW_ALIAS}.station_id`,
                  )
                  .andOn(
                    `${STATION_BATTLE_ROW_ALIAS}.battle_end`,
                    '>',
                    raw('?', [ts]),
                  )
              })
              .where(getStationColumn('is_inactive'), false)
              .andWhere(getStationColumn('updated'), '>', activeCutoff)
          })
          .orderBy('battle_pokemon_id', 'asc')
      : await this.query()
          .distinct(
            getStationSelect([
              'battle_pokemon_id',
              'battle_pokemon_form',
              'battle_level',
            ]),
          )
          .where(getStationColumn('is_inactive'), false)
          .andWhere(getStationColumn('battle_end'), '>', ts)
          .andWhere(getStationColumn('updated'), '>', activeCutoff)
          .groupBy([
            getStationColumn('battle_pokemon_id'),
            getStationColumn('battle_pokemon_form'),
            getStationColumn('battle_level'),
          ])
          .orderBy('battle_pokemon_id', 'asc')
    return {
      available: [
        ...new Set(
          results
            .filter(({ battle_level }) => !!battle_level)
            .flatMap((station) => [
              `${station.battle_pokemon_id}-${station.battle_pokemon_form}`,
              `j${station.battle_level}`,
            ]),
        ),
      ],
    }
  }

  /**
   *
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} context
   * @param {ReturnType<typeof import('objection').raw>} distance
   * @param {ReturnType<typeof import("server/src/utils/getBbox").getBboxFromCenter>} bbox
   * @returns {Promise<import("@rm/types").FullStation[]>}
   */
  static async search(perms, args, { isMad, hasMultiBattles }, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '', locale } = args
    const { searchResultsLimit, stationUpdateLimit } = config.getSafe('api')
    const ts = getEpoch()
    const knexRef = this.knex()
    const trimmedSearch = search.trim()
    const normalizedSearch = trimmedSearch.toLowerCase()

    if (!normalizedSearch) {
      return []
    }

    const pokemonIds = Object.keys(state.event.masterfile.pokemon)
      .filter((pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .map(Number)
      .filter(Number.isFinite)

    const select = [...getStationSelect(['id', 'name', 'lat', 'lon']), distance]
    if (perms.dynamax) {
      if (hasMultiBattles) {
        select.push(
          ...getAliasedStationSelect(STATION_SEARCH_BATTLE_FIELDS, 'station_'),
          getSearchBattleJsonSubquery(knexRef, [], ts).as('display_battle'),
        )
        if (pokemonIds.length) {
          select.push(
            getSearchBattleJsonSubquery(knexRef, pokemonIds, ts).as(
              'matched_battle',
            ),
          )
        }
      } else {
        select.push(...getStationSelect(STATION_SEARCH_BATTLE_FIELDS))
      }
    }

    const query = this.query()
      .select(select)
      .whereBetween(getStationColumn('lat'), [bbox.minLat, bbox.maxLat])
      .andWhereBetween(getStationColumn('lon'), [bbox.minLon, bbox.maxLon])
      .andWhere(
        getStationColumn('updated'),
        '>',
        Date.now() / 1000 - stationUpdateLimit * 60 * 60,
      )
      .andWhere(getStationColumn('end_time'), '>', ts)
      .andWhere((builder) => {
        if (perms.stations) {
          builder.orWhereILike(getStationColumn('name'), `%${trimmedSearch}%`)
        }
        if (perms.dynamax) {
          if (hasMultiBattles) {
            builder.orWhere((battleMatch) => {
              battleMatch.orWhereExists(
                knexRef
                  .select(1)
                  .from(STATION_BATTLE_FILTER_TABLE)
                  .whereRaw(
                    `${STATION_BATTLE_FILTER_ALIAS}.station_id = station.id`,
                  )
                  .whereIn(
                    `${STATION_BATTLE_FILTER_ALIAS}.battle_pokemon_id`,
                    pokemonIds,
                  )
                  .andWhere(
                    `${STATION_BATTLE_FILTER_ALIAS}.battle_end`,
                    '>',
                    ts,
                  ),
              )
              battleMatch.orWhere((legacyBattle) => {
                legacyBattle
                  .whereIn(getStationColumn('battle_pokemon_id'), pokemonIds)
                  .andWhere(getStationColumn('battle_end'), '>', ts)
              })
            })
          } else {
            builder.orWhere((builder2) => {
              builder2
                .whereIn(getStationColumn('battle_pokemon_id'), pokemonIds)
                .andWhere(getStationColumn('battle_end'), '>', ts)
            })
          }
        }
      })
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    const rows = await query
    if (!(perms.dynamax && hasMultiBattles)) {
      return rows
    }
    return rows.map((row) => {
      const matchedBattle =
        typeof row.matched_battle === 'string'
          ? JSON.parse(row.matched_battle)
          : row.matched_battle
      const searchBattle =
        typeof row.display_battle === 'string'
          ? JSON.parse(row.display_battle)
          : row.display_battle
      const legacyBattle = getAliasedStationBattle(row, 'station', ts, null)
      const matchedLegacyBattle =
        pokemonIds.length &&
        legacyBattle &&
        pokemonIds.includes(legacyBattle.battle_pokemon_id)
          ? legacyBattle
          : null
      const displayBattle =
        matchedBattle ||
        matchedLegacyBattle ||
        getPreferredStationBattle([legacyBattle, searchBattle], ts)
      STATION_SEARCH_BATTLE_FIELDS.forEach((field) => {
        row[field] = displayBattle
          ? (displayBattle[field] ?? null)
          : (row[`station_${field}`] ?? null)
        delete row[`station_${field}`]
      })
      delete row.display_battle
      delete row.matched_battle
      return row
    })
  }
}

module.exports = { Station }
