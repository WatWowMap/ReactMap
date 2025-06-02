// @ts-check

/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
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
   */
  static onlyValid(query) {
    query.andWhere('enabled', true).andWhere('deleted', false)
  }

  static async getAll(perms, args, { availableSlotsCol }, userId) {
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

    if (hideOldGyms) {
      query.where('updated', '>', ts - gymValidDataLimit * 86400)
    }
    query
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
    Gym.onlyValid(query)

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

    if (onlyAllGyms && onlyLevels !== 'all' && onlyLevels) {
      query.andWhere('power_up_level', onlyLevels)
    }
    query.andWhere((gym) => {
      if (onlyExEligible && gymPerms) {
        gym.orWhere((ex) => {
          ex.where('ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gymPerms) {
        gym.orWhere((battle) => {
          battle.where('in_battle', 1)
        })
      }
      if (onlyArEligible && gymPerms) {
        gym.orWhere((ar) => {
          ar.where('ar_scan_eligible', 1)
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
                  .whereIn(availableSlotsCol, teamSlots || [])
              })
            }
          })
        }
      }
      if (actualBadge === 'none' && onlyGymBadges) {
        gym.orWhereNotIn('id', userBadges.map((badge) => badge.gymId) || [])
      } else if (userBadges.length) {
        gym.orWhereIn('id', userBadges.map((badge) => badge.gymId) || [])
      }
      if (onlyRaids && raidPerms) {
        if (onlyRaidTier === 'all') {
          if (raidBosses.size) {
            gym.orWhere((raid) => {
              raid
                .where('raid_end_timestamp', '>=', ts)
                .whereIn('raid_pokemon_id', [...(raidBosses || [])])
                .whereIn('raid_pokemon_form', [...(raidForms || [])])
            })
          }
          if (eggs.length) {
            gym.orWhere((egg) => {
              if (eggs.length === 6) {
                egg.where('raid_level', '>', 0)
              } else {
                egg.whereIn('raid_level', eggs || [])
              }
              egg.andWhere((eggStatus) => {
                eggStatus
                  .where('raid_battle_timestamp', '>=', ts)
                  .orWhere((unknownEggs) => {
                    unknownEggs
                      .where('raid_pokemon_id', 0)
                      .andWhere('raid_end_timestamp', '>=', ts)
                  })
              })
            })
          }
        } else {
          gym.orWhere((raidTier) => {
            raidTier
              .where('raid_level', onlyRaidTier)
              .andWhere('raid_end_timestamp', '>=', ts)
          })
        }
      }
    })
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
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

  static async getAvailable({ availableSlotsCol }) {
    const ts = Math.floor(Date.now() / 1000)
    const results = await this.query()
      .select(['raid_pokemon_id', 'raid_pokemon_form', 'raid_level'])
      .from('gym')
      .where('raid_end_timestamp', '>=', ts)
      .andWhere('raid_level', '>', 0)
      .groupBy(['raid_pokemon_id', 'raid_pokemon_form', 'raid_level'])
      .orderBy('raid_pokemon_id', 'asc')
    const teamResults = await this.query()
      .select(['team_id AS team', `${availableSlotsCol} AS slots`])
      .groupBy(['team_id', availableSlotsCol])
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

  static async search(perms, args, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '' } = args

    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .whereILike('name', `%${search}%`)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    return query
  }

  static async searchRaids(perms, args, { hasAlignment }, distance, bbox) {
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
        'id',
        'lat',
        'lon',
        'raid_pokemon_id',
        'raid_pokemon_form',
        'raid_pokemon_gender',
        'raid_pokemon_costume',
        'raid_pokemon_evolution',
        distance,
      ])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .whereIn('raid_pokemon_id', pokemonIds)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
      .andWhere('raid_battle_timestamp', '<=', ts)
      .andWhere('raid_end_timestamp', '>=', ts)
    if (hasAlignment) {
      query.select('raid_pokemon_alignment')
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    return query
  }

  static async getBadges(userGyms) {
    const query = this.query().select(['*', 'gym.id', 'lat', 'lon', 'deleted'])

    const results = await query.whereIn(
      'gym.id',
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

  static getOne(id) {
    return this.query().select(['lat', 'lon']).where('id', id).first()
  }

  static async getSubmissions(perms, args) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const wiggle = 0.025
    const query = this.query()
      .whereBetween('lat', [minLat - wiggle, maxLat + wiggle])
      .andWhereBetween('lon', [minLon - wiggle, maxLon + wiggle])
    query.select(['id', 'lat', 'lon', 'partner_id'])

    if (!onlyIncludeSponsored) {
      query.andWhere((poi) => {
        poi.whereNull('partner_id').orWhere('partner_id', 0)
      })
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    const results = await query
    return results
  }
}

module.exports = { Gym }
