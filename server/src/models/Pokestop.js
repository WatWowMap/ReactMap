/* eslint-disable camelcase */
const { Model, raw } = require('objection')
const i18next = require('i18next')
const { pokemon: masterPkmn, items: masterItems, questRewardTypes } = require('../data/masterfile.json')
const fetchQuests = require('../services/functions/fetchQuests')
const dbSelection = require('../services/functions/dbSelection')
const getAreaSql = require('../services/functions/getAreaSql')
const { api: { searchResultsLimit } } = require('../services/config')

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static get idColumn() {
    return dbSelection('pokestop') === 'mad'
      ? 'pokestop_id' : 'id'
  }

  static async getAllPokestops(args, perms, isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const {
      lures: lurePerms, quests: questPerms, invasions: invasionPerms, pokestops: pokestopPerms, areaRestrictions,
    } = perms
    const {
      onlyAllPokestops, onlyLures, onlyQuests, onlyInvasions, onlyArEligible,
    } = args.filters

    const query = this.query()
    if (isMad) {
      query.join('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
        .select([
          'pokestop_id AS id',
          'latitude AS lat',
          'longitude AS lon',
          'active_fort_modifier AS lure_id',
          'name',
          'image AS url',
          'incident_grunt_type AS grunt_type',
          'is_ar_scan_eligible AS ar_scan_eligible',
          'quest_type',
          'quest_stardust AS stardust_amount',
          'quest_pokemon_id',
          'quest_reward_type',
          'quest_item_id',
          'quest_item_amount',
          'quest_target',
          'quest_condition AS quest_conditions',
          'quest_reward AS quest_rewards',
          'quest_pokemon_form_id AS quest_form_id',
          'quest_pokemon_costume_id AS quest_costume_id',
          'quest_task',
          raw('UNIX_TIMESTAMP(last_modified)')
            .as('last_modified_timestamp'),
          raw('UNIX_TIMESTAMP(lure_expiration)')
            .as('lure_expire_timestamp'),
          raw('UNIX_TIMESTAMP(last_updated)')
            .as('updated'),
          raw('UNIX_TIMESTAMP(incident_expiration)')
            .as('incident_expire_timestamp'),
        ])
    }
    query.whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)
    getAreaSql(query, areaRestrictions, isMad, 'pokestops')

    // returns everything if all pokestops are on
    if (onlyAllPokestops && pokestopPerms) {
      const results = await query
      return results.map(result => isMad ? this.parseMadRewards(result) : this.parseRewards(result))
    }

    const stardust = []
    const invasions = []
    const lures = []
    const energy = []
    const pokemon = []
    const items = []
    const candy = []
    // preps arrays for interested objects
    Object.keys(args.filters).forEach(pokestop => {
      switch (pokestop.charAt(0)) {
        default: pokemon.push(pokestop.split('-')[0]); break
        case 'd': stardust.push(pokestop.slice(1).split('-')[0]); break
        case 'i': invasions.push(pokestop.slice(1)); break
        case 'l': lures.push(pokestop.slice(1)); break
        case 'm': energy.push(pokestop.slice(1)); break
        case 'q': items.push(pokestop.slice(1)); break
        case 'c': candy.push(pokestop.slice(1)); break
      }
    })

    // builds the query
    query.andWhere(stops => {
      if (onlyLures && lurePerms) {
        stops.orWhere(lure => {
          lure.whereIn(isMad ? 'active_fort_modifier' : 'lure_id', lures)
            .andWhere(isMad ? 'lure_expiration' : 'lure_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        })
      }
      if (onlyQuests && questPerms) {
        stops.orWhereIn('quest_item_id', items)
          .orWhereIn('quest_pokemon_id', pokemon)
        if (isMad) {
          stops.orWhereIn('quest_stardust', stardust)
        } else {
          stardust.forEach(amount => {
            stops.orWhere(dust => {
              dust.where(raw(`json_extract(json_extract(quest_rewards, "$[*].info.amount"), "$[0]") = ${amount}`))
                .andWhere('quest_reward_type', 3)
            })
          })
        }
        energy.forEach(megaEnergy => {
          const [pokeId, amount] = megaEnergy.split('-')
          stops.orWhere(mega => {
            mega.where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id") = ${pokeId}`))
              .andWhere('quest_reward_type', 12)
              .andWhere(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount") = ${amount}`))
          })
        })
        candy.forEach(poke => {
          stops.orWhere(candies => {
            candies.where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'candy' : 'info'}.pokemon_id") = ${poke}`))
              .andWhere('quest_reward_type', 4)
          })
        })
      }
      if (onlyInvasions && invasionPerms) {
        stops.orWhere(invasion => {
          invasion.whereIn(isMad ? 'incident_grunt_type' : 'grunt_type', invasions)
            .andWhere(isMad ? 'incident_expiration' : 'incident_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        })
      }
      if (onlyArEligible && pokestopPerms) {
        stops.orWhere(ar => {
          ar.where(isMad ? 'is_ar_scan_eligible' : 'ar_scan_eligible', 1)
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
        if (isMad) {
          this.parseMadRewards(pokestop)
        } else {
          this.parseRewards(pokestop)
        }
        if (pokestop.quest_form_id === 0 && pokestop.quest_pokemon_id !== 0) {
          const formId = masterPkmn[pokestop.quest_pokemon_id].default_form_id
          if (formId) pokestop.quest_form_id = formId
        }
        const keyRef = [
          {
            filter: pokestop.quest_pokemon_id ? `${pokestop.quest_pokemon_id}-${pokestop.quest_form_id}` : undefined,
            field: 'quest_pokemon_id',
          },
          {
            filter: pokestop.quest_item_id ? `q${pokestop.quest_item_id}` : undefined,
            field: 'quest_item_id',
          },
          {
            filter: pokestop.mega_amount ? `m${pokestop.mega_pokemon_id}-${pokestop.mega_amount}` : undefined,
            field: 'mega_amount',
          },
          {
            filter: pokestop.incident_expire_timestamp ? `i${pokestop.grunt_type}` : undefined,
            field: 'incident_expire_timestamp',
          },
          {
            filter: pokestop.lure_expire_timestamp ? `l${pokestop.lure_id}` : undefined,
            field: 'lure_expire_timestamp',
          },
          {
            filter: pokestop.stardust_amount ? `d${pokestop.stardust_amount}` : undefined,
            field: 'stardust_amount',
          },
          {
            filter: pokestop.candy_pokemon_id ? `c${pokestop.candy_pokemon_id}` : undefined,
            field: 'candy_pokemon_id',
          },
        ]
        keyRef.forEach(category => {
          if (args.filters[category.filter]
            || (onlyArEligible && pokestop.ar_scan_eligible === 1)) {
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

  static async getAvailableQuests(isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const finalList = []
    const quests = {}
    const stops = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
      .orderBy('quest_item_id')
    if (isMad) {
      quests.stardust = await this.query()
        .select('quest_stardust AS amount')
        .from('trs_quest')
        .where('quest_stardust', '>', 0)
        .groupBy('amount')
        .orderBy('amount')
    } else {
      quests.stardust = await this.query()
        .distinct(raw('json_extract(quest_rewards, "$[0].info.amount")')
          .as('amount'))
        .where('quest_reward_type', 3)
        .orderBy('amount')
    }
    quests.mega = await this.query()
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id")`)
        .as('id'))
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount")`)
        .as('amount'))
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 12)
      .orderBy('id', 'asc')
    quests.candy = await this.query()
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'candy' : 'info'}.pokemon_id")`)
        .as('id'))
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 4)
      .orderBy('id', 'asc')
    if (isMad) {
      quests.pokemon = await this.query()
        .select('quest_pokemon_id', 'quest_pokemon_form_id AS form')
        .from('trs_quest')
        .where('quest_reward_type', 7)
        .groupBy('quest_pokemon_id', 'quest_pokemon_form_id')
        .orderBy('quest_pokemon_id')
    } else {
      quests.pokemon = await this.query()
        .distinct('quest_pokemon_id')
        .select(raw('json_extract(quest_rewards, "$[0].info.form_id")')
          .as('form'))
        .where('quest_reward_type', 7)
        .orderBy('quest_pokemon_id')
    }
    quests.pokemon.forEach(pkmn => {
      if (pkmn.form == 0 && pkmn.quest_pokemon_id != 0) {
        const formId = masterPkmn[pkmn.quest_pokemon_id].default_form_id
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
        case 'stardust': rewards.forEach(reward => finalList.push(`d${reward.amount}`)); break
        case 'candy': rewards.forEach(reward => finalList.push(`c${reward.id}`)); break
      }
    })

    if (finalList.length === 0) {
      return fetchQuests()
    }

    stops.invasions = await this.query()
      .select(isMad ? 'incident_grunt_type AS grunt_type' : 'grunt_type')
      .where(isMad ? 'incident_expiration' : 'incident_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy('grunt_type')
      .orderBy('grunt_type')
    stops.lures = await this.query()
      .select(isMad ? 'active_fort_modifier AS lure_id' : 'lure_id')
      .andWhere(isMad ? 'lure_expiration' : 'lure_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy(isMad ? 'active_fort_modifier' : 'lure_id')
      .orderBy(isMad ? 'active_fort_modifier' : 'lure_id')

    Object.entries(stops).forEach(stopType => {
      const [type, rewards] = stopType
      switch (type) {
        default: rewards.forEach(reward => finalList.push(`i${reward.grunt_type}`)); break
        case 'lures': rewards.forEach(reward => finalList.push(`l${reward.lure_id}`)); break
      }
    })
    return finalList
  }

  static parseRewards = pokestop => {
    if (pokestop.quest_reward_type) {
      const { info } = JSON.parse(pokestop.quest_rewards)[0]
      switch (pokestop.quest_reward_type) {
        default: return pokestop
        case 2: Object.keys(info).forEach(x => (pokestop[`item_${x}`] = info[x])); break
        case 3: Object.keys(info).forEach(x => (pokestop[`stardust_${x}`] = info[x])); break
        case 4: Object.keys(info).forEach(x => (pokestop[`candy_${x}`] = info[x])); break
        case 7: Object.keys(info).forEach(x => (pokestop[`quest_${x}`] = info[x])); break
        case 12: Object.keys(info).forEach(x => (pokestop[`mega_${x}`] = info[x])); break
      }
    }
    return pokestop
  }

  static parseMadRewards = (pokestop) => {
    if (pokestop.quest_reward_type) {
      const { item, candy, mega_resource } = JSON.parse(pokestop.quest_rewards)[0]
      switch (pokestop.quest_reward_type) {
        default: return pokestop
        case 2: Object.keys(item).forEach(x => (pokestop[`item_${x}`] = item[x])); break
        case 4: Object.keys(candy).forEach(x => (pokestop[`candy_${x}`] = candy[x])); break
        case 12: Object.keys(mega_resource).forEach(x => (pokestop[`mega_${x}`] = mega_resource[x])); break
      }
    }
    return pokestop
  }

  static async search(args, perms, isMad, distance) {
    const query = this.query()
      .select([
        'name',
        isMad ? 'pokestop_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'image AS url' : 'url',
        distance,
      ])
      .orWhereRaw(`LOWER(name) LIKE '%${args.search}%'`)
      .limit(searchResultsLimit)
      .orderBy('distance')
    getAreaSql(query, perms.areaRestrictions, isMad, 'pokestops')
    return query
  }

  static async searchQuests(args, perms, isMad, distance) {
    const { search, locale } = args
    const pokemonIds = Object.keys(masterPkmn).filter(pkmn => (
      i18next.t(`poke_${pkmn}`, { lng: locale }).toLowerCase().includes(search)
    ))
    const itemIds = Object.keys(masterItems).filter(item => (
      i18next.t(`item_${item}`, { lng: locale }).toLowerCase().includes(search)
    ))
    const rewardTypes = Object.keys(questRewardTypes).filter(type => (
      i18next.t(`quest_reward_${type}`, { lng: locale }).toLowerCase().includes(search)
    ))

    const query = this.query()
      .select([
        'name',
        isMad ? 'pokestop_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'quest_reward AS quest_rewards' : 'quest_rewards',
        'quest_pokemon_id',
        'quest_item_id',
        'quest_reward_type',
        'quest_reward_type',
        distance,
      ])
      .whereIn('quest_pokemon_id', pokemonIds)
      .orWhereIn('quest_item_id', itemIds)
      .orWhereIn('quest_reward_type', rewardTypes)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (isMad) {
      query.join('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
        .select([
          'quest_stardust AS stardust_amount',
          'quest_pokemon_form_id AS quest_form_id',
        ])
    } else if (pokemonIds.length > 0) {
      pokemonIds.forEach(pkmn => {
        query.orWhere(raw(`json_extract(quest_rewards, "$[0].info.pokemon_id") = ${pkmn}`))
          .whereIn('quest_reward_type', [4, 12])
      })
    }
    getAreaSql(query, perms.areaRestrictions, isMad, 'pokestops')
    const results = await query
    return results.map(result => isMad ? this.parseMadRewards(result) : this.parseRewards(result))
  }
}

module.exports = Pokestop
