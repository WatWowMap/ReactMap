// @ts-check

/* eslint-disable no-continue */
const { Model, raw } = require('objection')
const i18next = require('i18next')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { getUserMidnight } = require('../utils/getClientTime')
const { state } = require('../services/state')

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
Object.keys(questProps).forEach((key) => {
  questPropsAlt[`alternative_${key}`] = true
})
const invasionProps = {
  incident_expire_timestamp: true,
  grunt_type: true,
  display_type: true,
  confirmed: true,
  slot_1_pokemon_id: true,
  slot_1_form: true,
  slot_2_pokemon_id: true,
  slot_2_form: true,
  slot_3_pokemon_id: true,
  slot_3_form: true,
}

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  /**
   *
   * @param {import('objection').QueryBuilder<Pokestop>} query
   * @param {boolean} hasMultiInvasions
   * @param {boolean} multiInvasionMs
   */
  static joinIncident(query, hasMultiInvasions, multiInvasionMs) {
    if (hasMultiInvasions) {
      query
        .leftJoin('incident', 'pokestop.id', 'incident.pokestop_id')
        .select([
          '*',
          'pokestop.updated',
          'pokestop.id AS id',
          'incident.id AS incidentId',
          raw(
            multiInvasionMs
              ? 'FLOOR(incident.updated_ms / 1000) AS incident_updated'
              : 'incident.updated AS incident_updated',
          ),
          raw(
            multiInvasionMs
              ? 'FLOOR(incident.expiration_ms / 1000) AS incident_expire_timestamp'
              : 'incident.expiration AS incident_expire_timestamp',
          ),
          'incident.character AS grunt_type',
        ])
    }
    return query
  }

  static async getAll(
    perms,
    args,
    {
      hasAltQuests,
      hasMultiInvasions,
      multiInvasionMs,
      hasRewardAmount,
      hasPowerUp,
      hasConfirmed,
    },
  ) {
    const {
      filters: {
        onlyLevels = 'all',
        onlyLures,
        onlyQuests,
        onlyInvasions,
        onlyArEligible,
        onlyAllPokestops,
        onlyEventStops,
        onlyConfirmed,
        onlyAreas = [],
        onlyExcludeGrunts,
        onlyExcludeLeaders,
      },
    } = args
    const midnight = getUserMidnight(args)
    const ts = Math.floor(Date.now() / 1000)
    const { queryLimits, stopValidDataLimit } = config.getSafe('api')

    const {
      lures: lurePerms,
      quests: questPerms,
      invasions: invasionPerms,
      pokestops: pokestopPerms,
      eventStops: eventStopPerms,
      areaRestrictions,
    } = perms

    const query = this.query()
    query.where('pokestop.updated', '>', ts - stopValidDataLimit * 86400)

    Pokestop.joinIncident(query, hasMultiInvasions, multiInvasionMs)
    query
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])

    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }

    if (!onlyAllPokestops) {
      // Skips ugly query if all pokestops are selected anyway
      const xp = []
      const stardust = []
      const invasions = []
      const lures = []
      const energy = []
      const pokemon = []
      const items = []
      const candy = []
      const xlCandy = []
      const general = []
      const rocketPokemon = []
      const displayTypes = []
      let hasShowcase = false
      // preps arrays for interested objects
      Object.keys(args.filters).forEach((pokestop) => {
        switch (pokestop.charAt(0)) {
          case 'o':
            break
          case 'f':
          case 'h':
            hasShowcase = true
            break
          case 'd':
            stardust.push(pokestop.slice(1).split('-')[0])
            break
          case 'i':
            invasions.push(pokestop.slice(1))
            break
          case 'l':
            lures.push(pokestop.slice(1))
            break
          case 'm':
            energy.push(pokestop.slice(1))
            break
          case 'p':
            xp.push(pokestop.slice(1))
            break
          case 'q':
            items.push(pokestop.slice(1))
            break
          case 'c':
            candy.push(pokestop.slice(1))
            break
          case 'x':
            xlCandy.push(pokestop.slice(1))
            break
          case 'a':
            rocketPokemon.push(pokestop.slice(1).split('-')[0])
            break
          case 'u':
            general.push(pokestop.slice(1))
            break
          case 'b':
            displayTypes.push(pokestop.slice(1))
            break
          default:
            pokemon.push(pokestop.split('-')[0])
            break
        }
      })
      if (hasShowcase && !displayTypes.includes('9')) displayTypes.push('9')

      // builds the query
      query.andWhere((stops) => {
        if (onlyLures && lurePerms) {
          stops.orWhere((lure) => {
            lure
              .whereIn('lure_id', lures)
              .andWhere('lure_expire_timestamp', '>=', ts)
          })
        }
        if (onlyQuests && questPerms) {
          stops.orWhere((quest) => {
            quest.where((timestamps) => {
              timestamps.where('quest_timestamp', '>=', midnight)
              if (hasAltQuests) {
                timestamps.orWhere(
                  'alternative_quest_timestamp',
                  '>=',
                  midnight,
                )
              }
            })
            quest.andWhere((questTypes) => {
              questTypes
                .orWhereIn('quest_item_id', items)
                .orWhereIn('quest_pokemon_id', pokemon)
              if (hasAltQuests) {
                questTypes
                  .orWhereIn('alternative_quest_item_id', items)
                  .orWhereIn('alternative_quest_pokemon_id', pokemon)
              }
              if (hasRewardAmount) {
                questTypes.orWhere((dust) => {
                  dust
                    .where('quest_reward_type', 3)
                    .whereIn('quest_reward_amount', stardust)
                })
                if (hasAltQuests) {
                  questTypes.orWhere((dust) => {
                    dust
                      .where('alternative_quest_reward_type', 3)
                      .whereIn('alternative_quest_reward_amount', stardust)
                  })
                }
              } else {
                stardust.forEach((amount) => {
                  questTypes.orWhere((dust) => {
                    dust
                      .where('quest_reward_type', 3)
                      .andWhere(
                        raw(
                          `json_extract(quest_rewards, "$[0].info.amount") = ${amount}`,
                        ),
                      )
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altDust) => {
                      altDust
                        .where('alternative_quest_reward_type', 3)
                        .andWhere(
                          raw(
                            `json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`,
                          ),
                        )
                    })
                  }
                })
              }
              if (hasRewardAmount) {
                questTypes.orWhere((exp) => {
                  exp
                    .where('quest_reward_type', 1)
                    .whereIn('quest_reward_amount', xp)
                })
                if (hasAltQuests) {
                  questTypes.orWhere((exp) => {
                    exp
                      .where('alternative_quest_reward_type', 1)
                      .whereIn('alternative_quest_reward_amount', xp)
                  })
                }
              } else {
                xp.forEach((amount) => {
                  questTypes.orWhere((xpReward) => {
                    xpReward
                      .where('quest_reward_type', 1)
                      .andWhere(
                        raw(
                          `json_extract(quest_rewards, "$[0].info.amount") = ${amount}`,
                        ),
                      )
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altXpReward) => {
                      altXpReward
                        .where('alternative_quest_reward_type', 1)
                        .andWhere(
                          raw(
                            `json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`,
                          ),
                        )
                    })
                  }
                })
              }
              energy.forEach((megaEnergy) => {
                const [pokeId, amount] = megaEnergy.split('-')
                if (hasRewardAmount) {
                  questTypes.orWhere((mega) => {
                    mega
                      .where('quest_reward_type', 12)
                      .andWhere('quest_reward_amount', amount)
                      .andWhere('quest_pokemon_id', pokeId)
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altMega) => {
                      altMega
                        .where('alternative_quest_reward_type', 12)
                        .andWhere('alternative_quest_reward_amount', amount)
                        .andWhere('alternative_quest_pokemon_id', pokeId)
                    })
                  }
                } else {
                  questTypes.orWhere((mega) => {
                    mega.where('quest_reward_type', 12)
                    if (hasRewardAmount) {
                      mega
                        .andWhere('quest_reward_amount', amount)
                        .andWhere('quest_pokemon_id', pokeId)
                    } else {
                      mega
                        .andWhere(
                          raw(
                            `json_extract(${'quest_rewards'}, "$[0].${'info'}.pokemon_id") = ${pokeId}`,
                          ),
                        )
                        .andWhere(
                          raw(
                            `json_extract(${'quest_rewards'}, "$[0].${'info'}.amount") = ${amount}`,
                          ),
                        )
                    }
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altMega) => {
                      altMega.where('alternative_quest_reward_type', 12)
                      if (hasRewardAmount) {
                        altMega
                          .andWhere('alternative_quest_reward_amount', amount)
                          .andWhere('alternative_quest_pokemon_id', pokeId)
                      } else {
                        altMega
                          .andWhere(
                            raw(
                              `json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${pokeId}`,
                            ),
                          )
                          .andWhere(
                            raw(
                              `json_extract(alternative_quest_rewards, "$[0].info.amount") = ${amount}`,
                            ),
                          )
                      }
                    })
                  }
                }
              })
              if (hasRewardAmount) {
                questTypes
                  .orWhere('quest_reward_type', 4)
                  .whereIn('quest_pokemon_id', candy)
                if (hasAltQuests) {
                  questTypes
                    .orWhere('alternative_quest_reward_type', 4)
                    .whereIn('alternative_quest_pokemon_id', candy)
                }
              } else {
                candy.forEach((poke) => {
                  questTypes.orWhere((candies) => {
                    candies
                      .where('quest_reward_type', 4)
                      .where(
                        raw(
                          `json_extract(${'quest_rewards'}, "$[0].${'info'}.pokemon_id") = ${poke}`,
                        ),
                      )
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altCandies) => {
                      altCandies
                        .where('alternative_quest_reward_type', 4)
                        .where(
                          raw(
                            `json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`,
                          ),
                        )
                    })
                  }
                })
              }
              if (hasRewardAmount) {
                questTypes
                  .orWhere('quest_reward_type', 9)
                  .whereIn('quest_pokemon_id', xlCandy)
                if (hasAltQuests) {
                  questTypes
                    .orWhere('alternative_quest_reward_type', 9)
                    .whereIn('alternative_quest_pokemon_id', xlCandy)
                }
              } else {
                xlCandy.forEach((poke) => {
                  questTypes.orWhere((xlCandies) => {
                    xlCandies
                      .where('quest_reward_type', 9)
                      .where(
                        raw(
                          `json_extract(${'quest_rewards'}, "$[0].${'info'}.pokemon_id") = ${poke}`,
                        ),
                      )
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altXlCandies) => {
                      altXlCandies
                        .where('alternative_quest_reward_type', 9)
                        .where(
                          raw(
                            `json_extract(alternative_quest_rewards, "$[0].info.pokemon_id") = ${poke}`,
                          ),
                        )
                    })
                  }
                })
              }
              if (general.length) {
                questTypes.orWhere((rewardType) => {
                  rewardType.whereIn('quest_reward_type', general)
                })
                if (hasAltQuests) {
                  questTypes.orWhere((altRewardType) => {
                    altRewardType.whereIn(
                      'alternative_quest_reward_type',
                      general,
                    )
                  })
                }
              }
            })
          })
        }
        if (onlyInvasions && invasionPerms) {
          if (hasMultiInvasions) {
            stops.orWhere((invasion) => {
              invasion.andWhere(
                multiInvasionMs ? 'expiration_ms' : 'expiration',
                '>=',
                ts * (multiInvasionMs ? 1000 : 1),
              )

              if (hasConfirmed && onlyConfirmed) {
                invasion.andWhere('confirmed', onlyConfirmed)
              }
              invasion.andWhere((subQuery) => {
                if (hasConfirmed) {
                  if (rocketPokemon.length) {
                    subQuery
                      .whereIn('slot_1_pokemon_id', rocketPokemon)
                      .orWhereIn('slot_2_pokemon_id', rocketPokemon)
                      .orWhereIn('slot_3_pokemon_id', rocketPokemon)
                      .orWhereIn('character', invasions)
                  } else {
                    subQuery.whereIn('character', invasions)
                  }
                } else {
                  subQuery.whereIn('character', invasions)
                }
              })
              if (onlyExcludeGrunts) {
                invasion.whereNotIn('character', state.event.rocketGruntIDs)
              }

              if (onlyExcludeLeaders) {
                invasion.whereNotIn('character', state.event.rocketLeaderIDs)
              }
            })
          } else {
            stops.orWhere((invasion) => {
              invasion.whereIn('grunt_type', invasions)
              invasion.andWhere('expiration', '>=', ts)

              if (hasConfirmed) {
                invasion.andWhere('confirmed', onlyConfirmed)
              }
            })
          }
        }
        if (onlyArEligible && pokestopPerms) {
          stops.orWhere((ar) => {
            ar.where('ar_scan_eligible', 1)
          })
        }
        if (onlyEventStops && eventStopPerms && displayTypes.length) {
          stops.orWhere((event) => {
            event
              .whereIn('incident.display_type', displayTypes)
              .andWhere('character', 0)
              .where(
                multiInvasionMs ? 'expiration_ms' : 'expiration',
                '>=',
                ts * (multiInvasionMs ? 1000 : 1),
              )
          })
        }
      })
    } else if (onlyLevels !== 'all' && hasPowerUp) {
      query.andWhere('power_up_level', onlyLevels)
    }
    const results = await query

    const normalized = this.mapRDM(results, ts)
    if (normalized.length > queryLimits.pokestops)
      normalized.length = queryLimits.pokestops
    const finalResults = this.secondaryFilter(
      normalized,
      args.filters,
      ts,
      midnight,
      perms,
      hasMultiInvasions,
      hasConfirmed,
    )
    return finalResults
  }

  static fieldAssigner(target, source, fields) {
    fields.forEach((field) => (target[field] = source[field]))
  }

  // filters and removes unwanted data
  static secondaryFilter(
    queryResults,
    filters,
    ts,
    midnight,
    perms,
    hasMultiInvasions,
    hasConfirmed,
  ) {
    const filteredResults = []
    for (let i = 0; i < queryResults.length; i += 1) {
      const pokestop = queryResults[i]
      const filtered = { hasShowcase: pokestop.showcase_expiry > ts }

      this.fieldAssigner(filtered, pokestop, [
        'id',
        'lat',
        'lon',
        'enabled',
        'url',
        'name',
        'last_modified_timestamp',
        'updated',
      ])

      if (perms.pokestops) {
        this.fieldAssigner(filtered, pokestop, [
          'ar_scan_eligible',
          'power_up_points',
          'power_up_level',
          'power_up_end_timestamp',
        ])
      }
      if (
        perms.eventStops &&
        (filters.onlyAllPokestops || filters.onlyEventStops)
      ) {
        const showcaseData =
          typeof pokestop.showcase_rankings === 'string'
            ? JSON.parse(pokestop.showcase_rankings)
            : (pokestop.showcase_rankings ?? {})
        if (!perms.showcaseRankings) {
          showcaseData.contest_entries = []
        }
        filtered.events = pokestop.invasions
          .filter((event) => !event.grunt_type)
          .map((event) => ({
            event_expire_timestamp: event.incident_expire_timestamp,
            showcase_pokemon_id:
              event.display_type === 9 ? pokestop.showcase_pokemon_id : null,
            showcase_pokemon_form_id:
              event.display_type === 9
                ? pokestop.showcase_pokemon_form_id
                : null,
            showcase_pokemon_type_id:
              event.display_type === 9
                ? pokestop.showcase_pokemon_type_id
                : null,
            showcase_rankings: event.display_type === 9 ? showcaseData : null,
            showcase_ranking_standard:
              event.display_type === 9
                ? pokestop.showcase_ranking_standard
                : null,
            display_type: event.display_type,
          }))
          .filter((event) =>
            event.showcase_pokemon_id
              ? filters[
                  `f${event.showcase_pokemon_id}-${
                    event.showcase_pokemon_form_id ?? 0
                  }`
                ]
              : event.showcase_pokemon_type_id
                ? filters[`h${event.showcase_pokemon_type_id}`]
                : filters[`b${event.display_type}`],
          )
      }
      if (
        perms.invasions &&
        (filters.onlyAllPokestops || filters.onlyInvasions)
      ) {
        filtered.invasions = pokestop.invasions.filter((invasion) => {
          const info = state.event.invasions[invasion.grunt_type]
          if (!info) return false
          if (
            info.firstReward &&
            (hasConfirmed && invasion.confirmed
              ? filters[
                  `a${invasion.slot_1_pokemon_id}-${invasion.slot_1_form}`
                ]
              : info.encounters.first.some(
                  (poke) => !!filters[`a${poke.id}-${poke.form}`],
                ))
          )
            return true

          if (
            info.secondReward &&
            (hasConfirmed && invasion.confirmed
              ? filters[
                  `a${invasion.slot_2_pokemon_id}-${invasion.slot_2_form}`
                ]
              : info.encounters.second.some(
                  (poke) => !!filters[`a${poke.id}-${poke.form}`],
                ))
          )
            return true
          if (
            info.thirdReward &&
            (hasConfirmed && invasion.confirmed
              ? filters[
                  `a${invasion.slot_3_pokemon_id}-${invasion.slot_3_form}`
                ]
              : info.encounters.third.some(
                  (poke) => !!filters[`a${poke.id}-${poke.form}`],
                ))
          )
            return true
          return (
            filters[`i${invasion.grunt_type}`] ||
            (filters.onlyAllPokestops &&
              (filters.onlyConfirmed ? invasion.confirmed : true) &&
              invasion.grunt_type)
          )
        })
      }
      if (
        perms.lures &&
        (filters.onlyAllPokestops ||
          (filters.onlyLures &&
            pokestop.lure_expire_timestamp >= ts &&
            filters[`l${pokestop.lure_id}`]))
      ) {
        this.fieldAssigner(filtered, pokestop, [
          'lure_id',
          'lure_expire_timestamp',
        ])
      }

      if (perms.quests && (filters.onlyAllPokestops || filters.onlyQuests)) {
        filtered.quests = []
        pokestop.quests.forEach((quest) => {
          if (
            quest.quest_reward_type &&
            (filters.onlyShowQuestSet === 'both' ||
              (filters.onlyShowQuestSet === 'with_ar' && quest.with_ar) ||
              (filters.onlyShowQuestSet === 'without_ar' && !quest.with_ar))
          ) {
            const newQuest = {}
            this.parseRdmRewards(quest)

            const fields = [
              'quest_type',
              'quest_timestamp',
              'quest_target',
              'quest_conditions',
              'quest_task',
              'quest_reward_type',
              'quest_rewards',
              'with_ar',
              'quest_title',
            ]
            switch (quest.quest_reward_type) {
              case 1:
                newQuest.key = `p${quest.xp_amount}`
                fields.push('xp_amount')
                break
              case 2:
                newQuest.key = `q${quest.quest_item_id}`
                fields.push('quest_item_id', 'item_amount')
                break
              case 3:
                newQuest.key = `d${quest.stardust_amount}`
                fields.push('stardust_amount')
                break
              case 4:
                newQuest.key = `c${quest.candy_pokemon_id}`
                fields.push('candy_pokemon_id', 'candy_amount')
                break
              case 7:
                newQuest.key =
                  quest.quest_form_id === undefined ||
                  quest.quest_form_id === null
                    ? `${quest.quest_pokemon_id}`
                    : `${quest.quest_pokemon_id}-${quest.quest_form_id}`
                fields.push(
                  'quest_pokemon_id',
                  'quest_form_id',
                  'quest_costume_id',
                  'quest_gender_id',
                  'quest_shiny',
                  'quest_shiny_probability',
                )
                break
              case 9:
                newQuest.key = `x${quest.xl_candy_pokemon_id}`
                fields.push('xl_candy_pokemon_id', 'xl_candy_amount')
                break
              case 12:
                newQuest.key = `m${quest.mega_pokemon_id}-${quest.mega_amount}`
                fields.push('mega_pokemon_id', 'mega_amount')
                break
              default:
                newQuest.key = `u${quest.quest_reward_type}`
            }

            if (
              quest.quest_timestamp >= midnight &&
              (filters.onlyAllPokestops ||
                (filters[newQuest.key] &&
                  (filters[newQuest.key].adv && !filters[newQuest.key].all
                    ? filters[newQuest.key].adv.includes(
                        `${quest.quest_title}__${quest.quest_target}`,
                      )
                    : true)) ||
                filters[`u${quest.quest_reward_type}`])
            ) {
              this.fieldAssigner(newQuest, quest, fields)
              filtered.quests.push(newQuest)
            }
          }
        })
      }
      if (
        (pokestop.ar_scan_eligible && filters.onlyArEligible) ||
        filters.onlyAllPokestops ||
        filtered.quests?.length ||
        filtered.invasions?.length ||
        filtered.lure_id ||
        filtered.events?.length
      ) {
        filteredResults.push(filtered)
      }
    }
    return filteredResults
  }

  static mapRDM(queryResults, ts) {
    const filtered = {}
    for (let i = 0; i < queryResults.length; i += 1) {
      const result = queryResults[i]
      if (!result.enabled || result.deleted) continue
      const quest = { with_ar: true }
      const altQuest = { with_ar: false }
      const invasion = {}

      if (filtered[result.id]) {
        Object.keys(invasionProps).forEach(
          (field) => (invasion[field] = result[field]),
        )
      } else {
        filtered[result.id] = { invasions: [], quests: [] }
        Object.keys(result).forEach((field) => {
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
      if (
        typeof invasion.grunt_type === 'number' &&
        invasion.incident_expire_timestamp >= ts
      ) {
        filtered[result.id].invasions.push(invasion)
      }
    }
    return Object.values(filtered)
  }

  /**
   *
   * @param {import("@rm/types").DbContext} param0
   * @returns
   */
  static async getAvailable({
    hasAltQuests,
    hasMultiInvasions,
    multiInvasionMs,
    hasRewardAmount,
    hasConfirmed,
    hasShowcaseData,
    hasShowcaseForm,
    hasShowcaseType,
  }) {
    const ts = Math.floor(Date.now() / 1000)
    const finalList = new Set()
    const conditions = {}
    const queries = {}

    const process = (key, title, target) => {
      if (title) {
        if (key in conditions) {
          conditions[key][`${title}-${target}`] = { title, target }
        } else {
          conditions[key] = { [`${title}-${target}`]: { title, target } }
        }
      }
      finalList.add(key)
    }

    // items
    queries.items = this.query()
      .select('quest_item_id', 'quest_title', 'quest_target')
      .from('pokestop')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id', 'quest_title', 'quest_target')
    if (hasAltQuests) {
      queries.itemsAlt = this.query()
        .select(
          'alternative_quest_item_id AS quest_item_id',
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .where('alternative_quest_reward_type', 2)
        .groupBy(
          'alternative_quest_item_id',
          'alternative_quest_title',
          'alternative_quest_target',
        )
    }
    // items

    // stardust
    queries.stardust = this.query().where('quest_reward_type', 3)
    if (hasRewardAmount) {
      queries.stardust
        .select('quest_reward_amount AS amount', 'quest_title', 'quest_target')
        .where('quest_reward_amount', '>', 0)
        .groupBy('amount', 'quest_title', 'quest_target')
    } else {
      queries.stardust
        .select('quest_title', 'quest_target')
        .distinct(
          raw('json_extract(quest_rewards, "$[0].info.amount")').as('amount'),
        )
    }
    if (hasAltQuests) {
      queries.stardustAlt = this.query().where(
        'alternative_quest_reward_type',
        3,
      )
      if (hasRewardAmount) {
        queries.stardustAlt
          .select(
            'alternative_quest_reward_amount AS amount',
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .where('alternative_quest_reward_amount', '>', 0)
          .groupBy(
            'amount',
            'alternative_quest_title',
            'alternative_quest_target',
          )
      } else {
        queries.stardustAlt
          .select(
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .distinct(
            raw(
              'json_extract(alternative_quest_rewards, "$[0].info.amount")',
            ).as('amount'),
          )
      }
    }

    // stardust

    // xp
    queries.xp = this.query().where('quest_reward_type', 1)
    if (hasRewardAmount) {
      queries.xp
        .select('quest_reward_amount AS amount', 'quest_title', 'quest_target')
        .where('quest_reward_amount', '>', 0)
        .groupBy('amount', 'quest_title', 'quest_target')
    } else {
      queries.xp
        .select('quest_title', 'quest_target')
        .distinct(
          raw('json_extract(quest_rewards, "$[0].info.amount")').as('amount'),
        )
    }
    if (hasAltQuests) {
      queries.xpAlt = this.query().where('alternative_quest_reward_type', 1)
      if (hasRewardAmount) {
        queries.xpAlt
          .select(
            'alternative_quest_reward_amount AS amount',
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .where('alternative_quest_reward_amount', '>', 0)
          .groupBy(
            'amount',
            'alternative_quest_title',
            'alternative_quest_target',
          )
      } else {
        queries.xpAlt
          .select(
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .distinct(
            raw(
              'json_extract(alternative_quest_rewards, "$[0].info.amount")',
            ).as('amount'),
          )
      }
    }

    // xp

    // mega
    queries.mega = this.query().from('pokestop').where('quest_reward_type', 12)
    if (hasRewardAmount) {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct(`${'quest_reward_amount'} AS amount`)
        .distinct('quest_pokemon_id AS id')
    } else {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct(
          raw(
            `json_extract(${'quest_rewards'}, "$[0].${'info'}.pokemon_id")`,
          ).as('id'),
        )
        .distinct(
          raw(`json_extract(${'quest_rewards'}, "$[0].${'info'}.amount")`).as(
            'amount',
          ),
        )
    }
    if (hasAltQuests) {
      queries.megaAlt = this.query().where('alternative_quest_reward_type', 12)
      if (hasRewardAmount) {
        queries.megaAlt
          .select(
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .distinct('alternative_quest_reward_amount AS amount')
          .distinct('alternative_quest_pokemon_id AS id')
      } else {
        queries.megaAlt
          .select(
            'alternative_quest_title AS quest_title',
            'alternative_quest_target AS quest_target',
          )
          .distinct(
            raw(
              'json_extract(alternative_quest_rewards, "$[0].info.pokemon_id")',
            ).as('id'),
          )
          .distinct(
            raw(
              'json_extract(alternative_quest_rewards, "$[0].info.amount")',
            ).as('amount'),
          )
      }
    }
    // mega

    // candy
    queries.candy = this.query()
      .select('quest_title', 'quest_target')
      .distinct('quest_pokemon_id AS id')
      .from('pokestop')
      .where('quest_reward_type', 4)
    if (hasAltQuests) {
      queries.candyAlt = this.query()
        .select(
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .distinct('alternative_quest_pokemon_id AS id')
        .where('alternative_quest_reward_type', 4)
    }
    // candy

    // xl candy
    queries.xlCandy = this.query()
      .select('quest_title', 'quest_target')
      .distinct('quest_pokemon_id AS id')
      .from('pokestop')
      .where('quest_reward_type', 9)
    if (hasAltQuests) {
      queries.xlCandyAlt = this.query()
        .select(
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .distinct('alternative_quest_pokemon_id AS id')
        .where('alternative_quest_reward_type', 9)
    }
    // xl candy

    // pokemon
    queries.pokemon = this.query()
      .distinct('quest_pokemon_id')
      .select(
        raw('json_extract(quest_rewards, "$[0].info.form_id")').as('form'),
        'quest_title',
        'quest_target',
      )
      .where('quest_reward_type', 7)
    if (hasAltQuests) {
      queries.pokemonAlt = this.query()
        .distinct('alternative_quest_pokemon_id AS quest_pokemon_id')
        .select(
          raw(
            'json_extract(alternative_quest_rewards, "$[0].info.form_id")',
          ).as('form'),
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .where('alternative_quest_reward_type', 7)
    }

    // pokemon

    // invasions
    if (hasMultiInvasions) {
      queries.invasions = this.query()
        .leftJoin('incident', 'pokestop.id', 'incident.pokestop_id')
        .select('incident.character AS grunt_type', 'incident.display_type')
        .where(
          multiInvasionMs ? 'expiration_ms' : 'incident.expiration',
          '>=',
          ts * (multiInvasionMs ? 1000 : 1),
        )
        .groupBy('incident.character', 'incident.display_type')
        .orderBy('incident.character', 'incident.display_type')
    } else {
      queries.invasions = this.query()
        .distinct('grunt_type')
        .where('grunt_type', '>', 0)
        .andWhere('incident_expire_timestamp', '>=', ts)
        .orderBy('grunt_type')
    }
    if (hasConfirmed) {
      queries.rocketPokemon = this.query()
        .select([
          'character AS grunt_type',
          'slot_1_pokemon_id',
          'slot_1_form',
          'slot_2_pokemon_id',
          'slot_2_form',
          'slot_3_pokemon_id',
          'slot_3_form',
        ])
        .whereNotNull('slot_1_pokemon_id')
        .whereNotNull('slot_2_pokemon_id')
        .whereNotNull('slot_3_pokemon_id')
        .groupBy([
          'character',
          'slot_1_pokemon_id',
          'slot_1_form',
          'slot_2_pokemon_id',
          'slot_2_form',
          'slot_3_pokemon_id',
          'slot_3_form',
        ])
        .orderBy([
          'slot_1_pokemon_id',
          'slot_2_pokemon_id',
          'slot_3_pokemon_id',
        ])
        .from('incident')
    }
    // invasions

    // lures
    queries.lures = this.query()
      .select('lure_id')
      .andWhere('lure_expire_timestamp', '>=', ts)
      .groupBy('lure_id')
      .orderBy('lure_id')
    // lures

    // showcase
    if (hasShowcaseData) {
      const distinct = ['showcase_pokemon_id']
      if (hasShowcaseForm) distinct.push('showcase_pokemon_form_id')
      if (hasShowcaseType) distinct.push('showcase_pokemon_type_id')
      queries.showcase = this.query()
        .distinct(...distinct)
        .where('showcase_expiry', '>=', ts)
        .orderBy(...distinct)
    }
    // showcase

    const resolved = Object.fromEntries(
      await Promise.all(
        Object.entries(queries).map(async ([key, query]) => [key, await query]),
      ),
    )

    let questTypes = [
      ...new Set([
        ...(await this.query()
          .from('pokestop')
          .distinct('quest_reward_type')
          .whereNotNull('quest_reward_type')
          .then((results) => results.map((x) => x.quest_reward_type))),
        ...(hasAltQuests
          ? await this.query()
              .distinct('alternative_quest_reward_type')
              .whereNotNull('alternative_quest_reward_type')
              .then((results) =>
                results.map((x) => x.alternative_quest_reward_type),
              )
          : []),
      ]),
    ]

    Object.entries(resolved).forEach(([questType, rewards]) => {
      switch (questType) {
        case 'xp':
        case 'xpAlt':
          rewards.forEach((reward) =>
            process(
              `p${reward.amount}`,
              reward.quest_title,
              reward.quest_target,
            ),
          )
          questTypes = questTypes.filter((x) => x !== 1)
          break
        case 'itemsAlt':
        case 'items':
          rewards.forEach((reward) =>
            process(
              `q${reward.quest_item_id}`,
              reward.quest_title,
              reward.quest_target,
            ),
          )
          questTypes = questTypes.filter((x) => x !== 2)
          break
        case 'megaAlt':
        case 'mega':
          rewards.forEach((reward) =>
            process(
              `m${reward.id}-${reward.amount}`,
              reward.quest_title,
              reward.quest_target,
            ),
          )
          questTypes = questTypes.filter((x) => x !== 9)
          break
        case 'stardustAlt':
        case 'stardust':
          rewards.forEach((reward) =>
            process(
              `d${reward.amount}`,
              reward.quest_title,
              reward.quest_target,
            ),
          )
          questTypes = questTypes.filter((x) => x !== 3)
          break
        case 'candyAlt':
        case 'candy':
          rewards.forEach((reward) =>
            process(`c${reward.id}`, reward.quest_title, reward.quest_target),
          )
          questTypes = questTypes.filter((x) => x !== 4)
          break
        case 'xlCandyAlt':
        case 'xlCandy':
          rewards.forEach((reward) =>
            process(`x${reward.id}`, reward.quest_title, reward.quest_target),
          )
          questTypes = questTypes.filter((x) => x !== 12)
          break
        case 'lures':
          rewards.forEach((reward) => finalList.add(`l${reward.lure_id}`))
          break
        case 'invasions':
          rewards.forEach((reward) =>
            reward.grunt_type
              ? finalList.add(`i${reward.grunt_type}`)
              : finalList.add(`b${reward.display_type}`),
          )
          break
        case 'rocketPokemon':
          if (hasConfirmed) {
            rewards.forEach((reward) => {
              const fullGrunt = state.event.invasions[reward.grunt_type]
              if (fullGrunt?.firstReward) {
                finalList.add(
                  `a${reward.slot_1_pokemon_id}-${reward.slot_1_form}`,
                )
              }
              if (fullGrunt?.secondReward) {
                finalList.add(
                  `a${reward.slot_2_pokemon_id}-${reward.slot_2_form}`,
                )
              }
              if (fullGrunt?.thirdReward) {
                finalList.add(
                  `a${reward.slot_3_pokemon_id}-${reward.slot_3_form}`,
                )
              }
            })
          }
          break
        case 'showcase':
          if (hasShowcaseData) {
            rewards.forEach((reward) => {
              if (reward.showcase_pokemon_id) {
                finalList.add(
                  `f${reward.showcase_pokemon_id}-${
                    reward.showcase_pokemon_form_id ?? 0
                  }`,
                )
              } else if (reward.showcase_pokemon_type_id) {
                finalList.add(`h${reward.showcase_pokemon_type_id}`)
              }
            })
          }
          break
        default:
          rewards.forEach((reward) =>
            process(
              reward.form === undefined || reward.form === null
                ? `${reward.quest_pokemon_id}`
                : `${reward.quest_pokemon_id}-${reward.form}`,
              reward.quest_title,
              reward.quest_target,
            ),
          )
          questTypes = questTypes.filter((x) => x !== 7)
          break
      }
    })

    return {
      available: [...finalList, ...questTypes.map((type) => `u${type}`)],
      conditions,
    }
  }

  static parseRdmRewards = (quest) => {
    if (quest.quest_reward_type) {
      const { info } = JSON.parse(quest.quest_rewards)[0]
      switch (quest.quest_reward_type) {
        case 1:
          Object.keys(info).forEach((x) => (quest[`xp_${x}`] = info[x]))
          break
        case 2:
          Object.keys(info).forEach((x) => (quest[`item_${x}`] = info[x]))
          break
        case 3:
          Object.keys(info).forEach((x) => (quest[`stardust_${x}`] = info[x]))
          break
        case 4:
          Object.keys(info).forEach((x) => (quest[`candy_${x}`] = info[x]))
          break
        case 7:
          Object.keys(info).forEach((x) => (quest[`quest_${x}`] = info[x]))
          break
        case 9:
          Object.keys(info).forEach((x) => (quest[`xl_candy_${x}`] = info[x]))
          break
        case 12:
          Object.keys(info).forEach((x) => (quest[`mega_${x}`] = info[x]))
          break
        default:
          break
      }
    }
    return quest
  }

  static async search(perms, args, distance, bbox) {
    const { onlyAreas = [], search = '' } = args
    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .whereILike('name', `%${search}%`)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    return query
  }

  static async searchQuests(perms, args, { hasAltQuests }, distance, bbox) {
    const { search, onlyAreas = [], locale, lat, lon, questLayer } = args
    const searchResultsLimit = config.getSafe('api.searchResultsLimit')
    const midnight = getUserMidnight({ lat, lon })
    const pokemonIds = Object.keys(state.event.masterfile.pokemon).filter(
      (pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(search),
    )
    const itemIds = Object.keys(state.event.masterfile.items).filter((item) =>
      i18next
        .t(`item_${item}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search),
    )
    const rewardTypes = Object.keys(
      state.event.masterfile.questRewardTypes,
    ).filter((rType) =>
      i18next
        .t(`quest_reward_${rType}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search),
    )

    if (!pokemonIds.length && !itemIds.length && !rewardTypes.length) {
      return []
    }
    const queries = []
    if (questLayer !== 'without_ar') {
      const query = this.query()
        .select([
          'id',
          'lat',
          'lon',
          'quest_rewards',
          distance,
          'name',
          'quest_pokemon_id',
          'quest_item_id',
          'quest_reward_type',
          'quest_title',
          'quest_target',
        ])
        .whereBetween('lat', [bbox.minLat, bbox.maxLat])
        .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
        .andWhere('quest_timestamp', '>=', midnight || 0)
        .andWhere((quests) => {
          if (pokemonIds.length === 1) {
            quests.where('quest_pokemon_id', pokemonIds[0])
          } else if (pokemonIds.length > 1) {
            quests.whereIn('quest_pokemon_id', pokemonIds)
          }
          if (itemIds.length === 1) {
            quests.orWhere('quest_item_id', itemIds[0])
          } else if (itemIds.length > 1) {
            quests.orWhereIn('quest_item_id', itemIds)
          }
          if (rewardTypes.length === 1) {
            quests.orWhere('quest_reward_type', rewardTypes[0])
          } else if (rewardTypes.length > 1) {
            quests.orWhereIn('quest_reward_type', rewardTypes)
          }
        })
        .limit(config.getSafe('api.searchResultsLimit'))
        .orderBy('distance')
      if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
        return []
      }
      queries.push(query)
    }
    if (hasAltQuests && questLayer !== 'with_ar') {
      const altQuestQuery = this.query()
        .select([
          'id',
          'lat',
          'lon',
          'name',
          'alternative_quest_rewards',
          'alternative_quest_pokemon_id',
          'alternative_quest_item_id',
          'alternative_quest_reward_type',
          'alternative_quest_title',
          'alternative_quest_target',
          distance,
        ])
        .whereBetween('lat', [bbox.minLat, bbox.maxLat])
        .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
        .andWhere('alternative_quest_timestamp', '>=', midnight || 0)
        .andWhere((quests) => {
          if (pokemonIds.length === 1) {
            quests.where('alternative_quest_pokemon_id', pokemonIds[0])
          } else if (pokemonIds.length > 1) {
            quests.whereIn('alternative_quest_pokemon_id', pokemonIds)
          }
          if (itemIds.length === 1) {
            quests.orWhere('alternative_quest_item_id', itemIds[0])
          } else if (itemIds.length > 1) {
            quests.orWhereIn('alternative_quest_item_id', itemIds)
          }
          if (rewardTypes.length === 1) {
            quests.orWhere('alternative_quest_reward_type', rewardTypes[0])
          } else if (rewardTypes.length > 1) {
            quests.orWhereIn('alternative_quest_reward_type', rewardTypes)
          }
        })
        .limit(searchResultsLimit)
        .orderBy('distance')
      if (!getAreaSql(altQuestQuery, perms.areaRestrictions, onlyAreas)) {
        return []
      }
      queries.push(altQuestQuery)
    }

    const rawResults = await Promise.all(queries)
    const mapped = rawResults.flat().map((result) =>
      result.alternative_quest_target
        ? {
            ...result,
            quest_rewards: result.alternative_quest_rewards,
            quest_reward_type: result.alternative_quest_reward_type,
            quest_pokemon_id: result.alternative_quest_pokemon_id,
            quest_item_id: result.alternative_quest_item_id,
            quest_title: result.alternative_quest_title,
            quest_target: result.alternative_quest_target,
            with_ar: false,
          }
        : { ...result, with_ar: result.with_ar ?? true },
    )
    mapped.sort((a, b) => a.distance - b.distance)
    if (mapped.length > searchResultsLimit) mapped.length = searchResultsLimit

    return mapped.map((result) => this.parseRdmRewards(result)).filter(Boolean)
  }

  static async searchLures(perms, args, distance, bbox) {
    const { search, onlyAreas = [], locale } = args
    const ts = Math.floor(Date.now() / 1000)

    const lureIds = Object.keys(state.event.masterfile.items)
      .filter((item) =>
        state.event.masterfile.items[item].startsWith('Troy Disk'),
      )
      .filter((lure) =>
        i18next
          .t(`lure_${lure}`, { lng: locale })
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(search),
      )
    const query = this.query()
      .select([
        '*',
        'id',
        'lat',
        'lon',
        'lure_id',
        'lure_expire_timestamp',
        distance,
      ])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .andWhere('lure_expire_timestamp', '>=', ts)
      .whereIn('lure_id', lureIds)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    const results = await query
    return results
  }

  static async searchInvasions(
    perms,
    args,
    { hasMultiInvasions, multiInvasionMs, hasConfirmed },
    distance,
    bbox,
  ) {
    const { search, onlyAreas = [], locale } = args
    const ts = Math.floor(Date.now() / 1000)

    const invasions = Object.keys(state.event.invasions).filter((invasion) =>
      i18next
        .t(`grunt_${invasion}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search),
    )
    const validMons = new Set(
      state.event.available.pokestops.filter((a) => a.startsWith('a')),
    )
    const pokemonIds = Object.keys(state.event.masterfile.pokemon)
      .filter(
        (pkmn) =>
          i18next
            .t(`poke_${pkmn}`, { lng: locale })
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(search) &&
          (validMons.has(`a${pkmn}-0`) ||
            Object.keys(state.event.masterfile.pokemon[pkmn].forms || {}).some(
              (form) => validMons.has(`a${pkmn}-${form}`),
            )),
      )
      .map((x) => +x)
    if (!invasions.length && !pokemonIds.length) {
      return []
    }
    const query = this.query()
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    Pokestop.joinIncident(query, hasMultiInvasions, multiInvasionMs)
    query.select(distance)

    query.andWhere('expiration', '>=', ts)

    if (invasions.length) {
      query.whereIn('character', invasions)
    }
    if (hasConfirmed && pokemonIds.length) {
      query.where((subQuery) => {
        subQuery
          .whereIn('slot_1_pokemon_id', pokemonIds)
          .orWhereIn('slot_2_pokemon_id', pokemonIds)
          .orWhereIn('slot_3_pokemon_id', pokemonIds)
      })
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    const results = await query
    return pokemonIds.length
      ? results.filter(({ grunt_type }) =>
          ['first', 'second', 'third'].some(
            (pos) =>
              state.event.invasions[grunt_type]?.[`${pos}Reward`] &&
              state.event.invasions[grunt_type]?.encounters[pos]?.some((pkmn) =>
                pokemonIds.includes(pkmn.id),
              ),
          ),
        )
      : results
  }

  static getOne(id) {
    return this.query().select(['lat', 'lon']).where('id', id).first()
  }

  static async getSubmissions(perms, args, { hasShowcaseData }) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
      .whereBetween('lat', [minLat - 0.025, maxLat + 0.025])
      .andWhereBetween('lon', [minLon - 0.025, maxLon + 0.025])
    query.select(['id', 'lat', 'lon', 'enabled', 'deleted', 'partner_id'])
    if (!onlyIncludeSponsored) {
      query.andWhere((poi) => {
        poi.whereNull('partner_id').orWhere('partner_id', 0)
      })
    }
    if (hasShowcaseData) {
      query.select('showcase_expiry')
    }

    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    const results = await query

    return results.filter((x) => x.enabled && !x.deleted)
  }

  /**
   * returns pokestop context
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<{ hasConfirmedInvasions: boolean }>}
   */
  static async getFilterContext({ hasConfirmed }) {
    if (false || !hasConfirmed) return { hasConfirmedInvasions: false }
    const result = await this.query()
      .from('incident')
      .count('id', { as: 'total' })
      .where('confirmed', 1)
      .first()
    return { hasConfirmedInvasions: result.total > 0 }
  }
}

module.exports = { Pokestop }
