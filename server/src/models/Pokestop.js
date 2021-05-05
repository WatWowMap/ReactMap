/* eslint-disable no-eval */
const { Model, raw } = require('objection')

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static async getAllPokestops(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const {
      lures: lurePerms, quests: questPerms, invasions: invasionPerms,
    } = perms
    const {
      onlyStops, onlyLures, onlyQuests, onlyInvasions,
    } = args.filters

    let query = `this.query()
      .whereBetween('lat', [${args.minLat}, ${args.maxLat}])
      .andWhereBetween('lon', [${args.minLon}, ${args.maxLon}])
      .andWhere('deleted', false)`

    if (onlyStops) return eval(query)

    const lures = []
    const items = []
    const energy = []
    const pokemon = []
    const invasion = []

    Object.keys(args.filters).forEach(pokestop => {
      switch (pokestop.charAt(0)) {
        default: break
        case 'p': pokemon.push(pokestop.slice(1).split('-')[0]); break
        case 'l': lures.push(pokestop.slice(1)); break
        case 'i': invasion.push(pokestop.slice(1)); break
        case 'm': energy.push(pokestop.slice(1)); break
        case 'q': items.push(pokestop.slice(1)); break
      }
    })

    let count = false
    if (onlyLures && lurePerms) {
      query += `
        .${count ? 'or' : 'and'}Where(lures => {
          lures.whereIn('lure_id', [${lures}])
          .andWhere('lure_expire_timestamp', '>=', ${ts})`
      count = true
    }
    if (onlyQuests && questPerms) {
      query += `
        .${count ? 'or' : 'and'}Where(items => {
          items.whereIn('quest_item_id', [${items}])
          ${count ? '})' : ''}`
      count = true
      query += `
        .orWhere(pokemon => {
          pokemon.whereIn('quest_pokemon_id', [${pokemon}])
        })`
      energy.forEach(poke => (
        query += `
          .orWhere(mega => {
            mega.where(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]") = ${poke}'))
              .andWhere('quest_reward_type', 12)
          })`
      ))
    }
    if (onlyInvasions && invasionPerms) {
      query += `
        .${count ? 'or' : 'and'}Where(invasion => {
          invasion.whereIn('grunt_type', [${invasion}])
          ${count ? '})' : ''} `
      count = true
    }
    if ((onlyLures && lurePerms)
      || (onlyQuests && questPerms)
      || (onlyInvasions && invasionPerms)) {
      query += '})'
    }

    return eval(query)
  }

  static async getAvailableQuests() {
    const quests = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
      .orderBy('quest_item_id', 'asc')
    quests.mega = await this.query()
      .distinct(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]")')
        .as('id'))
      .where('quest_reward_type', 12)
      .orderBy('id', 'asc')
    quests.pokemon = await this.query()
      .distinct('quest_pokemon_id')
      .select(raw('json_extract(json_extract(quest_rewards, "$[*].info.form_id"), "$[0]")')
        .as('form'))
      .where('quest_reward_type', 7)
      .orderBy('quest_pokemon_id', 'asc')
    quests.invasions = await this.query()
      .distinct('grunt_type')
      .whereNotNull('grunt_type')
      .orderBy('grunt_type', 'asc')
    return quests
  }

  static async test() {
    return this.query()
      .whereBetween('lat', [42.157983940242204, 42.41622065620649])
      .andWhereBetween('lon', [-71.34457183837893, -70.99635528564454])
      .andWhere('deleted', false)
      .andWhere(items => {
        items.whereIn('quest_item_id', [])
          .orWhere(pokemon => {
            pokemon.whereIn('quest_pokemon_id', [])
          })
          .orWhere(mega => {
            mega.where(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]") = 3'))
              .andWhere('quest_reward_type', 12)
          })
      })
      .orWhere(mega => {
        mega.where(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]") = 15'))
          .andWhere('quest_reward_type', 12)
      })
  }
}

module.exports = Pokestop
