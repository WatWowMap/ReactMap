// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')

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
    const { onlyAreas } = args.filters

    const select = ['id', 'name', 'lat', 'lon', 'updated']

    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
    // .where('is_inactive', false)

    if (perms.dynamax) {
      select.push(
        'start_time',
        'end_time',
        'battle_level',
        'battle_pokemon_id',
        'battle_pokemon_form',
        'battle_pokemon_costume',
        'battle_pokemon_gender',
        'battle_pokemon_alignment',
      )

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
    }

    query.select(select)

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    /** @type {import("@rm/types").FullStation[]} */
    const results = await query

    return results.filter(
      (station) =>
        args.filters.onlyAllStations ||
        !perms.dynamax ||
        args.filters[`j${station.battle_level}`] ||
        args.filters[
          `${station.battle_pokemon_id}-${station.battle_pokemon_form}`
        ],
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
      available: results
        .filter(({ battle_level }) => !!battle_level)
        .flatMap((station) => [
          `${station.battle_pokemon_id}-${station.battle_pokemon_form}`,
          `j${station.battle_level}`,
        ]),
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
    const { onlyAreas = [], search = '' } = args
    const { searchResultsLimit, stationUpdateLimit } = config.getSafe('api')

    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', distance])
      .whereILike('name', `%${search}%`)
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - stationUpdateLimit * 60 * 60 * 24,
      )
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
  }
}

module.exports = { Station }
