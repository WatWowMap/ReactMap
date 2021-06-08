/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const fetchRaids = require('../services/functions/fetchRaids')
const { pokemon: masterfile } = require('../data/masterfile.json')
const dbSelection = require('../services/functions/dbSelection')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static get idColumn() {
    return dbSelection('gym') === 'mad'
      ? 'gym_id' : 'id'
  }

  static async getAllGyms(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { gyms, raids } = perms
    const {
      onlyGyms, onlyRaids, onlyExEligible, onlyInBattle, onlyArEligible,
    } = args.filters
    const query = this.query()

    if (isMad) {
      query.join('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
        .join('raid', 'gym.gym_id', 'raid.gym_id')
        .select([
          'gym.gym_id AS id',
          'name',
          'url',
          'latitude AS lat',
          'longitude AS lon',
          'team_id',
          'slots_available AS availble_slots',
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
          raw('UNIX_TIMESTAMP(last_modified)')
            .as('last_modified_timestamp'),
          raw('UNIX_TIMESTAMP(end)')
            .as('raid_end_timestamp'),
          raw('UNIX_TIMESTAMP(start)')
            .as('raid_battle_timestamp'),
          raw('UNIX_TIMESTAMP(gym.last_scanned)')
            .as('updated'),
        ])
    }
    query.whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)

    const raidBosses = new Set()
    const teams = []
    const eggs = []
    const slots = []

    Object.keys(args.filters).forEach(gym => {
      if (gym.charAt(0) !== 'o') {
        switch (gym.charAt(0)) {
          default: raidBosses.add(gym.split('-')[0]); break
          case 'e': eggs.push(gym.slice(1)); break
          case 't': teams.push(gym.slice(1).split('-')[0]); break
          case 'g': slots.push({
            team: gym.slice(1).split('-')[0],
            slots: 6 - gym.slice(1).split('-')[1],
          }); break
        }
      }
    })
    const finalTeams = []
    const finalSlots = {
      1: [],
      2: [],
      3: [],
    }

    teams.forEach(team => {
      let slotCount = 0
      slots.forEach(slot => {
        if (slot.team === team) {
          slotCount += 1
          finalSlots[team].push(slot.slots)
        }
      })
      if (slotCount === 6 || team == 0) {
        delete finalSlots[team]
        finalTeams.push(team)
      }
    })

    query.andWhere(gym => {
      if (onlyExEligible && gyms) {
        gym.orWhere(ex => {
          ex.where(isMad ? 'is_ex_raid_eligible' : 'ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gyms) {
        gym.orWhere(battle => {
          battle.where(isMad ? 'is_in_battle' : 'in_battle', 1)
        })
      }
      if (onlyArEligible && gyms) {
        gym.orWhere(ar => {
          ar.where(isMad ? 'is_ar_scan_eligible' : 'ar_scan_eligible', 1)
        })
      }
      if (onlyGyms && gyms) {
        if (finalTeams.length === 0 && slots.length === 0) {
          gym.whereNull('team_id')
        } else if (finalTeams.length === 4) {
          gym.orWhereNotNull('team_id')
        } else {
          if (finalTeams.length > 0) {
            gym.orWhere(team => {
              team.whereIn('team_id', finalTeams)
            })
          }
          Object.keys(finalSlots).forEach(team => {
            if (finalSlots[team].length > 0) {
              gym.orWhere(gymSlot => {
                gymSlot.where('team_id', team)
                  .whereIn(isMad ? 'slots_available' : 'availble_slots', finalSlots[team])
              })
            }
          })
        }
      }
      if (onlyRaids && raids) {
        gym.orWhere(pokemon => {
          pokemon.whereIn(isMad ? 'pokemon_id' : 'raid_pokemon_id', [...raidBosses])
            .andWhere(isMad ? 'start' : 'raid_battle_timestamp', '<=', isMad ? this.knex().fn.now() : ts)
            .andWhere(isMad ? 'end' : 'raid_end_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
            .andWhere(isMad ? 'level' : 'raid_level', '>', 0)
        })
        gym.orWhere(egg => {
          if (eggs.length === 6) {
            egg.where(isMad ? 'level' : 'raid_level', '>', 0)
          } else {
            egg.whereIn(isMad ? 'level' : 'raid_level', eggs)
          }
          egg.andWhere(isMad ? 'start' : 'raid_battle_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        })
      }
    })

    const secondaryFilter = queryResults => {
      const { length } = queryResults
      const filteredResults = []

      for (let i = 0; i < length; i += 1) {
        const gym = queryResults[i]
        if (gym.raid_pokemon_form === 0 && gym.raid_pokemon_id > 0) {
          const formId = masterfile[gym.raid_pokemon_id].default_form_id
          if (formId) gym.raid_pokemon_form = formId
        }
        if (!gyms) {
          gym.team_id = 0
        }
        if (!gym.raid_pokemon_id
          && args.filters[`e${gym.raid_level}`]) {
          filteredResults.push(gym)
        } else if (args.filters[`${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`]) {
          filteredResults.push(gym)
        } else if (gyms && (onlyGyms || onlyArEligible)) {
          if (args.filters[`t${gym.team_id}-0`]) {
            gym.raid_end_timestamp = null
            gym.raid_battle_timestamp = null
            gym.raid_pokemon_id = null
            gym.raid_level = null
            filteredResults.push(gym)
          }
        }
      }
      return filteredResults
    }
    return secondaryFilter(await query)
  }

  static async getAvailableRaidBosses(isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select([
        isMad ? 'pokemon_id AS raid_pokemon_id' : 'raid_pokemon_id',
        isMad ? 'form AS raid_pokemon_form' : 'raid_pokemon_form',
        isMad ? 'level AS raid_level' : 'raid_level',
      ])
      .from(isMad ? 'raid' : 'gym')
      .where(isMad ? 'end' : 'raid_end_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .andWhere(isMad ? 'level' : 'raid_level', '>', 0)
      .groupBy([
        isMad ? 'pokemon_id' : 'raid_pokemon_id',
        isMad ? 'form' : 'raid_pokemon_form',
        isMad ? 'level' : 'raid_level',
      ])
      .orderBy(isMad ? 'pokemon_id' : 'raid_pokemon_id', 'asc')
    if (results.length === 0) {
      return fetchRaids()
    }
    return results.map(pokemon => {
      if (pokemon.raid_pokemon_id === 0) {
        return `e${pokemon.raid_level}`
      }
      if (pokemon.raid_pokemon_form === 0) {
        const formId = masterfile[pokemon.raid_pokemon_id].default_form_id
        if (formId) pokemon.raid_pokemon_form = formId
      }
      return `${pokemon.raid_pokemon_id}-${pokemon.raid_pokemon_form}`
    })
  }
}

module.exports = Gym
