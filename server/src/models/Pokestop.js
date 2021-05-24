const { Model, raw } = require('objection')
const { pokemon: masterfile } = require('../data/masterfile.json')
const fetchQuests = require('../services/functions/fetchQuests')

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static async getAllPokestops(args, perms) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const {
      lures: lurePerms, quests: questPerms, invasions: invasionPerms, pokestops: pokestopPerms,
    } = perms
    const {
      onlyAllPokestops, onlyLures, onlyQuests, onlyInvasions, onlyExcludeList,
    } = args.filters

    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('deleted', false)

    const parseRewards = pokestop => {
      if (pokestop.quest_reward_type) {
        const { info } = JSON.parse(pokestop.quest_rewards)[0]
        switch (pokestop.quest_reward_type) {
          default: return pokestop
          case 2: Object.keys(info).forEach(x => (pokestop[`item_${x}`] = info[x])); break
          case 3: Object.keys(info).forEach(x => (pokestop[`stardust_${x}`] = info[x])); break
          case 7: Object.keys(info).forEach(x => (pokestop[`quest_${x}`] = info[x])); break
          case 12: Object.keys(info).forEach(x => (pokestop[`mega_${x}`] = info[x])); break
        }
      }
      return pokestop
    }

    // returns everything if all pokestops are on
    if (onlyAllPokestops && pokestopPerms) {
      const results = await query
      return results.map(result => parseRewards(result))
    }

    const stardust = []
    const invasions = []
    const lures = []
    const energy = []
    const pokemon = []
    const items = []
    // preps arrays for interested objects
    Object.keys(args.filters).forEach(pokestop => {
      switch (pokestop.charAt(0)) {
        default: pokemon.push(pokestop.split('-')[0]); break
        case 'd': stardust.push(pokestop.slice(1).split('-')[0]); break
        case 'i': invasions.push(pokestop.slice(1)); break
        case 'l': lures.push(pokestop.slice(1)); break
        case 'm': energy.push(pokestop.slice(1)); break
        case 'q': items.push(pokestop.slice(1)); break
      }
    })

    // builds the query
    query.andWhere(stops => {
      if (onlyLures && lurePerms) {
        stops.orWhere(lure => {
          lure.whereIn('lure_id', lures)
            .andWhere('lure_expire_timestamp', '>=', ts)
        })
      }
      if (onlyQuests && questPerms) {
        stops.orWhere(quest => {
          quest.whereIn('quest_item_id', items)
        })
        stardust.forEach(amount => {
          stops.orWhere(dust => {
            dust.where(raw(`json_extract(json_extract(quest_rewards, "$[*].info.amount"), "$[0]") = ${amount}`))
              .andWhere('quest_reward_type', 3)
          })
        })
        stops.orWhere(pokes => {
          pokes.whereIn('quest_pokemon_id', pokemon)
        })
        energy.forEach(megaEnergy => {
          const [pokeId, amount] = megaEnergy.split('-')
          stops.orWhere(mega => {
            mega.where(raw(`json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]") = ${pokeId}`))
              .andWhere('quest_reward_type', 12)
              .andWhere(raw(`json_extract(json_extract(quest_rewards, "$[*].info.amount"), "$[0]") = ${amount}`))
          })
        })
      }
      if (onlyInvasions && invasionPerms) {
        stops.orWhere(invasion => {
          invasion.whereIn('grunt_type', invasions)
            .andWhere('incident_expire_timestamp', '>=', ts)
        })
      }
    })
    const results = await query

    // filters and removes unwanted data
    const secondaryFilter = queryResults => {
      const { length } = queryResults
      const filteredResults = new Set()
      for (let i = 0; i < length; i += 1) {
        const pokestop = queryResults[i]
        parseRewards(pokestop)
        if (pokestop.quest_form_id === 0) {
          const formId = masterfile[pokestop.quest_pokemon_id].default_form_id
          if (formId) pokestop.quest_form_id = formId
        }
        const keyRef = [
          {
            filter: `${pokestop.quest_pokemon_id}-${pokestop.quest_form_id}`,
            field: 'quest_pokemon_id',
          },
          {
            filter: `q${pokestop.quest_item_id}`,
            field: 'quest_item_id',
          },
          {
            filter: `m${pokestop.mega_pokemon_id}-${pokestop.mega_amount}`,
            field: 'mega_amount',
          },
          {
            filter: `i${pokestop.grunt_type}`,
            field: 'incident_expire_timestamp',
          },
          {
            filter: `l${pokestop.lure_id}`,
            field: 'lure_expire_timestamp',
          },
          {
            filter: `d${pokestop.stardust_amount}`,
            field: 'stardust_amount',
          },
        ]
        keyRef.forEach(category => {
          if (args.filters[category.filter]) {
            pokestop.key = category.filter
            keyRef.forEach(otherCategory => {
              if (category.filter !== otherCategory.filter) {
                if (!args.filters[otherCategory.filter]) {
                  delete pokestop[otherCategory.field]
                }
              } else if (onlyExcludeList.includes(category.filter)) {
                delete pokestop[category.field]
              }
            })
            filteredResults.add(pokestop)
          }
        })
      }

      return filteredResults
    }
    return secondaryFilter(results)
  }

  static async getAvailableQuests() {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const finalList = []
    const quests = {}
    const stops = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
      .orderBy('quest_item_id', 'asc')
    quests.stardust = await this.query()
      .distinct(raw('json_extract(json_extract(quest_rewards, "$[*].info.amount"), "$[0]")')
        .as('amount'))
      .where('quest_reward_type', 3)
      .groupBy('amount')
      .orderBy('amount', 'asc')
    quests.mega = await this.query()
      .distinct(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]")')
        .as('id'))
      .distinct(raw('json_extract(json_extract(quest_rewards, "$[*].info.amount"), "$[0]")')
        .as('amount'))
      .where('quest_reward_type', 12)
      .orderBy('id', 'asc')
    quests.pokemon = await this.query()
      .distinct('quest_pokemon_id')
      .select(raw('json_extract(json_extract(quest_rewards, "$[*].info.form_id"), "$[0]")')
        .as('form'))
      .where('quest_reward_type', 7)
      .orderBy('quest_pokemon_id', 'asc')

    quests.pokemon.forEach(pkmn => {
      if (pkmn.form == 0) {
        const formId = masterfile[pkmn.quest_pokemon_id].default_form_id
        if (formId) pkmn.form = formId
      }
    })

    Object.entries(quests).forEach(questType => {
      const [type, rewards] = questType
      switch (type) {
        default: rewards.forEach(reward => finalList.push(`${reward.quest_pokemon_id}-${reward.form}`)); break
        case 'items': rewards.forEach(reward => finalList.push(`q${reward.quest_item_id}`)); break
        case 'mega': rewards.forEach(reward => finalList.push(`m${reward.id}-${reward.amount}`)); break
        case 'invasions': rewards.forEach(reward => finalList.push(`i${reward.grunt_type}`)); break
      }
    })

    if (finalList.length === 0) {
      return fetchQuests()
    }

    stops.invasions = await this.query()
      .distinct('grunt_type')
      .whereNotNull('grunt_type')
      .orderBy('grunt_type', 'asc')
    stops.lures = await this.query()
      .select('lure_id')
      .whereNotNull('lure_id')
      .andWhere('lure_expire_timestamp', '>=', ts)
      .groupBy('lure_id')
      .orderBy('lure_id')

    Object.entries(stops).forEach(stopType => {
      const [type, rewards] = stopType
      switch (type) {
        default: rewards.forEach(reward => finalList.push(`i${reward.grunt_type}`)); break
        case 'lures': rewards.forEach(reward => finalList.push(`l${reward.lure_id}`)); break
      }
    })

    return finalList
  }
}

module.exports = Pokestop
