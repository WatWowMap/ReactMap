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
const madQuestProps = {
  quest_form_id: true,
  quest_costume_id: true,
  quest_item_amount: true,
  quest_task: true,
  with_ar: true,
  stardust_amount: true,
}

Object.keys(questProps).forEach((key) => {
  questPropsAlt[`alternative_${key}`] = true
  madQuestProps[key] = true
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

const MADE_UP_MAD_INVASIONS = [352]
const MAD_GRUNT_MAP = {
  352: 8,
}

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  /**
   *
   * @param {import('objection').QueryBuilder<Pokestop>} query
   * @param {boolean} hasMultiInvasions
   * @param {boolean} isMad
   * @param {boolean} multiInvasionMs
   */
  static joinIncident(query, hasMultiInvasions, isMad, multiInvasionMs) {
    if (hasMultiInvasions) {
      if (isMad) {
        query
          .leftJoin('pokestop_incident', (join) => {
            join
              .on('pokestop.pokestop_id', '=', 'pokestop_incident.pokestop_id')
              .andOn('incident_expiration', '>=', raw('UTC_TIMESTAMP()'))
          })
          .select([
            'incident_id AS incidentId',
            'pokestop_incident.character_display AS grunt_type',
            'pokestop_incident.incident_display_type AS display_type',
          ])
      } else {
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
    } else if (isMad) {
      query.select('incident_grunt_type AS grunt_type')
    }

    return query
  }

  static async getAll(
    perms,
    args,
    {
      isMad,
      hasAltQuests,
      hasMultiInvasions,
      multiInvasionMs,
      hasRewardAmount,
      hasLayerColumn,
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
    const { queryLimits, stopValidDataLimit, hideOldPokestops } =
      config.getSafe('api')

    const {
      lures: lurePerms,
      quests: questPerms,
      invasions: invasionPerms,
      pokestops: pokestopPerms,
      eventStops: eventStopPerms,
      areaRestrictions,
    } = perms

    const query = this.query()

    if (isMad) {
      query
        .leftJoin('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
        .select([
          '*',
          'pokestop.pokestop_id AS id',
          'latitude AS lat',
          'longitude AS lon',
          'active_fort_modifier AS lure_id',
          'image AS url',
          'is_ar_scan_eligible AS ar_scan_eligible',
          'quest_stardust AS stardust_amount',
          'quest_condition AS quest_conditions',
          'quest_reward AS quest_rewards',
          'quest_pokemon_form_id AS quest_form_id',
          'quest_pokemon_costume_id AS quest_costume_id',
          raw('UNIX_TIMESTAMP(last_modified)').as('last_modified_timestamp'),
          raw('UNIX_TIMESTAMP(lure_expiration)').as('lure_expire_timestamp'),
          raw('UNIX_TIMESTAMP(last_updated)').as('updated'),
          raw('UNIX_TIMESTAMP(incident_expiration)').as(
            'incident_expire_timestamp',
          ),
        ])
      if (hasLayerColumn) {
        query.select('layer AS with_ar')
      }
      if (hideOldPokestops) {
        query.whereRaw(
          `UNIX_TIMESTAMP(last_updated) > ${ts - stopValidDataLimit * 86400}`,
        )
      }
    } else if (hideOldPokestops) {
      query.where('pokestop.updated', '>', ts - stopValidDataLimit * 86400)
    }
    Pokestop.joinIncident(query, hasMultiInvasions, isMad, multiInvasionMs)
    query
      .whereBetween(isMad ? 'latitude' : 'lat', [args.minLat, args.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [args.minLon, args.maxLon])

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
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
              .whereIn(isMad ? 'active_fort_modifier' : 'lure_id', lures)
              .andWhere(
                isMad ? 'lure_expiration' : 'lure_expire_timestamp',
                '>=',
                isMad ? this.knex().fn.now() : ts,
              )
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
                    .whereIn(
                      isMad ? 'quest_stardust' : 'quest_reward_amount',
                      stardust,
                    )
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
                    .whereIn(
                      isMad ? 'quest_stardust' : 'quest_reward_amount',
                      xp,
                    )
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
                      .andWhere(
                        isMad ? 'quest_item_amount' : 'quest_reward_amount',
                        amount,
                      )
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
                            `json_extract(${
                              isMad ? 'quest_reward' : 'quest_rewards'
                            }, "$[0].${
                              isMad ? 'mega_resource' : 'info'
                            }.pokemon_id") = ${pokeId}`,
                          ),
                        )
                        .andWhere(
                          raw(
                            `json_extract(${
                              isMad ? 'quest_reward' : 'quest_rewards'
                            }, "$[0].${
                              isMad ? 'mega_resource' : 'info'
                            }.amount") = ${amount}`,
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
                          `json_extract(${
                            isMad ? 'quest_reward' : 'quest_rewards'
                          }, "$[0].${
                            isMad ? 'candy' : 'info'
                          }.pokemon_id") = ${poke}`,
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
                          `json_extract(${
                            isMad ? 'quest_reward' : 'quest_rewards'
                          }, "$[0].${
                            isMad ? 'xl_candy' : 'info'
                          }.pokemon_id") = ${poke}`,
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
              if (isMad) {
                invasion.whereRaw('incident_expiration > UTC_TIMESTAMP()')
              } else {
                invasion.andWhere(
                  multiInvasionMs ? 'expiration_ms' : 'expiration',
                  '>=',
                  ts * (multiInvasionMs ? 1000 : 1),
                )
              }
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
                      .orWhereIn(
                        isMad ? 'character_display' : 'character',
                        invasions,
                      )
                  } else {
                    subQuery.whereIn(
                      isMad ? 'character_display' : 'character',
                      invasions,
                    )
                  }
                } else {
                  subQuery.whereIn(
                    isMad ? 'character_display' : 'character',
                    invasions,
                  )
                }
              })
              if (onlyExcludeGrunts) {
                invasion.whereNotIn(
                  isMad ? 'character_display' : 'character',
                  state.event.rocketGruntIDs,
                )
              }

              if (onlyExcludeLeaders) {
                invasion.whereNotIn(
                  isMad ? 'character_display' : 'character',
                  state.event.rocketLeaderIDs,
                )
              }
            })
          } else {
            stops.orWhere((invasion) => {
              invasion.whereIn(
                isMad ? 'incident_grunt_type' : 'grunt_type',
                invasions,
              )
              if (isMad) {
                invasion.whereRaw('incident_expiration > UTC_TIMESTAMP()')
                invasion.whereNotIn(
                  'incident_grunt_type',
                  MADE_UP_MAD_INVASIONS,
                )
              } else {
                invasion.andWhere('expiration', '>=', ts)
              }
              if (hasConfirmed) {
                invasion.andWhere('confirmed', onlyConfirmed)
              }
            })
          }
        }
        if (onlyArEligible && pokestopPerms) {
          stops.orWhere((ar) => {
            ar.where(isMad ? 'is_ar_scan_eligible' : 'ar_scan_eligible', 1)
          })
        }
        if (onlyEventStops && eventStopPerms && displayTypes.length) {
          stops.orWhere((event) => {
            if (isMad && !hasMultiInvasions) {
              event
                .where((gruntType) => {
                  gruntType
                    .whereIn('incident_grunt_type', MADE_UP_MAD_INVASIONS)
                    .orWhere('character_display', 0)
                })
                .whereRaw('incident_expiration > UTC_TIMESTAMP()')
            } else {
              event
                .whereIn(
                  isMad ? 'incident_display_type' : 'incident.display_type',
                  displayTypes,
                )
                .andWhere(isMad ? 'character_display' : 'character', 0)
            }
            if (isMad && hasMultiInvasions) {
              event.whereRaw('incident_expiration > UTC_TIMESTAMP()')
            } else {
              event.where(
                multiInvasionMs ? 'expiration_ms' : 'expiration',
                '>=',
                ts * (multiInvasionMs ? 1000 : 1),
              )
            }
          })
        }
      })
    } else if (onlyLevels !== 'all' && hasPowerUp) {
      query.andWhere('power_up_level', onlyLevels)
    }
    const results = await query

    const normalized = isMad
      ? this.mapMAD(results, ts)
      : this.mapRDM(results, ts)

    if (normalized.length > queryLimits.pokestops)
      normalized.length = queryLimits.pokestops
    const finalResults = this.secondaryFilter(
      normalized,
      args.filters,
      isMad,
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
    isMad,
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
          .filter((event) =>
            isMad && !hasMultiInvasions
              ? MADE_UP_MAD_INVASIONS.includes(event.grunt_type) ||
                !event.grunt_type
              : !event.grunt_type,
          )
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
            display_type:
              isMad && !hasMultiInvasions
                ? MAD_GRUNT_MAP[event.grunt_type] || 8
                : event.display_type,
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
              (isMad && !hasMultiInvasions
                ? !MADE_UP_MAD_INVASIONS.includes(invasion.grunt_type)
                : invasion.grunt_type))
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

            if (isMad) {
              this.parseMadRewards(quest)
            } else {
              this.parseRdmRewards(quest)
            }
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
                quest.quest_form_id = quest.quest_form_id ?? 0
                newQuest.key = `${quest.quest_pokemon_id}-${quest.quest_form_id}`
                fields.push(
                  'quest_pokemon_id',
                  'quest_form_id',
                  'quest_costume_id',
                  'quest_gender_id',
                  'quest_shiny',
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

  static mapMAD(queryResults, ts) {
    const filtered = {}

    for (let i = 0; i < queryResults.length; i += 1) {
      const result = queryResults[i]

      if (!result.enabled || result.deleted) continue
      const quest = {}
      const invasion = {}

      if (filtered[result.id]) {
        Object.keys(madQuestProps).forEach(
          (field) => (quest[field] = result[field]),
        )
        Object.keys(invasionProps).forEach(
          (field) => (invasion[field] = result[field]),
        )
      } else {
        filtered[result.id] = { quests: [], invasions: [] }
        Object.keys(result).forEach((field) => {
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
      if (
        typeof invasion.grunt_type === 'number' &&
        invasion.incident_expire_timestamp >= ts &&
        !filtered[result.id].invasions.find(
          (q) => q.grunt_type === invasion.grunt_type,
        )
      ) {
        filtered[result.id].invasions.push(invasion)
      }
      if (
        !filtered[result.id].quests.find((q) => q.with_ar === quest.with_ar)
      ) {
        filtered[result.id].quests.push(quest)
      }
    }

    return Object.values(filtered)
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
    isMad,
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
      .from(isMad ? 'trs_quest' : 'pokestop')
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
    if (isMad) {
      queries.stardust = this.query()
        .select('quest_stardust AS amount', 'quest_title', 'quest_target')
        .from('trs_quest')
        .where('quest_stardust', '>', 0)
        .groupBy('amount', 'quest_title', 'quest_target')
    } else {
      queries.stardust = this.query().where('quest_reward_type', 3)
      if (hasRewardAmount) {
        queries.stardust
          .select(
            'quest_reward_amount AS amount',
            'quest_title',
            'quest_target',
          )
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
    }
    // stardust

    // xp
    if (isMad) {
      queries.xp = this.query()
        .select('quest_stardust AS amount', 'quest_title', 'quest_target')
        .from('trs_quest')
        .where('quest_reward_type', 1)
        .groupBy('quest_stardust', 'quest_title', 'quest_target')
    } else {
      queries.xp = this.query().where('quest_reward_type', 1)
      if (hasRewardAmount) {
        queries.xp
          .select(
            'quest_reward_amount AS amount',
            'quest_title',
            'quest_target',
          )
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
    }
    // xp

    // mega
    queries.mega = this.query()
      .from(isMad ? 'trs_quest' : 'pokestop')
      .where('quest_reward_type', 12)
    if (hasRewardAmount) {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct(
          `${isMad ? 'quest_item_amount' : 'quest_reward_amount'} AS amount`,
        )
        .distinct('quest_pokemon_id AS id')
    } else {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct(
          raw(
            `json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${
              isMad ? 'mega_resource' : 'info'
            }.pokemon_id")`,
          ).as('id'),
        )
        .distinct(
          raw(
            `json_extract(${isMad ? 'quest_reward' : 'quest_rewards'}, "$[0].${
              isMad ? 'mega_resource' : 'info'
            }.amount")`,
          ).as('amount'),
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
      .from(isMad ? 'trs_quest' : 'pokestop')
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
      .from(isMad ? 'trs_quest' : 'pokestop')
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
    if (isMad) {
      queries.pokemon = this.query()
        .select(
          'quest_pokemon_id',
          'quest_pokemon_form_id AS form',
          'quest_title',
          'quest_target',
        )
        .from('trs_quest')
        .where('quest_reward_type', 7)
        .groupBy(
          'quest_pokemon_id',
          'quest_pokemon_form_id',
          'quest_title',
          'quest_target',
        )
    } else {
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
    }
    // pokemon

    // invasions
    if (hasMultiInvasions) {
      if (isMad) {
        queries.invasions = this.query()
          .leftJoin(
            'pokestop_incident',
            'pokestop.pokestop_id',
            'pokestop_incident.pokestop_id',
          )
          .select(
            'pokestop_incident.character_display AS grunt_type',
            'pokestop_incident.incident_display_type as display_type',
          )
          .where('pokestop_incident.incident_display_type', '>', 0)
          .whereRaw('incident_expiration > UTC_TIMESTAMP()')
          .orderBy('pokestop_incident.character_display')
      } else {
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
      }
    } else if (isMad) {
      queries.invasions = this.query()
        .distinct('incident_grunt_type AS grunt_type')
        .where('incident_grunt_type', '>', 0)
        .whereRaw('incident_expiration > UTC_TIMESTAMP()')
        .orderBy('grunt_type')
    } else {
      queries.invasions = this.query()
        .distinct(isMad ? 'incident_grunt_type AS grunt_type' : 'grunt_type')
        .where(isMad ? 'incident_grunt_type' : 'grunt_type', '>', 0)
        .andWhere('incident_expire_timestamp', '>=', ts)
        .orderBy('grunt_type')
    }
    if (isMad && !hasMultiInvasions) {
      queries.invasions.whereNotIn('incident_grunt_type', MADE_UP_MAD_INVASIONS)
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
      .select(isMad ? 'active_fort_modifier AS lure_id' : 'lure_id')
      .andWhere(
        isMad ? 'lure_expiration' : 'lure_expire_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )
      .groupBy(isMad ? 'active_fort_modifier' : 'lure_id')
      .orderBy(isMad ? 'active_fort_modifier' : 'lure_id')
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
          .from(isMad ? 'trs_quest' : 'pokestop')
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
              `${reward.quest_pokemon_id}-${reward.form ?? 0}`,
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

  static parseMadRewards = (quest) => {
    if (quest.quest_reward_type) {
      const { item, exp, candy, xl_candy, mega_resource } = JSON.parse(
        quest.quest_rewards,
      )[0]

      switch (quest.quest_reward_type) {
        case 1:
          quest.xp_amount = exp
          break
        case 2:
          Object.keys(item).forEach((x) => (quest[`item_${x}`] = item[x]))
          break
        case 4:
          Object.keys(candy).forEach((x) => (quest[`candy_${x}`] = candy[x]))
          break
        case 9:
          Object.keys(xl_candy).forEach(
            (x) => (quest[`xl_candy_${x}`] = candy[x]),
          )
          break
        case 12:
          Object.keys(mega_resource).forEach(
            (x) => (quest[`mega_${x}`] = mega_resource[x]),
          )
          break
        default:
          break
      }
    }

    return quest
  }

  static async search(perms, args, { isMad }, distance, bbox) {
    const { onlyAreas = [], search = '' } = args
    const query = this.query()
      .select([
        'name',
        isMad ? 'pokestop_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'image AS url' : 'url',
        distance,
      ])
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .whereILike('name', `%${search}%`)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }

    return query
  }

  static async searchQuests(
    perms,
    args,
    { isMad, hasAltQuests },
    distance,
    bbox,
  ) {
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
          isMad ? 'pokestop_id AS id' : 'id',
          isMad ? 'latitude AS lat' : 'lat',
          isMad ? 'longitude AS lon' : 'lon',
          isMad ? 'quest_reward AS quest_rewards' : 'quest_rewards',
          distance,
          'name',
          'quest_pokemon_id',
          'quest_item_id',
          'quest_reward_type',
          'quest_title',
          'quest_target',
        ])
        .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
        .andWhereBetween(isMad ? 'longitude' : 'lon', [
          bbox.minLon,
          bbox.maxLon,
        ])
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

      if (isMad) {
        query
          .leftJoin('trs_quest', 'pokestop.pokestop_id', 'trs_quest.GUID')
          .select([
            'quest_stardust AS stardust_amount',
            'quest_pokemon_form_id AS quest_form_id',
            'quest_pokemon_costume_id AS quest_costume_id',
          ])
      }
      if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
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

      if (
        !getAreaSql(altQuestQuery, perms.areaRestrictions, onlyAreas, isMad)
      ) {
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

    return mapped
      .map((result) =>
        isMad ? this.parseMadRewards(result) : this.parseRdmRewards(result),
      )
      .filter(Boolean)
  }

  static async searchLures(perms, args, { isMad }, distance, bbox) {
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
        isMad ? 'pokestop_id AS id' : 'id',
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
        isMad ? 'active_fort_modifier AS lure_id' : 'lure_id',
        isMad
          ? 'lure_expiration AS lure_expire_timestamp'
          : 'lure_expire_timestamp',
        distance,
      ])
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .andWhere(
        isMad ? 'lure_expiration' : 'lure_expire_timestamp',
        '>=',
        isMad ? this.knex().fn.now() : ts,
      )
      .whereIn(isMad ? 'active_fort_modifier' : 'lure_id', lureIds)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    const results = await query

    return results
  }

  static async searchInvasions(
    perms,
    args,
    { isMad, hasMultiInvasions, multiInvasionMs, hasConfirmed },
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
      .whereBetween(isMad ? 'latitude' : 'lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween(isMad ? 'longitude' : 'lon', [bbox.minLon, bbox.maxLon])
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    Pokestop.joinIncident(query, hasMultiInvasions, isMad, multiInvasionMs)
    query.select(distance)

    if (isMad) {
      query.whereRaw('incident_expiration > UTC_TIMESTAMP()')
    } else {
      query.andWhere('expiration', '>=', ts)
    }
    if (invasions.length) {
      query.whereIn(isMad ? 'character_display' : 'character', invasions)
    }
    if (hasConfirmed && pokemonIds.length) {
      query.where((subQuery) => {
        subQuery
          .whereIn('slot_1_pokemon_id', pokemonIds)
          .orWhereIn('slot_2_pokemon_id', pokemonIds)
          .orWhereIn('slot_3_pokemon_id', pokemonIds)
      })
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
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

  static getOne(id, { isMad }) {
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'pokestop_id' : 'id', id)
      .first()
  }

  static async getSubmissions(perms, args, { isMad, hasShowcaseData }) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
      .whereBetween(`lat${isMad ? 'itude' : ''}`, [
        minLat - 0.025,
        maxLat + 0.025,
      ])
      .andWhereBetween(`lon${isMad ? 'gitude' : ''}`, [
        minLon - 0.025,
        maxLon + 0.025,
      ])

    if (isMad) {
      query.select([
        'pokestop_id AS id',
        'enabled',
        'latitude AS lat',
        'longitude AS lon',
      ])
    } else {
      query.select(['id', 'lat', 'lon', 'enabled', 'deleted', 'partner_id'])
      if (!onlyIncludeSponsored) {
        query.andWhere((poi) => {
          poi.whereNull('partner_id').orWhere('partner_id', 0)
        })
      }
      if (hasShowcaseData) {
        query.select('showcase_expiry')
      }
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
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
  static async getFilterContext({ isMad, hasConfirmed }) {
    if (isMad || !hasConfirmed) return { hasConfirmedInvasions: false }
    const result = await this.query()
      .from('incident')
      .count('id', { as: 'total' })
      .where('confirmed', 1)
      .first()

    return { hasConfirmedInvasions: result.total > 0 }
  }
}

module.exports = { Pokestop }
