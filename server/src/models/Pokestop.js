const { Model, raw } = require('objection')
const i18next = require('i18next')
const { Event } = require('../services/initialization')

const fetchQuests = require('../services/api/fetchQuests')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit, queryLimits, stopValidDataLimit, hideOldPokestops },
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

module.exports = class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static async getAll(perms, args, { isMad, hasAltQuests, hasMultiInvasions, multiInvasionMs, hasRewardAmount }) {
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
      if (hideOldPokestops) {
        query.whereRaw(`UNIX_TIMESTAMP(last_updated) > ${Date.now() / 1000 - (stopValidDataLimit * 86400)}`)
      }
    } else if (hideOldPokestops) {
      query.where('pokestop.updated', '>', Date.now() / 1000 - (stopValidDataLimit * 86400))
    }
    if (hasMultiInvasions) {
      query.leftJoin('incident', 'pokestop.id', 'incident.pokestop_id')
        .select([
          '*',
          'pokestop.updated',
          'pokestop.id AS id',
          'incident.id AS incidentId',
          raw(multiInvasionMs
            ? 'FLOOR(incident.updated_ms / 1000) AS incident_updated'
            : 'incident.updated AS incident_updated'),
          raw(multiInvasionMs
            ? 'FLOOR(incident.expiration_ms / 1000) AS incident_expire_timestamp'
            : 'incident.expiration AS incident_expire_timestamp'),
          'incident.character AS grunt_type',
        ])
    }
    query.whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, isMad)
    }

    // returns everything if all pokestops are on
    if (onlyAllPokestops && pokestopPerms) {
      const results = await query.limit(queryLimits.pokestops)
      const normalized = isMad ? this.mapMAD(results, safeTs) : this.mapRDM(results, safeTs)
      return this.secondaryFilter(normalized, args.filters, isMad, midnight, perms, true)
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
              if (hasAltQuests) {
                questTypes.orWhereIn('alternative_quest_item_id', items)
                  .orWhereIn('alternative_quest_pokemon_id', pokemon)
              }
              if (hasRewardAmount) {
                questTypes.orWhereIn(isMad ? 'quest_stardust' : 'quest_reward_amount', stardust)
                if (hasAltQuests) {
                  questTypes.orWhereIn('alternative_quest_reward_amount', stardust)
                }
              } else {
                stardust.forEach(amount => {
                  questTypes.orWhere(dust => {
                    dust.where('quest_reward_type', 3)
                      .andWhere(raw(`json_extract(quest_rewards, "$[0].info.amount") = ${amount}`))
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere(altDust => {
                      altDust.where('alternative_quest_reward_type', 3)
                        .andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`))
                    })
                  }
                })
              }
              energy.forEach(megaEnergy => {
                const [pokeId, amount] = megaEnergy.split('-')
                if (hasRewardAmount) {
                  questTypes.orWhere(mega => {
                    mega.where('quest_reward_type', 12)
                      .andWhere(isMad ? 'quest_item_amount' : 'quest_reward_amount', amount)
                      .andWhere('quest_pokemon_id', pokeId)
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere(altMega => {
                      altMega.where('alternative_quest_reward_type', 12)
                        .andWhere('alternative_quest_reward_amount', amount)
                        .andWhere('alternative_quest_pokemon_id', pokeId)
                    })
                  }
                } else {
                  questTypes.orWhere(mega => {
                    mega.where('quest_reward_type', 12)
                    if (hasRewardAmount) {
                      mega.andWhere('quest_reward_amount', amount)
                        .andWhere('quest_pokemon_id', pokeId)
                    } else {
                      mega.andWhere(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id") = ${pokeId}`))
                        .andWhere(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount") = ${amount}`))
                    }
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere(altMega => {
                      altMega.where('alternative_quest_reward_type', 12)
                      if (hasRewardAmount) {
                        altMega.andWhere('alternative_quest_reward_amount', amount)
                          .andWhere('alternative_quest_pokemon_id', pokeId)
                      } else {
                        altMega.andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${pokeId}`))
                          .andWhere(raw(`json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`))
                      }
                    })
                  }
                }
              })
              if (hasRewardAmount) {
                questTypes.orWhere('quest_reward_type', 4)
                  .whereIn('quest_pokemon_id', candy)
                if (hasAltQuests) {
                  questTypes.orWhere('alternative_quest_reward_type', 4)
                    .whereIn('alternative_quest_pokemon_id', candy)
                }
              } else {
                candy.forEach(poke => {
                  questTypes.orWhere(candies => {
                    candies.where('quest_reward_type', 4)
                      .where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'candy' : 'info'}.pokemon_id") = ${poke}`))
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere(altCandies => {
                      altCandies.where('alternative_quest_reward_type', 4)
                        .where(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`))
                    })
                  }
                })
              }
              if (hasRewardAmount) {
                questTypes.orWhere('quest_reward_type', 9)
                  .whereIn('quest_pokemon_id', xlCandy)
                if (hasAltQuests) {
                  questTypes.orWhere('alternative_quest_reward_type', 9)
                    .whereIn('alternative_quest_pokemon_id', xlCandy)
                }
              } else {
                xlCandy.forEach(poke => {
                  questTypes.orWhere(xlCandies => {
                    xlCandies.where('quest_reward_type', 9)
                      .where(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'xl_candy' : 'info'}.pokemon_id") = ${poke}`))
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere(altXlCandies => {
                      altXlCandies.where('alternative_quest_reward_type', 9)
                        .where(raw(`json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`))
                    })
                  }
                })
              }
              if (general.length && map.enableQuestRewardTypeFilters) {
                questTypes.orWhere(rewardType => {
                  rewardType.whereIn('quest_reward_type', general)
                })
                if (hasAltQuests) {
                  questTypes.orWhere(altRewardType => {
                    altRewardType.whereIn('alternative_quest_reward_type', general)
                  })
                }
              }
            })
        })
      }
      if (onlyInvasions && invasionPerms) {
        if (hasMultiInvasions) {
          stops.orWhere(invasion => {
            invasion.whereIn('character', invasions)
              .andWhere(multiInvasionMs ? 'expiration_ms' : 'expiration', '>=', safeTs * (multiInvasionMs ? 1000 : 1))
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
    const results = await query.limit(queryLimits.pokestops)
    const normalized = isMad ? this.mapMAD(results, safeTs) : this.mapRDM(results, safeTs)
    return this.secondaryFilter(normalized, args.filters, isMad, midnight, perms)
  }

  static fieldAssigner(target, source, fields) {
    fields.forEach(field => (target[field] = source[field]))
  }

  // filters and removes unwanted data
  static secondaryFilter(queryResults, filters, isMad, midnight, perms, global = false) {
    const filteredResults = []
    for (let i = 0; i < queryResults.length; i += 1) {
      const pokestop = queryResults[i]
      const filtered = {}

      this.fieldAssigner(filtered, pokestop, ['id', 'lat', 'lon', 'enabled', 'url', 'name', 'last_modified_timestamp', 'updated'])

      if (perms.pokestops) {
        this.fieldAssigner(filtered, pokestop, ['ar_scan_eligible', 'power_up_points', 'power_up_level', 'power_up_end_timestamp'])
      }
      if (perms.invasions && (filters.onlyAllPokestops || filters.onlyInvasions)) {
        filtered.invasions = pokestop.invasions.filter(invasion => filters[`i${invasion.grunt_type}`])
      }
      if (perms.lures
        && (filters.onlyAllPokestops
          || (filters.onlyLures && filters[`l${pokestop.lure_id}`]))) {
        this.fieldAssigner(filtered, pokestop, ['lure_id', 'lure_expire_timestamp'])
      }

      if (perms.quests && (filters.onlyAllPokestops || filters.onlyQuests)) {
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
            if (quest.quest_timestamp >= midnight && (filters.onlyAllPokestops || filters[newQuest.key]
              || (filters[`u${quest.quest_reward_type}`] && map.enableQuestRewardTypeFilters))) {
              this.fieldAssigner(newQuest, quest, fields)
              filtered.quests.push(newQuest)
            }
          }
        })
      }
      if ((pokestop.ar_scan_eligible && filters.onlyArEligible)
        || global
        || filtered.quests?.length
        || filtered.invasions?.length
        || filtered.lure_id) {
        filteredResults.push(filtered)
      }
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

  static async getAvailable({ isMad, hasAltQuests, hasMultiInvasions, multiInvasionMs, hasRewardAmount }) {
    const ts = Math.floor((new Date()).getTime() / 1000)
    const finalList = new Set()
    const quests = {}
    const stops = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
    if (hasAltQuests) {
      quests.items = [
        ...quests.items,
        ...await this.query()
          .select('alternative_quest_item_id AS quest_item_id')
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
      const dustQuery = this.query()
        .where('quest_reward_type', 3)
      if (hasRewardAmount) {
        dustQuery
          .select('quest_reward_amount AS amount')
          .where('quest_reward_amount', '>', 0)
          .groupBy('amount')
      } else {
        dustQuery
          .distinct(raw('json_extract(quest_rewards, "$[0].info.amount")')
            .as('amount'))
      }
      quests.stardust = await dustQuery
      if (hasAltQuests) {
        const altDustQuery = this.query()
          .where('alternative_quest_reward_type', 3)
        if (hasRewardAmount) {
          altDustQuery
            .select('alternative_quest_reward_amount AS amount')
            .where('alternative_quest_reward_amount', '>', 0)
            .groupBy('amount')
        } else {
          altDustQuery
            .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.amount")')
              .as('amount'))
        }
        quests.stardust = [
          ...quests.stardust,
          ...await altDustQuery,
        ]
      }
    }
    const megaQuery = this.query()
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 12)
    if (hasRewardAmount) {
      megaQuery
        .distinct(`${isMad ? 'quest_item_amount' : 'quest_reward_amount'} AS amount`)
        .distinct('quest_pokemon_id AS id')
    } else {
      megaQuery
        .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.pokemon_id")`)
          .as('id'))
        .distinct(raw(`json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${isMad ? 'mega_resource' : 'info'}.amount")`)
          .as('amount'))
    }
    quests.mega = await megaQuery
    if (hasAltQuests) {
      const altMegaQuery = this.query()
        .where('alternative_quest_reward_type', 12)
      if (hasRewardAmount) {
        altMegaQuery
          .distinct('alternative_quest_reward_amount AS amount')
          .distinct('alternative_quest_pokemon_id AS id')
      } else {
        altMegaQuery
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.pokemon_id")')
            .as('id'))
          .distinct(raw('json_extract(alternative_quest_rewards, "$[0].info.amount")')
            .as('amount'))
      }
      quests.mega = [
        ...quests.mega,
        ...await altMegaQuery,
      ]
    }
    quests.candy = await this.query()
      .distinct('quest_pokemon_id')
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 4)
    if (hasAltQuests) {
      quests.candy = [
        ...quests.candy,
        ...await this.query()
          .distinct('alternative_quest_pokemon_id AS quest_pokemon_id')
          .where('alternative_quest_reward_type', 4),
      ]
    }
    quests.xlCandy = await this.query()
      .distinct('quest_pokemon_id')
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 9)
    if (hasAltQuests) {
      quests.xlCandy = [
        ...quests.xlCandy,
        ...await this.query()
          .distinct('alternative_quest_pokemon_id AS quest_pokemon_id')
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
      if (hasAltQuests) {
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

    if (hasMultiInvasions) {
      stops.invasions = await this.query()
        .leftJoin('incident', 'pokestop.id', 'incident.pokestop_id')
        .select([
          '*',
          'pokestop.id AS id',
          'incident.id AS incidentId',
          raw(multiInvasionMs
            ? 'FLOOR(incident.expiration_ms / 1000) AS incident_expire_timestamp'
            : 'incident.expiration AS incident_expire_timestamp'),
          'incident.character AS grunt_type',
        ])
        .where(multiInvasionMs ? 'expiration_ms' : 'incident.expiration', '>=', ts * (multiInvasionMs ? 1000 : 1))
        .orderBy('grunt_type')
    } else {
      stops.invasions = await this.query()
        .select(isMad ? 'incident_grunt_type AS grunt_type' : 'grunt_type')
        .where(isMad ? 'incident_expiration' : 'incident_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
        .groupBy('grunt_type')
        .orderBy('grunt_type')
    }
    stops.lures = await this.query()
      .select(isMad ? 'active_fort_modifier AS lure_id' : 'lure_id')
      .andWhere(isMad ? 'lure_expiration' : 'lure_expire_timestamp', '>=', isMad ? this.knex().fn.now() : ts)
      .groupBy(isMad ? 'active_fort_modifier' : 'lure_id')
      .orderBy(isMad ? 'active_fort_modifier' : 'lure_id')

    Object.entries(stops).forEach(stopType => {
      const [sType, rewards] = stopType
      switch (sType) {
        case 'lures': rewards.forEach(reward => finalList.add(`l${reward.lure_id}`)); break
        default: rewards.forEach(reward => finalList.add(`i${reward.grunt_type}`)); break
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

  static async search(perms, args, { isMad }, distance) {
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

  static async searchQuests(perms, args, { isMad, hasAltQuests }, distance) {
    const { search, locale, midnight: clientMidnight } = args
    const midnight = settings.hideOldQuests ? clientMidnight : 0

    const pokemonIds = Object.keys(Event.masterfile.pokemon).filter(pkmn => (
      i18next.t(`poke_${pkmn}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search)
    ))
    const itemIds = Object.keys(Event.masterfile.items).filter(item => (
      i18next.t(`item_${item}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search)
    ))
    const rewardTypes = Object.keys(Event.masterfile.questRewardTypes).filter(rType => (
      i18next.t(`quest_reward_${rType}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search)
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

    if (hasAltQuests) {
      const altQuestQuery = this.query()
        .select(['*', distance])
        .where('deleted', false)
        .andWhere('alternative_quest_timestamp', '>=', midnight || 0)
        .andWhere(quests => {
          quests.whereIn('alternative_quest_pokemon_id', pokemonIds)
            .orWhereIn('alternative_quest_item_id', itemIds)
            .orWhereIn('alternative_quest_reward_type', rewardTypes)
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
        quest_target: result.alternative_quest_target,
        with_ar: true,
      }))
      results.push(...remapped)
      results.sort((a, b) => a.distance - b.distance)
      results.length = searchResultsLimit
    }
    return results.map(result => isMad ? this.parseMadRewards(result) : this.parseRdmRewards(result)).filter(x => x)
  }

  static getOne(id, { isMad }) {
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'pokestop_id' : 'id', id)
      .first()
  }

  static getSubmissions(args, { isMad }) {
    const query = this.query()
      .whereBetween(`lat${isMad ? 'itude' : ''}`, [args.minLat - 0.025, args.maxLat + 0.025])
      .andWhereBetween(`lon${isMad ? 'gitude' : ''}`, [args.minLon - 0.025, args.maxLon + 0.025])
      .andWhere(isMad ? 'enabled' : 'deleted', isMad)
    if (isMad) {
      query.select([
        'pokestop_id AS id',
        'latitude AS lat',
        'longitude AS lon',
      ])
    } else {
      query.select(['id', 'lat', 'lon'])
        .andWhere(poi => {
          poi.whereNull('sponsor_id')
            .orWhere('sponsor_id', 0)
        })
    }
    return query
  }
}
