/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
const fetchRaids = require('../services/functions/fetchRaids')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static async getAllGyms(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { gyms, raids } = perms
    const {
      onlyGyms, onlyRaids, onlyExEligible, onlyInBattle, onlyArEligible,
    } = args.filters
    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('deleted', false)

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
          ex.where('ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gyms) {
        gym.orWhere(battle => {
          battle.where('in_battle', 1)
        })
      }
      if (onlyArEligible && gyms) {
        gym.orWhere(ar => {
          ar.where('ar_scan_eligible', 1)
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
                .whereIn('availble_slots', slots[team])
            })
          }
        })
      }
      if (onlyRaids && raids) {
        gym.orWhere(pokemon => {
          pokemon.whereIn('raid_pokemon_id', [...raidBosses])
            .andWhere('raid_battle_timestamp', '<=', ts)
            .andWhere('raid_end_timestamp', '>=', ts)
            .andWhere('raid_level', '>', 0)
        })
        gym.orWhere(egg => {
          egg.whereIn('raid_level', eggs)
            .andWhere('raid_end_timestamp', '>=', ts)
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
        if (gym.raid_pokemon_id === 0
          && args.filters[`e${gym.raid_level}`]) {
          filteredResults.push(gym)
        } else if (args.filters[`${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`]) {
          filteredResults.push(gym)
        } else if (gyms && (onlyGyms || onlyArEligible)) {
          if (args.filters[`t${gym.team_id}-0`]) {
            gym.raid_end_timestamp = null
            gym.raid_spawn_timestamp = null
            gym.raid_battle_timestamp = null
            gym.raid_pokemon_id = null
            gym.raid_level = null
            filteredResults.push(gym)
          }
        }
      }
      return filteredResults
    }

    const results = await query
    return secondaryFilter(results)
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
