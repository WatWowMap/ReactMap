// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')
const i18next = require('i18next')

const { log, TAGS } = require('@rm/logger')

const { getAreaSql } = require('../utils/getAreaSql')
const { applyManualIdFilter } = require('../utils/manualFilter')
const { getEpoch } = require('../utils/getClientTime')
const { state } = require('../services/state')
const { getSharedPvpWrapper } = require('../services/PvpWrapper')

const DEFAULT_IV = 15

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
    { isMad, hasStationedGmax, hasBattlePokemonStats },
  ) {
    const { areaRestrictions } = perms
    const { stationUpdateLimit, stationInactiveLimitDays } =
      config.getSafe('api')
    const {
      onlyAreas,
      onlyAllStations,
      onlyMaxBattles,
      onlyBattleTier,
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

    if (!onlyAllStations && !onlyInactiveStations && !perms.dynamax) {
      return []
    }

    const ts = getEpoch()
    const baseSelect = [
      'id',
      'name',
      'lat',
      'lon',
      'updated',
      'start_time',
      'end_time',
    ]

    const manualFilterOptions = {
      manualId: args.filters.onlyManualId,
      latColumn: 'lat',
      lonColumn: 'lon',
      idColumn: 'id',
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    }

    const select = [...baseSelect]

    const query = this.query()
    applyManualIdFilter(query, manualFilterOptions)
    const now = Date.now() / 1000
    const activeCutoff = now - stationUpdateLimit * 60 * 60
    const inactiveCutoff = now - stationInactiveLimitDays * 24 * 60 * 60

    if (perms.dynamax && (onlyMaxBattles || onlyGmaxStationed)) {
      select.push(
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
      )
      select.push(
        hasStationedGmax ? 'total_stationed_gmax' : 'stationed_pokemon',
      )
      if (hasBattlePokemonStats) {
        select.push('battle_pokemon_stamina', 'battle_pokemon_cp_multiplier')
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
          const hasBattleConditions =
            onlyBattleTier !== 'all' ||
            battleLevels.length > 0 ||
            battleCombos.length > 0
          if (hasBattleConditions) {
            const method = applied ? 'orWhere' : 'where'
            station[method]((battle) => {
              battle
                .whereNotNull('battle_pokemon_id')
                .andWhere('battle_end', '>', ts)
              if (onlyBattleTier === 'all') {
                battle.andWhere((match) => {
                  let matchApplied = false
                  if (battleLevels.length) {
                    const levelMethod = matchApplied ? 'orWhereIn' : 'whereIn'
                    match[levelMethod]('battle_level', battleLevels)
                    matchApplied = true
                  }
                  battleCombos.forEach(({ pokemonId, form }) => {
                    const comboMethod = matchApplied ? 'orWhere' : 'where'
                    match[comboMethod]((combo) => {
                      combo.where('battle_pokemon_id', pokemonId)
                      if (form === null) {
                        combo.andWhereNull('battle_pokemon_form')
                      } else {
                        combo.andWhere('battle_pokemon_form', form)
                      }
                    })
                    matchApplied = true
                  })
                  if (!matchApplied) {
                    match.whereRaw('0 = 1')
                  }
                })
              } else {
                battle.andWhere('battle_level', onlyBattleTier)
              }
            })
            applied = true
          }
        }

        if (onlyGmaxStationed) {
          if (hasStationedGmax) {
            const method = applied ? 'orWhere' : 'where'
            station[method]('total_stationed_gmax', '>', 0)
            applied = true
          } else {
            const method = applied ? 'orWhere' : 'where'
            station[method]((gmax) => {
              gmax.whereRaw(
                "JSON_SEARCH(COALESCE(stationed_pokemon, '[]'), 'one', ?, NULL, '$[*].bread_mode') IS NOT NULL",
                ['2'],
              )
              gmax.orWhereRaw(
                "JSON_SEARCH(COALESCE(stationed_pokemon, '[]'), 'one', ?, NULL, '$[*].bread_mode') IS NOT NULL",
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

    if (onlyInactiveStations) {
      query.andWhere((builder) => {
        builder.where((active) => {
          active
            .where('end_time', '>', ts)
            .andWhere('updated', '>', activeCutoff)
          applyStationFilters(active)
        })
        // Battle data etc of inactive stations should be ignored since they are outdated by design
        builder.orWhere((inactive) =>
          inactive
            .where('end_time', '<=', ts)
            .andWhere('updated', '>', inactiveCutoff),
        )
      })
    } else {
      query.andWhere('end_time', '>', ts).andWhere('updated', '>', activeCutoff)
      applyStationFilters(query)
    }

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }

    /** @type {import('@rm/types').FullStation[]} */
    const stations = await query

    let pokemonData = null
    if (hasBattlePokemonStats && perms.dynamax) {
      const needsEstimatedCp = stations.some((station) => {
        if (!station || !station.battle_pokemon_id) return false
        const multiplier = Number(station.battle_pokemon_cp_multiplier)
        return Number.isFinite(multiplier) && multiplier > 0
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

    return stations.map((station) => {
      if (station.is_battle_available && station.battle_pokemon_id === null) {
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

  static async getAvailable() {
    /** @type {import('@rm/types').FullStation[]} */
    const ts = getEpoch()
    const { stationUpdateLimit } = config.getSafe('api')
    const results = await this.query()
      .distinct(['battle_pokemon_id', 'battle_pokemon_form', 'battle_level'])
      .where('is_inactive', false)
      .andWhere('battle_end', '>', ts)
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - stationUpdateLimit * 60 * 60,
      )
      .groupBy(['battle_pokemon_id', 'battle_pokemon_form', 'battle_level'])
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
  static async search(perms, args, { isMad }, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '', locale } = args
    const { searchResultsLimit, stationUpdateLimit } = config.getSafe('api')
    const ts = getEpoch()

    const pokemonIds = Object.keys(state.event.masterfile.pokemon).filter(
      (pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .toLowerCase()
          .includes(search),
    )

    const select = ['id', 'name', 'lat', 'lon', distance]
    if (perms.dynamax) {
      select.push(
        'battle_level',
        'battle_pokemon_id',
        'battle_pokemon_form',
        'battle_pokemon_costume',
        'battle_pokemon_gender',
        'battle_pokemon_alignment',
        'battle_pokemon_bread_mode',
        'battle_end',
      )
    }

    const query = this.query()
      .select(select)
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - stationUpdateLimit * 60 * 60,
      )
      .andWhere('end_time', '>', ts)
      .andWhere((builder) => {
        if (perms.stations) {
          builder.orWhereILike('name', `%${search}%`)
        }
        if (perms.dynamax) {
          builder.orWhere((builder2) => {
            builder2
              .whereIn('battle_pokemon_id', pokemonIds)
              .andWhere('battle_end', '>', ts)
          })
        }
      })
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
  }
}

module.exports = { Station }
