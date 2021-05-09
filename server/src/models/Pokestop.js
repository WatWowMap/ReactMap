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
      onlyPokestops, onlyLures, onlyQuests, onlyInvasions,
    } = args.filters

    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('deleted', false)

    // returns everything if all pokestops are on
    if (onlyPokestops) return query

    const lures = []
    const items = []
    const energy = []
    const pokemon = []
    const invasions = []

    // preps arrays for interested objects
    Object.keys(args.filters).forEach(pokestop => {
      switch (pokestop.charAt(0)) {
        default: break
        case 'p': pokemon.push(pokestop.slice(1).split('-')[0]); break
        case 'l': lures.push(pokestop.slice(1)); break
        case 'i': invasions.push(pokestop.slice(1)); break
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
        stops.orWhere(pokes => {
          pokes.whereIn('quest_pokemon_id', pokemon)
        })
        energy.forEach(poke => {
          stops.orWhere(mega => {
            mega.where(raw(`json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]") = ${poke}`))
              .andWhere('quest_reward_type', 12)
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

        if (pokestop.quest_reward_type == 7) {
          const rewards = JSON.parse(pokestop.quest_rewards)
          const { info } = rewards ? rewards[0] : {}
          Object.keys(info).forEach(x => (pokestop[`quest_${x}`] = info[x]))
        } else if (pokestop.quest_reward_type == 12) {
          const rewards = JSON.parse(pokestop.quest_rewards)
          const { info } = rewards ? rewards[0] : {}
          Object.keys(info).forEach(x => (pokestop[`mega_${x}`] = info[x]))
        }

        const keyRef = [
          {
            filter: `p${pokestop.quest_pokemon_id}-${pokestop.quest_form_id}`,
            field: 'quest_pokemon_id',
          },
          {
            filter: `q${pokestop.quest_item_id}`,
            field: 'quest_item_id',
          },
          {
            filter: `m${pokestop.mega_pokemon_id}`,
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
        ]

        keyRef.forEach(category => {
          if (args.filters[category.filter]) {
            keyRef.forEach(otherCategory => {
              if (category.filter !== otherCategory.filter) {
                if (!args.filters[otherCategory.filter]) {
                  delete pokestop[otherCategory.field]
                }
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
}

module.exports = Pokestop
