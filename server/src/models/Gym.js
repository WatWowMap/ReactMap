/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
const { GenericFilter } = require('./Filters')
// const { pokemon: masterfile } = require('../data/masterfile.json')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static async getAllGyms(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { gyms, raids } = perms
    const {
      onlyGyms, onlyRaids, onlyExEligible, onlyInBattle, onlyExcludeList,
    } = args.filters
    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('deleted', false)

    const raidBosses = []
    const teams = []
    const eggs = []
    const slots = []

    Object.keys(args.filters).forEach(raid => {
      if (!onlyExcludeList.includes(raid)) {
        switch (raid.charAt(0)) {
          default: break
          case 'p': raidBosses.push(raid.slice(1).split('-')[0]); break
          case 'e': eggs.push(raid.slice(1)); break
          case 't': teams.push(raid.slice(1).split('-')[0]); break
          case 'g': slots.push({
            team: raid.slice(1).split('-')[0],
            slots: 6 - raid.slice(1).split('-')[1],
          }); break
        }
      }
    })

    query.andWhere(gym => {
      if (onlyExEligible && gyms) {
        gym.orWhere(ex => {
          ex.where('ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gyms) {
        gym.orWhere(ex => {
          ex.where('in_battle', 1)
        })
      }
      if (onlyGyms && gyms) {
        gym.orWhere(team => {
          team.whereIn('team_id', teams)
        })
        slots.forEach(slot => {
          if (!teams.includes(slot.team)) {
            gym.orWhere(gymSlot => {
              gymSlot.where('team_id', slot.team)
                .andWhere('availble_slots', slot.slots)
            })
          }
        })
      }
      if (onlyRaids && raids) {
        gym.orWhere(pokemon => {
          pokemon.whereIn('raid_pokemon_id', raidBosses)
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
        // come back to this once I implement all raid filters
        // if (gym.raid_pokemon_form === 0 && gym.raid_pokemon_id > 0) {
        //   const formId = masterfile[gym.raid_pokemon_id].default_form_id
        //   if (formId) gym.raid_pokemon_form = formId
        // }
        if (!onlyExcludeList.includes(`t${gym.team_id}-0`)) {
          if (gym.raid_pokemon_id == 0
            && args.filters[`e${gym.raid_level}`]) {
            if (!onlyExcludeList.includes(`e${gym.raid_level}`)) {
              filteredResults.push(gym)
            }
          } else if (args.filters[`p${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`]) {
            if (!onlyExcludeList.includes(`p${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`)) {
              filteredResults.push(gym)
            }
          } else {
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

  static async getAvailableRaidBosses(perms, defaults) {
    if (perms) {
      const ts = Math.floor((new Date()).getTime() / 1000)
      const raids = {}
      const results = await this.query()
        .select('raid_pokemon_id', 'raid_pokemon_form')
        .where('raid_end_timestamp', '>', ts)
        .andWhere('raid_pokemon_id', '>', 0)
        .groupBy('raid_pokemon_id', 'raid_pokemon_form')
        .orderBy('raid_pokemon_id', 'asc')
      results.forEach(pokemon => {
        raids[`p${pokemon.raid_pokemon_id}-${pokemon.raid_pokemon_form}`] = new GenericFilter(defaults)
      })
      return raids
    }
  }
}

module.exports = Gym
