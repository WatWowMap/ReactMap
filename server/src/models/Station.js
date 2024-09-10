// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')
const i18next = require('i18next')

const { getAreaSql } = require('../utils/getAreaSql')
const { getEpoch } = require('../utils/getClientTime')
const { state } = require('../services/state')

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
  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const { onlyAreas, onlyAllStations, onlyMaxBattles, onlyBattleTier } =
      args.filters
    const ts = getEpoch()

    const select = [
      'id',
      'name',
      'lat',
      'lon',
      'updated',
      'start_time',
      'end_time',
    ]

    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('end_time', '>', ts)
    // .where('is_inactive', false)

    if (perms.dynamax && onlyMaxBattles) {
      select.push(
        'is_battle_available',
        'battle_level',
        'battle_pokemon_id',
        'battle_pokemon_form',
        'battle_pokemon_costume',
        'battle_pokemon_gender',
        'battle_pokemon_alignment',
      )

      if (!onlyAllStations) {
        if (onlyBattleTier === 'all') {
          const battleBosses = new Set()
          const battleForms = new Set()
          const battleLevels = new Set()

          Object.keys(args.filters).forEach((key) => {
            switch (key.charAt(0)) {
              case 'o':
                break
              case 'j':
                battleLevels.add(key.slice(1))
                break
              default:
                {
                  const [id, form] = key.split('-')
                  if (id) battleBosses.add(id)
                  if (form) battleForms.add(form)
                }
                break
            }
          })

          if (battleBosses.size) {
            query.andWhere('battle_pokemon_id', 'in', [...battleBosses])
          }
          if (battleForms.size) {
            query.andWhere('battle_pokemon_form', 'in', [...battleForms])
          }
          if (battleLevels.size) {
            query.andWhere('battle_level', 'in', [...battleLevels])
          }
        } else {
          query.andWhere('battle_level', onlyBattleTier)
        }
      }
    }

    query.select(select)

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    /** @type {import("@rm/types").FullStation[]} */
    const results = await query

    return results.filter(
      (station) =>
        onlyAllStations ||
        !perms.dynamax ||
        args.filters[`j${station.battle_level}`] ||
        args.filters[
          `${station.battle_pokemon_id}-${station.battle_pokemon_form}`
        ] ||
        onlyBattleTier === 'all' ||
        onlyBattleTier === station.battle_level,
    )
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

  static async getAvailable() {
    /** @type {import('@rm/types').FullStation[]} */
    const results = await this.query()
      .distinct(['battle_pokemon_id', 'battle_pokemon_form', 'battle_level'])
      .where('is_inactive', false)
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
      )
    }

    const query = this.query()
      .select(select)
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - stationUpdateLimit * 60 * 60 * 24,
      )
      .andWhere((builder) => {
        if (perms.stations) {
          builder.orWhereILike('name', `%${search}%`)
        }
        if (perms.dynamax) {
          builder.orWhereIn('battle_pokemon_id', pokemonIds)
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
