// @ts-check

/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const i18next = require('i18next')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { state } = require('../services/state')

const coreFields = [
  'id',
  'name',
  'url',
  'lat',
  'lon',
  'updated',
  'last_modified_timestamp',
]

const gymFields = [
  'available_slots',
  'ex_raid_eligible',
  'ar_scan_eligible',
  'team_id',
  'in_battle',
  'guarding_pokemon_id',
  'guarding_pokemon_display',
  'total_cp',
  'power_up_points',
  'power_up_level',
  'power_up_end_timestamp',
]

const raidFields = [
  'raid_level',
  'raid_battle_timestamp',
  'raid_end_timestamp',
  'raid_pokemon_id',
  'raid_pokemon_form',
  'raid_pokemon_gender',
  'raid_pokemon_costume',
  'raid_pokemon_evolution',
  'raid_pokemon_move_1',
  'raid_pokemon_move_2',
  'raid_pokemon_alignment',
]

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  /**
   *
   * @param {import('objection').QueryBuilder<Gym, Gym[]>} query
   * @param {boolean} isMad
   */
  static onlyValid(query, isMad) {
    query.andWhere('enabled', true)
    if (!isMad) {
      query.andWhere('deleted', false)
    }
  }

  static async getAll(perms, args, { isMad, availableSlotsCol }, userId) {
    const {
      gyms: gymPerms,
      raids: raidPerms,
      areaRestrictions,
      gymBadges,
    } = perms
    const {
      onlyLevels,
      onlyAllGyms,
      onlyRaids,
      onlyExEligible,
      onlyInBattle,
      onlyArEligible,
      onlyRaidTier,
      onlyGymBadges,
      onlyBadge,
      onlyAreas = [],
    } = args.filters
    const ts = Math.floor(Date.now() / 1000)
    const query = this.query()
    const { queryLimits, gymValidDataLimit, hideOldGyms } =
      config.getSafe('api')
    const { baseGymSlotAmounts } = config.getSafe('defaultFilters.gyms')

    if (isMad) {
      query
        .leftJoin('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
        .leftJoin('raid', 'gym.gym_id', 'raid.gym_id')
        .select([
          'gym.gym_id AS id',
          'name',
          'url',
          'latitude AS lat',
          'longitude AS lon',
          'team_id',
          'slots_available AS available_slots',
          'is_in_battle AS in_battle',
          'guard_pokemon_id AS guarding_pokemon_id',
          'total_cp',
          'is_ex_raid_eligible AS ex_raid_eligible',
          'is_ar_scan_eligible AS ar_scan_eligible',
          'level AS raid_level',
          'pokemon_id AS raid_pokemon_id',
          'raid.form AS raid_pokemon_form',
          'raid.gender AS raid_pokemon_gender',
          'raid.costume AS raid_pokemon_costume',
          'evolution AS raid_pokemon_evolution',
          'move_1 AS raid_pokemon_move_1',
          'move_2 AS raid_pokemon_move_2',
          raw('UNIX_TIMESTAMP(last_modified)').as('last_modified_timestamp'),
          raw('UNIX_TIMESTAMP(end)').as('raid_end_timestamp'),
          raw('UNIX_TIMESTAMP(start)').as('raid_battle_timestamp'),
          raw('UNIX_TIMESTAMP(gym.last_scanned)').as('updated'),
        ])
      if (hideOldGyms) {
        query.whereRaw(
          `UNIX_TIMESTAMP(gym.last_scanned) > ${
            ts - gymValidDataLimit * 86400
          }`,
        )
      }
    } else if (hideOldGyms) {
      query.where('updated', '>', ts - gymValidDataLimit * 86400)
    }
    query
      .whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
    Gym.onlyValid(query, isMad)

    const raidBosses = new Set()
    const raidForms = new Set()
    const teams = []
    const eggs = []
    const slots = []
    const actualBadge =
      onlyBadge && onlyBadge.startsWith('badge_')
        ? +onlyBadge.replace('badge_', '')
        : `${onlyBadge}`

    const userBadges =
      onlyGymBadges && gymBadges && userId
        ? await state.db.query(
            'Badge',
            'getAll',
            userId,
            ...(typeof actualBadge === 'string'
              ? ['>', 0]
              : ['=', actualBadge]),
          )
        : []

    Object.keys(args.filters).forEach((gym) => {
      switch (gym.charAt(0)) {
        case 'r':
        case 'o':
          break
        case 'e':
          eggs.push(gym.slice(1))
          break
        case 't':
          teams.push(gym.slice(1).split('-')[0])
          break
        case 'g':
          slots.push({
            team: gym.slice(1).split('-')[0],
            slots: baseGymSlotAmounts.length - gym.slice(1).split('-')[1],
          })
          break
        default:
          {
            const [id, form] = gym.split('-')

            if (id) raidBosses.add(id)
            if (form) raidForms.add(form)
          }
          break
      }
    })

    const finalTeams = []
    const finalSlots = Object.fromEntries(
      Object.keys(state.event.masterfile.teams).map((team) => [team, []]),
    )

    teams.forEach((team) => {
      const all = args.filters[`t${team}-0`]?.all
      let slotCount = all ? baseGymSlotAmounts.length : 0

      if (!all) {
        slots.forEach((slot) => {
          if (slot.team === team) {
            slotCount += 1
            finalSlots[team].push(+slot.slots)
          }
        })
      }
      if (slotCount === baseGymSlotAmounts.length || team == 0) {
        delete finalSlots[team]
        finalTeams.push(+team)
      }
    })

    if (
      !onlyArEligible &&
      !onlyExEligible &&
      !onlyInBattle &&
      !userBadges.length
    ) {
      // Does some checks if no special filters are enabled
      if (!onlyRaids && onlyAllGyms && !slots.length && !finalTeams.length) {
        // Returns nothing if gyms are enabled but no teams are selected
        return []
      }
      if (
        !onlyAllGyms &&
        onlyRaids &&
        onlyRaidTier === 'all' &&
        !raidBosses.size &&
        !eggs.length
      ) {
        // Returns nothing if only raids are enabled without any filters
        return []
      }
      if (onlyGymBadges && !userBadges.length && !onlyAllGyms && !onlyRaids) {
        // Returns nothing if only gym badges are enabled without any badges
        return []
      }
    }

    if (onlyAllGyms && onlyLevels !== 'all' && !isMad && onlyLevels) {
      query.andWhere('power_up_level', onlyLevels)
    }
    query.andWhere((gym) => {
      if (onlyExEligible && gymPerms) {
        gym.orWhere((ex) => {
          ex.where(isMad ? 'is_ex_raid_eligible' : 'ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gymPerms) {
        gym.orWhere((battle) => {
          battle.where(isMad ? 'is_in_battle' : 'in_battle', 1)
        })
      }
      if (onlyArEligible && gymPerms) {
        gym.orWhere((ar) => {
          ar.where(isMad ? 'is_ar_scan_eligible' : 'ar_scan_eligible', 1)
        })
      }
      if (onlyAllGyms && gymPerms) {
        if (finalTeams.length === 0 && slots.length === 0) {
          gym.whereNull('team_id')
        } else if (finalTeams.length === 4) {
          gym.orWhereNotNull('team_id')
        } else {
          if (finalTeams.length) {
            gym.orWhere((team) => {
              team.whereIn('team_id', finalTeams || [])
            })
          }
          Object.entries(finalSlots).forEach(([team, teamSlots]) => {
            if (teamSlots.length) {
              gym.orWhere((gymSlot) => {
                gymSlot
                  .where('team_id', team)
                  .whereIn(
                    isMad ? 'slots_available' : availableSlotsCol,
                    teamSlots || [],
                  )
              })
            }
          })
        }
      }
      if (actualBadge === 'none' && onlyGymBadges) {
        gym.orWhereNotIn(
          isMad ? 'gym.gym_id' : 'id',
          userBadges.map((badge) => badge.gymId) || [],
        )
      } else if (userBadges.length) {
        gym.orWhereIn(
          isMad ? 'gym.gym_id' : 'id',
          userBadges.map((badge) => badge.gymId) || [],
        )
      }
      if (onlyRaids && raidPerms) {
        if (onlyRaidTier === 'all') {
          if (raidBosses.size) {
            gym.orWhere((raid) => {
              raid
                .where(
                  isMad ? 'end' : 'raid_end_timestamp',
                  '>=',
                  isMad ? this.knex().fn.now() : ts,
                )
                .whereIn(isMad ? 'pokemon_id' : 'raid_pokemon_id', [
                  ...(raidBosses || []),
                ])
                .whereIn(isMad ? 'raid.form' : 'raid_pokemon_form', [
                  ...(raidForms || []),
                ])
            })
          }
          if (eggs.length) {
            gym.orWhere((egg) => {
              if (eggs.length === 6) {
                egg.where(isMad ? 'level' : 'raid_level', '>', 0)
              } else {
                egg.whereIn(isMad ? 'level' : 'raid_level', eggs || [])
              }
              egg.andWhere((eggStatus) => {
                eggStatus
                  .where(
                    isMad ? 'start' : 'raid_battle_timestamp',
                    '>=',
                    isMad ? this.knex().fn.now() : ts,
                  )
                  .orWhere((unknownEggs) => {
                    unknownEggs
                      .where(isMad ? 'pokemon_id' : 'raid_pokemon_id', 0)
                      .andWhere(
                        isMad ? 'end' : 'raid_end_timestamp',
                        '>=',
                        isMad ? this.knex().fn.now() : ts,
                      )
                  })
              })
            })
          }
        } else {
          gym.orWhere((raidTier) => {
            raidTier
              .where(isMad ? 'level' : 'raid_level', onlyRaidTier)
              .andWhere(
                isMad ? 'end' : 'raid_end_timestamp',
                '>=',
                isMad ? this.knex().fn.now() : ts,
              )
          })
        }
      }
    })
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }

    const secondaryFilter = (queryResults) => {
      const filteredResults = []
      const userBadgeObj = Object.fromEntries(
        userBadges.map((b) => [b.gymId, b.badge]),
      )

      queryResults.forEach((gym) => {
        const newGym = Object.fromEntries(
          coreFields.map((field) => [field, gym[field]]),
        )
        const isRaid = gym.raid_end_timestamp > ts
        const isEgg = isRaid && !gym.raid_pokemon_id

        if (userBadgeObj[gym.id]) {
          newGym.badge = userBadgeObj[gym.id]
        }
        if (gymPerms) {
          if (gym.availble_slots !== undefined) {
            gym.available_slots = gym.availble_slots
          }
          if (gym.updated > ts - gymValidDataLimit * 86400) {
            gymFields.forEach((field) => (newGym[field] = gym[field]))
          }
          if (
            typeof gym.guarding_pokemon_display === 'string' &&
            gym.guarding_pokemon_display
          ) {
            newGym.guarding_pokemon_display = JSON.parse(
              gym.guarding_pokemon_display,
            )
          }
        }
        if (
          onlyRaids &&
          raidPerms &&
          (onlyRaidTier === 'all'
            ? (args.filters[
                `${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`
              ] &&
                isRaid) ||
              (args.filters[`e${gym.raid_level}`] && isEgg)
            : onlyRaidTier === gym.raid_level && (isRaid || isEgg))
        ) {
          raidFields.forEach((field) => (newGym[field] = gym[field]))
          if (!newGym.raid_pokemon_alignment) newGym.raid_pokemon_alignment = 0
          newGym.hasRaid = true
        }
        if (
          (onlyAllGyms ||
            (onlyExEligible && newGym.ex_raid_eligible) ||
            (onlyArEligible && newGym.ar_scan_eligible) ||
            (onlyInBattle && newGym.in_battle)) &&
          (finalTeams.includes(gym.team_id) ||
            finalSlots[gym.team_id]?.includes(gym.available_slots))
        ) {
          newGym.hasGym = true
        }
        if (
          newGym.hasRaid ||
          newGym.badge ||
          (actualBadge === 'none' && onlyGymBadges) ||
          newGym.hasGym
        ) {
          filteredResults.push(newGym)
        }
      })

      return filteredResults
    }

    return secondaryFilter(await query.limit(queryLimits.gyms))
  }

  static async getAvailable({ isMad, availableSlotsCol }) {
    const ts = Math.floor(Date.now() / 1000)
    const results = await this.query()
      .select([
        isMad ? 'pokemon_id AS raid_pokemon_id' : 'raid_pokemon_id',
        isMad ? 'form AS raid_pokemon_form' : 'raid_pokemon_form',
        isMad ? 'level AS raid_level' : 'raid_level',
      ])
      .from(isMad ? 'raid' : 'gym')
      .where(
        isMad ? 'end' : 'raid_end_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )
      .andWhere(isMad ? 'level' : 'raid_level', '>', 0)
      .groupBy([
        isMad ? 'pokemon_id' : 'raid_pokemon_id',
        isMad ? 'form' : 'raid_pokemon_form',
        isMad ? 'level' : 'raid_level',
      ])
      .orderBy(isMad ? 'pokemon_id' : 'raid_pokemon_id', 'asc')
    const teamResults = await this.query()
      .select([
        'team_id AS team',
        isMad ? 'slots_available AS slots' : `${availableSlotsCol} AS slots`,
      ])
      .groupBy(['team_id', isMad ? 'slots_available' : availableSlotsCol])
      .then((r) => {
        const unique = new Set()

        r.forEach((result) => {
          if (result.team !== null && result.slots !== null) {
            unique.add(`t${result.team}-0`)
            unique.add(`g${result.team}-${6 - result.slots}`)
          }
        })

        return [...unique]
      })

    return {
      available: [
        ...teamResults,
        ...results.flatMap((result) => {
          if (result.raid_pokemon_id) {
            return `${result.raid_pokemon_id}-${result.raid_pokemon_form}`
          }

          return [`e${result.raid_level}`, `r${result.raid_level}`]
        }),
      ],
    }
  }

  static async search(perms, args, { isMad }, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '' } = args

    const query = this.query()
      .select([
        'name',
        isMad ? 'gym.gym_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        'url',
        distance,
      ])
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .whereILike('name', `%${search}%`)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    if (isMad) {
      query.leftJoin('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
    }
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    Gym.onlyValid(query, isMad)

    return query
  }

  static async searchRaids(
    perms,
    args,
    { isMad, hasAlignment },
    distance,
    bbox,
  ) {
    const { search, locale, onlyAreas = [] } = args
    const pokemonIds = Object.keys(state.event.masterfile.pokemon).filter(
      (pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .toLowerCase()
          .includes(search),
    )
    const ts = Math.floor(Date.now() / 1000)

    const query = this.query()
      .select([
        'name',
        isMad ? 'gym.gym_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'pokemon_id AS raid_pokemon_id' : 'raid_pokemon_id',
        isMad ? 'raid.form AS raid_pokemon_form' : 'raid_pokemon_form',
        isMad ? 'raid.gender AS raid_pokemon_gender' : 'raid_pokemon_gender',
        isMad ? 'raid.costume AS raid_pokemon_costume' : 'raid_pokemon_costume',
        isMad
          ? 'evolution AS raid_pokemon_evolution'
          : 'raid_pokemon_evolution',
        distance,
      ])
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .whereIn(isMad ? 'pokemon_id' : 'raid_pokemon_id', pokemonIds)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
      .andWhere(
        isMad ? 'start' : 'raid_battle_timestamp',
        '<=',
        isMad ? this.knex().fn.now() : ts,
      )
      .andWhere(
        isMad ? 'end' : 'raid_end_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )

    if (isMad) {
      query
        .leftJoin('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
        .leftJoin('raid', 'gym.gym_id', 'raid.gym_id')
    }
    if (hasAlignment) {
      query.select('raid_pokemon_alignment')
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    Gym.onlyValid(query, isMad)

    return query
  }

  static async getBadges(userGyms, { isMad }) {
    const query = this.query().select([
      '*',
      isMad ? 'gym.gym_id AS id' : 'gym.id',
      isMad ? 'latitude AS lat' : 'lat',
      isMad ? 'longitude AS lon' : 'lon',
      isMad ? 'enabled' : 'deleted',
    ])

    if (isMad) {
      query.leftJoin('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
    }
    const results = await query.whereIn(
      isMad ? 'gym.gym_id' : 'gym.id',
      userGyms.map((gym) => gym.gymId) || [],
    )

    return results
      .map((gym) => {
        if (typeof gym.enabled === 'boolean') {
          gym.deleted = !gym.enabled
        }
        const gymBadge = userGyms.find((userGym) => userGym.gymId === gym.id)

        if (gymBadge) {
          gym.badge = gymBadge.badge
          gym.updatedAt = gymBadge.updatedAt
          gym.createdAt = gymBadge.createdAt
        }

        return gym
      })
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .reverse()
  }

  static getOne(id, { isMad }) {
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'gym_id' : 'id', id)
      .first()
  }

  static async getSubmissions(perms, args, { isMad }) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const wiggle = 0.025
    const query = this.query()
      .whereBetween(`lat${isMad ? 'itude' : ''}`, [
        minLat - wiggle,
        maxLat + wiggle,
      ])
      .andWhereBetween(`lon${isMad ? 'gitude' : ''}`, [
        minLon - wiggle,
        maxLon + wiggle,
      ])

    if (isMad) {
      query.select(['gym_id AS id', 'latitude AS lat', 'longitude AS lon'])
    } else {
      query.select(['id', 'lat', 'lon', 'partner_id'])

      if (!onlyIncludeSponsored) {
        query.andWhere((poi) => {
          poi.whereNull('partner_id').orWhere('partner_id', 0)
        })
      }
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    Gym.onlyValid(query, isMad)

    const results = await query

    return results
  }
}

module.exports = { Gym }
