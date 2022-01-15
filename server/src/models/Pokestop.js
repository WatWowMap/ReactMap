/* eslint-disable camelcase */
const { Model, raw } = require('objection')
const i18next = require('i18next')
const { pokemon: masterPkmn, items: masterItems, questRewardTypes } = require('../data/masterfile.json')
const fetchQuests = require('../services/api/fetchQuests')
const dbSelection = require('../services/functions/dbSelection')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit },
  database: { settings },
  map,
} = require('../services/config')

const questProps = {
  quest_type: true,
  quest_timestamp: true,
  quest_target: true,
  quest_conditions: true,
  quest_rewards: true,
  quest_template: true,
  quest_reward_type: true,
  quest_item_id: true,
  quest_pokemon_id: true,
  quest_title: true,
}
const questPropsAlt = {}
const madQuestProps = {
  quest_form_id: true,
  quest_costume_id: true,
  quest_item_amount: true,
  quest_task: true,
  with_ar: true,
  stardust_amount: true,
}
Object.keys(questProps).forEach(key => {
  questPropsAlt[`alternative_${key}`] = true
  madQuestProps[key] = true
})
const invasionProps = {
  incident_expire_timestamp: true,
  grunt_type: true,
}
const { type, hasAltQuests } = dbSelection('pokestop')
const altQuestCheck = hasAltQuests && type !== 'mad'

module.exports = class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static get idColumn() {
    return dbSelection('pokestop') === 'mad'
      ? 'pokestop_id' : 'id'
  }

  static async getAllPokestops(args, perms, isMad) {
    const { filters: {
      onlyLures, onlyQuests, onlyInvasions, onlyArEligible, onlyAllPokestops,
    }, ts, midnight: clientMidnight } = args
    const midnight = settings.hideOldQuests
      ? clientMidnight || 0
      : 0
    const safeTs = ts || Math.floor((new Date()).getTime() / 1000)

    const {
      lures: lurePerms, quests: questPerms, invasions: invasionPerms, pokestops: pokestopPerms, areaRestrictions,
    } = perms

    const query = this.query()
    if (isMad) {
      query.leftJoin('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
        .select([
          '*',
          'pokestop_id AS id',
          'latitude AS lat',
          'longitude AS lon',
          'active_fort_modifier AS lure_id',
          'image AS url',
          'incident_grunt_type AS grunt_type',
          'is_ar_scan_eligible AS ar_scan_eligible',
          'quest_stardust AS stardust_amount',
          'quest_condition AS quest_conditions',
          'quest_reward AS quest_rewards',
          'quest_pokemon_form_id AS quest_form_id',
          'quest_pokemon_costume_id AS quest_costume_id',
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
    if (type === 'chuck') {
      query.join('incident', 'pokestop.id', 'incident.pokestop_id')
        .select([
          '*',
          'pokestop.id AS id',
          'incident.id AS incidentId',
          raw('FLOOR(incident.expiration_ms / 1000) AS incident_expire_timestamp'),
          'incident.character AS grunt_type',
        ])
    }
    query.whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)
    if (areaRestrictions?.length > 0) {
      getAreaSql(query, areaRestrictions, isMad)
    }

    // returns everything if all pokestops are on
    if (onlyAllPokestops && pokestopPerms) {
      const results = await query
      const normalized = isMad ? this.mapMAD(results, safeTs) : this.mapRDM(results, safeTs)
      return this.secondaryFilter(normalized, args.filters, isMad, midnight)
    }

    const stardust = []
    const invasions = []
    const lures = []
    const energy = []
    const pokemon = []
    const items = []
    const candy = []
    const xlCandy = []
    const general = []
    // preps arrays for interested objects
    Object.keys(args.filters).forEach(pokestop => {
      switch (pokestop.charAt(0)) {
        case 'o': break
        case 'd': stardust.push(pokestop.slice(1).split('-')[0]); break
        case 'i': invasions.push(pokestop.slice(1)); break
        case 'l': lures.push(pokestop.slice(1)); break
        case 'm': energy.push(pokestop.slice(1)); break
        case 'q': items.push(pokestop.slice(1)); break
        case 'c': candy.push(pokestop.slice(1)); break
        case 'x': xlCandy.push(pokestop.slice(1)); break
        case 'u': general.push(pokestop.slice(1)); break
        default: pokemon.push(pokestop.split('-')[0]); break
      }
    })

    // builds the query
    query.andWhere(stops => {
      if (onlyLures && lurePerms) {
        stops.orWhere(lure => {
          lure.whereIn(isMad ? 'active_fort_modifier' : 'lure_id', lures)
            .andWhere(isMad ? 'lure_expiration' : 'lure_expire_timestamp', '>=', isMad ? this.knex().fn.now() : safeTs)
        })
      }
      if (onlyQuests && questPerms) {
        stops.orWhere(quest => {
          quest.where('quest_timestamp', '>=', midnight)
            .andWhere(questTypes => {
              questTypes.orWhereIn('quest_item_id', items)
                .orWhereIn('quest_pokemon_id', pokemon)
              if (altQuestCheck) {
                questTypes.orWhereIn('alternative_quest_item_id', items)
                  .orWhereIn('alternative_quest_pokemon_id', pokemon)
              }
              if (isMad) {
                questTypes.orWhereIn('quest_stardust', stardust)
              } else {
                stardust.forEach(amount => {
                  questTypes.orWhere(dust => {
                    dust.where('quest_reward_type', 3)
                      .andWhere(raw(`json_extract(quest_rewards, "$[0].info.amount") = ${amount}`))
                  })
                  if (altQuestCheck) {
                    questTypes.orWhere(altDust => {
                      altDust.where('alternative_quest_reward_type', 3)
                        .andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`))
                    })
                  }
                })
              }
              energy.forEach(megaEnergy => {
                const [pokeId, amount] = megaEnergy.split('-')
                questTypes.orWhere(mega => {
                  mega.where('quest_reward_type', 12)
                    .andWhere(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id") = ${pokeId}`))
                    .andWhere(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount") = ${amount}`))
                })
                if (altQuestCheck) {
                  questTypes.orWhere(altMega => {
                    altMega.where('alternative_quest_reward_type', 12)
                      .andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${pokeId}`))
                      .andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`))
                  })
                }
              })
              candy.forEach(poke => {
                questTypes.orWhere(candies => {
                  candies.where('quest_reward_type', 4)
                    .where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'candy' : 'info'}.pokemon_id") = ${poke}`))
                })
                if (altQuestCheck) {
                  questTypes.orWhere(altCandies => {
                    altCandies.where('alternative_quest_reward_type', 4)
                      .where(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`))
                  })
                }
              })
              xlCandy.forEach(poke => {
                questTypes.orWhere(xlCandies => {
                  xlCandies.where('quest_reward_type', 9)
                    .where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'xl_candy' : 'info'}.pokemon_id") = ${poke}`))
                })
                if (altQuestCheck) {
                  questTypes.orWhere(altXlCandies => {
                    altXlCandies.where('alternative_quest_reward_type', 9)
                      .where(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`))
                  })
                }
              })
              if (general.length && map.enableQuestRewardTypeFilters) {
                questTypes.orWhere(rewardType => {
                  rewardType.whereIn('quest_reward_type', general)
                })
                if (altQuestCheck) {
                  questTypes.orWhere(altRewardType => {
                    altRewardType.whereIn('alternative_quest_reward_type', general)
                  })
                }
              }
            })
        })
      }
      if (onlyInvasions && invasionPerms) {
        if (type === 'chuck') {
          stops.orWhere(invasion => {
            invasion.whereIn('character', invasions)
              .andWhere('expiration_ms', '>=', safeTs * 1000)
          })
        } else {
          stops.orWhere(invasion => {
            invasion.whereIn(isMad ? 'incident_grunt_type' : 'grunt_type', invasions)
              .andWhere(isMad ? 'incident_expiration' : 'incident_expire_timestamp', '>=', isMad ? this.knex().fn.now() : safeTs)
          })
        }
      }
      if (onlyArEligible && pokestopPerms) {
        stops.orWhere(ar => {
          ar.where(isMad ? 'is_ar_scan_eligible' : 'ar_scan_eligible', 1)
        })
      }
    })
    const results = await query
    const normalized = isMad ? this.mapMAD(results, safeTs) : this.mapRDM(results, safeTs)
    return this.secondaryFilter(normalized, args.filters, isMad, midnight)
  }

  static fieldAssigner(target, source, fields) {
    fields.forEach(field => (target[field] = source[field]))
  }

  // filters and removes unwanted data
  static secondaryFilter(queryResults, filters, isMad, midnight) {
    const filteredResults = []
    for (let i = 0; i < queryResults.length; i += 1) {
      const pokestop = queryResults[i]
      const filtered = {}
      const global = filters.onlyAllPokestops || (pokestop.ar_scan_eligible && filters.onlyArEligible)

      this.fieldAssigner(filtered, pokestop, ['id', 'lat', 'lon', 'enabled', 'ar_scan_eligible', 'url', 'name', 'last_modified_timestamp', 'updated'])

      if (global || filters.onlyInvasions) {
        filtered.invasions = pokestop.invasions.filter(invasion => filters[`i${invasion.grunt_type}`])
      }
      if (global || (filters.onlyLures && filters[`l${pokestop.lure_id}`])) {
        this.fieldAssigner(filtered, pokestop, ['lure_id', 'lure_expire_timestamp'])
      }

      if (global || filters.onlyQuests) {
        filtered.quests = []
        pokestop.quests.forEach(quest => {
          if (quest.quest_reward_type && (
            !map.enableQuestSetSelector
            || filters.onlyShowQuestSet === 'both'
            || (filters.onlyShowQuestSet === 'with_ar' && quest.with_ar)
            || (filters.onlyShowQuestSet === 'without_ar' && !quest.with_ar)
          )) {
            const newQuest = {}
            if (isMad) {
              this.parseMadRewards(quest)
            } else {
              this.parseRdmRewards(quest)
            }
            const fields = ['quest_type', 'quest_timestamp', 'quest_target', 'quest_conditions', 'quest_task', 'quest_reward_type', 'quest_rewards', 'with_ar', 'quest_title']
            switch (quest.quest_reward_type) {
              case 2:
                newQuest.key = `q${quest.quest_item_id}`
                fields.push('quest_item_id', 'item_amount'); break
              case 3:
                newQuest.key = `d${quest.stardust_amount}`
                fields.push('stardust_amount'); break
              case 4:
                newQuest.key = `c${quest.candy_pokemon_id}`
                fields.push('candy_pokemon_id', 'candy_amount'); break
              case 7:
                newQuest.key = `${quest.quest_pokemon_id}-${quest.quest_form_id}`
                fields.push('quest_pokemon_id', 'quest_form_id', 'quest_costume_id', 'quest_gender_id', 'quest_shiny'); break
              case 9:
                newQuest.key = `x${quest.xl_candy_pokemon_id}`
                fields.push('xl_candy_pokemon_id', 'xl_candy_amount'); break
              case 12:
                newQuest.key = `m${quest.mega_pokemon_id}-${quest.mega_amount}`
                fields.push('mega_pokemon_id', 'mega_amount'); break
              default:
                newQuest.key = `u${quest.quest_reward_type}`
            }
            if (quest.quest_timestamp >= midnight && (global || filters[newQuest.key]
              || (filters[`u${quest.quest_reward_type}`] && map.enableQuestRewardTypeFilters))) {
              this.fieldAssigner(newQuest, quest, fields)
              filtered.quests.push(newQuest)
            }
          }
        })
      }
      filteredResults.push(filtered)
    }
    return filteredResults
  }

  static mapMAD(queryResults, ts) {
    const filtered = {}
    for (let i = 0; i < queryResults.length; i += 1) {
      const result = queryResults[i]
      const quest = {}
      const invasion = {}

      if (filtered[result.id]) {
        Object.keys(madQuestProps).forEach(field => (quest[field] = result[field]))
      } else {
        filtered[result.id] = { quests: [], invasions: [] }
        Object.keys(result).forEach(field => {
          if (madQuestProps[field]) {
            quest[field] = result[field]
          } else if (invasionProps[field]) {
            invasion[field] = result[field]
          } else {
            filtered[result.id][field] = result[field]
          }
          if (result.with_ar === undefined) {
            quest.with_ar = true
          }
        })
      }
      if (invasion.grunt_type && invasion.incident_expire_timestamp >= ts) {
        filtered[result.id].invasions.push(invasion)
      }
      filtered[result.id].quests.push(quest)
    }
    return Object.values(filtered)
  }

  static mapRDM(queryResults, ts) {
    const filtered = {}
    for (let i = 0; i < queryResults.length; i += 1) {
      const result = queryResults[i]
      const quest = { with_ar: true }
      const altQuest = { with_ar: false }
      const invasion = {}

      if (filtered[result.id]) {
        Object.keys(invasionProps).forEach(field => (
          invasion[field] = result[field]
        ))
      } else {
        filtered[result.id] = { invasions: [], quests: [] }
        Object.keys(result).forEach(field => {
          if (questProps[field]) {
            quest[field] = result[field]
          } else if (questPropsAlt[field]) {
            altQuest[field.substring(12)] = result[field]
          } else if (invasionProps[field]) {
            invasion[field] = result[field]
          } else {
            filtered[result.id][field] = result[field]
          }
        })
      }
      if (quest.quest_reward_type) {
        filtered[result.id].quests.push(quest)
      }
      if (altQuest.quest_reward_type) {
        filtered[result.id].quests.push(altQuest)
      }
      if (invasion.grunt_type && invasion.incident_expire_timestamp >= ts) {
        filtered[result.id].invasions.push(invasion)
      }
    }
    return Object.values(filtered)
  }

  static async getAvailableQuests(isMad) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const finalList = new Set()
    const quests = {}
    const stops = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
    if (altQuestCheck) {
      quests.items = [
        ...quests.items,
        ...await this.query()
          .select('alternative_quest_item_id AS quest_item_id')
          .from('pokestop')
          .where('alternative_quest_reward_type', 2)
          .groupBy('alternative_quest_item_id'),
      ]
    }
    if (isMad) {
      quests.stardust = await this.query()
        .select('quest_stardust AS amount')
        .from('trs_quest')
        .where('quest_stardust', '>', 0)
        .groupBy('amount')
    } else {
      quests.stardust = await this.query()
        .distinct(raw('json_extract(quest_rewards, "$[0].info.amount")')
          .as('amount'))
        .where('quest_reward_type', 3)
      if (altQuestCheck) {
        quests.stardust = [
          ...quests.stardust,
          ...await this.query()
            .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.amount")')
              .as('amount'))
            .where('alternative_quest_reward_type', 3),
        ]
      }
    }
    quests.mega = await this.query()
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id")`)
        .as('id'))
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount")`)
        .as('amount'))
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 12)
    if (altQuestCheck) {
      quests.mega = [
        ...quests.mega,
        ...await this.query()
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.pokemon_id")')
            .as('id'))
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.amount")')
            .as('amount'))
          .from('pokestop')
          .where('alternative_quest_reward_type', 12),
      ]
    }
    quests.candy = await this.query()
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'candy' : 'info'}.pokemon_id")`)
        .as('id'))
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 4)
    if (altQuestCheck) {
      quests.candy = [
        ...quests.candy,
        ...await this.query()
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.pokemon_id")')
            .as('id'))
          .from('pokestop')
          .where('alternative_quest_reward_type', 4),
      ]
    }
    quests.xlCandy = await this.query()
      .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'xl_candy' : 'info'}.pokemon_id")`)
        .as('id'))
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 9)
    if (altQuestCheck) {
      quests.xlCandy = [
        ...quests.xlCandy,
        ...await this.query()
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.pokemon_id")')
            .as('id'))
          .from('pokestop')
          .where('alternative_quest_reward_type', 9),
      ]
    }
    if (isMad) {
      quests.pokemon = await this.query()
        .select('quest_pokemon_id', 'quest_pokemon_form_id AS form')
        .from('trs_quest')
        .where('quest_reward_type', 7)
        .groupBy('quest_pokemon_id', 'quest_pokemon_form_id')
    } else {
      quests.pokemon = await this.query()
        .distinct('quest_pokemon_id')
        .select(raw('json_extract(quest_rewards, "$[0].info.form_id")')
          .as('form'))
        .where('quest_reward_type', 7)
      if (altQuestCheck) {
        quests.pokemon = [
          ...quests.pokemon,
          ...await this.query()
            .distinct('alternative_quest_pokemon_id AS quest_pokemon_id')
            .select(raw('json_extract(alternative_quest_rewards, "$[0].info.form_id")')
              .as('form'))
            .where('alternative_quest_reward_type', 7),
        ]
      }
    }

    Object.entries(quests).forEach(([questType, rewards]) => {
      switch (questType) {
        case 'items': rewards.forEach(reward => finalList.add(`q${reward.quest_item_id}`)); break
        case 'mega': rewards.forEach(reward => finalList.add(`m${reward.id}-${reward.amount}`)); break
        case 'invasions': rewards.forEach(reward => finalList.add(`i${reward.grunt_type}`)); break
        case 'stardust': rewards.forEach(reward => finalList.add(`d${reward.amount}`)); break
        case 'candy': rewards.forEach(reward => finalList.add(`c${reward.id}`)); break
        case 'xlCandy': rewards.forEach(reward => finalList.add(`x${reward.id}`)); break
        default: rewards.forEach(reward => finalList.add(`${reward.quest_pokemon_id}-${reward.form}`)); break
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
      const [sType, rewards] = stopType
      switch (sType) {
        default: rewards.forEach(reward => finalList.add(`i${reward.grunt_type}`)); break
        case 'lures': rewards.forEach(reward => finalList.add(`l${reward.lure_id}`)); break
      }
    })
    return [...finalList]
  }

  static parseRdmRewards = (quest) => {
    if (quest.quest_reward_type) {
      const { info } = JSON.parse(quest.quest_rewards)[0]
      switch (quest.quest_reward_type) {
        case 2: Object.keys(info).forEach(x => (quest[`item_${x}`] = info[x])); break
        case 3: Object.keys(info).forEach(x => (quest[`stardust_${x}`] = info[x])); break
        case 4: Object.keys(info).forEach(x => (quest[`candy_${x}`] = info[x])); break
        case 7: Object.keys(info).forEach(x => (quest[`quest_${x}`] = info[x])); break
        case 9: Object.keys(info).forEach(x => (quest[`xl_candy_${x}`] = info[x])); break
        case 12: Object.keys(info).forEach(x => (quest[`mega_${x}`] = info[x])); break
        default: break
      }
    }
    return quest
  }

  static parseMadRewards = (quest) => {
    if (quest.quest_reward_type) {
      const {
        item, candy, xl_candy, mega_resource,
      } = JSON.parse(quest.quest_rewards)[0]
      switch (quest.quest_reward_type) {
        case 2: Object.keys(item).forEach(x => (quest[`item_${x}`] = item[x])); break
        case 4: Object.keys(candy).forEach(x => (quest[`candy_${x}`] = candy[x])); break
        case 9: Object.keys(xl_candy).forEach(x => (quest[`xl_candy_${x}`] = candy[x])); break
        case 12: Object.keys(mega_resource).forEach(x => (quest[`mega_${x}`] = mega_resource[x])); break
        default: break
      }
    }
    return quest
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
      .where(isMad ? 'enabled' : 'deleted', isMad)
      .whereRaw(`LOWER(name) LIKE '%${args.search}%'`)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (perms.areaRestrictions?.length) {
      getAreaSql(query, perms.areaRestrictions, isMad)
    }
    return query
  }

  static async searchQuests(args, perms, isMad, distance) {
    const { search, locale, midnight: clientMidnight } = args
    const midnight = settings.hideOldQuests ? clientMidnight : 0

    const pokemonIds = Object.keys(masterPkmn).filter(pkmn => (
      i18next.t(`poke_${pkmn}`, { lng: locale }).toLowerCase().includes(search)
    ))
    const itemIds = Object.keys(masterItems).filter(item => (
      i18next.t(`item_${item}`, { lng: locale }).toLowerCase().includes(search)
    ))
    const rewardTypes = Object.keys(questRewardTypes).filter(rType => (
      i18next.t(`quest_reward_${rType}`, { lng: locale }).toLowerCase().includes(search)
    ))

    const query = this.query()
      .select([
        '*',
        isMad ? 'pokestop_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'quest_reward AS quest_rewards' : 'quest_rewards',
        distance,
      ])
      .where(isMad ? 'enabled' : 'deleted', isMad)
      .andWhere('quest_timestamp', '>=', midnight || 0)
      .andWhere(quests => {
        quests.whereIn('quest_pokemon_id', pokemonIds)
          .orWhereIn('quest_item_id', itemIds)
          .orWhereIn('quest_reward_type', rewardTypes)
        if (!isMad) {
          pokemonIds.forEach(pkmn => {
            quests.orWhere(raw(`json_extract(quest_rewards, "$[0].info.pokemon_id") = ${pkmn}`))
              .whereIn('quest_reward_type', [4, 9, 12])
          })
        }
      })
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (isMad) {
      query.leftJoin('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
        .select([
          'quest_stardust AS stardust_amount',
          'quest_pokemon_form_id AS quest_form_id',
          'quest_pokemon_costume_id AS quest_costume_id',
        ])
    }
    if (perms.areaRestrictions?.length) {
      getAreaSql(query, perms.areaRestrictions, isMad)
    }
    const results = await query

    if (altQuestCheck) {
      const altQuestQuery = this.query()
        .select(['*', distance])
        .where('deleted', false)
        .andWhere('alternative_quest_timestamp', '>=', midnight || 0)
        .andWhere(quests => {
          quests.whereIn('alternative_quest_pokemon_id', pokemonIds)
            .orWhereIn('alternative_quest_item_id', itemIds)
            .orWhereIn('alternative_quest_reward_type', rewardTypes)
          pokemonIds.forEach(pkmn => {
            quests.orWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${pkmn}`))
              .whereIn('alternative_quest_reward_type', [4, 9, 12])
          })
        })
        .limit(searchResultsLimit)
        .orderBy('distance')
      const altQuestResults = await altQuestQuery
      const remapped = altQuestResults.map(result => ({
        ...result,
        quest_rewards: result.alternative_quest_rewards,
        quest_reward_type: result.alternative_quest_reward_type,
        quest_pokemon_id: result.alternative_quest_pokemon_id,
        quest_item_id: result.alternative_quest_item_id,
        quest_title: result.alternative_quest_title,
        with_ar: true,
      }))
      results.push(...remapped)
      results.sort((a, b) => a.distance - b.distance)
      results.length = searchResultsLimit
    }
    return results.map(result => isMad ? this.parseMadRewards(result) : this.parseRdmRewards(result)).filter(x => x)
  }
}
