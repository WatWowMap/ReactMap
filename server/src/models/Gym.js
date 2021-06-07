/* eslint-disable no-restricted-syntax */
const { Model, raw } = require('objection')
const fetchRaids = require('../services/functions/fetchRaids')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static async getAllGyms(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { gyms, raids } = perms
    const {
      onlyGyms, onlyRaids, onlyExEligible, onlyInBattle, onlyArEligible,
    } = args.filters
    const query = this.query()

    if (isMad) {
      query.leftJoin('gymdetails', 'gym.gym_id', 'gymdetails.gym_id')
        .leftJoin('raid', 'gym.gym_id', 'raid.gym_id')
        .select([
          'gym.gym_id as id',
          'name',
          'url',
          'latitude as lat',
          'longitude as lon',
          'team_id',
          'slots_available as availble_slots',
          'is_in_battle as in_battle',
          'guard_pokemon_id as guarding_pokemon_id',
          'total_cp',
          'is_ex_raid_eligible as ex_raid_eligible',
          'is_ar_scan_eligible as ar_scan_eligible',
          'level as raid_level',
          'pokemon_id as raid_pokemon_id',
          'raid.form as raid_pokemon_form',
          'raid.gender as raid_pokemon_gender',
          'raid.costume as raid_pokemon_costume',
          'evolution as raid_pokemon_evolution',
          'move_1 as raid_pokemon_move_1',
          'move_2 as raid_pokemon_move_2',
          raw('Unix_timestamp(last_modified) AS last_modified_timestamp'),
          raw('Unix_timestamp(end) as raid_end_timestamp'),
          raw('Unix_timestamp(start) as raid_battle_timestamp'),
          raw('Unix_timestamp(gym.last_scanned) as updated'),
        ])
    }
    query.whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)

    const raidBosses = new Set()
    const teams = []
    const eggs = []
    const slots = {
      initial: [],
      1: [],
      2: [],
      3: [],
    }

    Object.keys(args.filters).forEach(raid => {
      switch (raid.charAt(0)) {
        default: raidBosses.add(raid.split('-')[0]); break
        case 'e': eggs.push(raid.slice(1)); break
        case 't': teams.push(raid.slice(1).split('-')[0]); break
        case 'g': slots.initial.push({
          team: raid.slice(1).split('-')[0],
          slots: 6 - raid.slice(1).split('-')[1],
        }); break
      }
    })
    const finalTeams = []

    teams.forEach(team => {
      let slotCount = 0
      slots.initial.forEach(slot => {
        if (slot.team === team) {
          slotCount += 1
          slots[team].push(slot.slots)
        }
      })
      if (slotCount === 6 || team == 0) {
        finalTeams.push(team)
      }
    })
    delete slots.initial

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
        gym.orWhere(team => {
          team.whereIn('team_id', finalTeams)
        })
        Object.keys(slots).forEach(team => {
          if (slots[team].length > 0) {
            gym.orWhere(gymSlot => {
              gymSlot.where('team_id', team)
                .whereIn(isMad ? 'slots_available' : 'availble_slots', slots[team])
            })
          }
        })
      }
      if (onlyRaids && raids) {
        gym.orWhere(pokemon => {
          pokemon.whereIn(isMad ? 'pokemon_id' : 'raid_pokemon_id', [...raidBosses])
            .andWhere(isMad ? 'start' : 'raid_battle_timestamp', '<=', isMad ? this.knex().fn.now() : ts)
            .andWhere(isMad ? 'end' : 'raid_end_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
            .andWhere(isMad ? 'level' : 'raid_level', '>', 0)
        })
        gym.orWhere(egg => {
          egg.whereIn(isMad ? 'level' : 'raid_level', eggs)
            .andWhere(isMad ? 'end' : 'raid_end_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
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

  static async getAvailableRaidBosses() {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const results = await this.query()
      .select('raid_pokemon_id', 'raid_pokemon_form', 'raid_level')
      .where('raid_end_timestamp', '>', ts)
      .andWhere('raid_level', '>', 0)
      .groupBy('raid_pokemon_id', 'raid_pokemon_form', 'raid_level')
      .orderBy('raid_pokemon_id', 'asc')
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
