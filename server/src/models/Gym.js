/* eslint-disable no-restricted-syntax */
/* eslint-disable no-eval */
const { Model } = require('objection')
const { GenericFilter } = require('./Filters')
const { pokemon: masterfile } = require('../data/masterfile.json')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static async getAllGyms(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const { gyms, raids } = perms
    const {
      onlyGyms, onlyRaids, onlyExEligible, onlyInBattle,
    } = args.filters
    let query = `this.query()
      .whereBetween('lat', [${args.minLat}, ${args.maxLat}])
      .andWhereBetween('lon', [${args.minLon}, ${args.maxLon}])
      .andWhere('deleted', false)`

    const raidBosses = []
    const teams = []
    const eggs = []
    const slots = []

    Object.keys(args.filters).forEach(raid => {
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
    })
    let count = false
    if (onlyExEligible && gyms) {
      query += `
      .andWhere(ex => {
        ex.where('ex_raid_eligible', 1)`
      count = true
    }
    if (onlyInBattle && gyms) {
      query += `
      .${count ? 'or' : 'and'}Where(ex => {
        ex.where('in_battle', 1)`
      count = true
    }
    if (onlyGyms && gyms) {
      query += `
      .${count ? 'or' : 'and'}Where(teams => {
        teams.whereIn('team_id', [${teams}])`
      slots.forEach(slot => {
        if (!teams.includes(slot.team)) {
          query += `
            .orWhere(slots => {
              slots.where('team_id', ${slot.team})
                .andWhere('availble_slots', ${slot.slots})
            })`
        }
      })
      count = true
    }
    if (onlyRaids && raids) {
      query += `
      .${count ? 'or' : 'and'}Where(pokemon => {
        pokemon.whereIn('raid_pokemon_id', [${[...new Set(raidBosses)]}])
          .andWhere('raid_battle_timestamp', '<=', ${ts})
          .andWhere('raid_end_timestamp', '>=', ${ts})
          .andWhere('raid_level', '>', 0)
        .orWhere(eggs => {
          eggs.whereIn('raid_level', [${eggs}])
            .andWhere('raid_end_timestamp', '>=', ${ts})
            .andWhere('raid_battle_timestamp', '>=', ${ts})
        })
      })`
    }
    if ((onlyExEligible || onlyInBattle || onlyGyms) && gyms) query += '})'

    const secondaryFilter = queryResults => {
      const { length } = queryResults
      const filteredResults = []

      for (let i = 0; i < length; i += 1) {
        const gym = queryResults[i]

        if (gym.raid_pokemon_form === 0 && gym.raid_pokemon_id > 0) {
          const formId = masterfile[gym.raid_pokemon_id].default_form_id
          if (formId) gym.raid_pokemon_form = formId
        }
        if (args.filters[`p${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`]
          || args.filters[`e${gym.raid_level}`]) {
          filteredResults.push(gym)
        } else {
          gym.raid_end_timestamp = null
          gym.raid_spawn_timestamp = null
          gym.raid_battle_timestamp = null
          gym.raid_pokemon_id = null
          gym.raid_level = null
          filteredResults.push(gym)
        }
      }
      return filteredResults
    }

    const results = await eval(query)
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
