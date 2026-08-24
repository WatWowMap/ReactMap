// @ts-check

/* eslint-disable no-continue */
const { Model, raw } = require('objection')
const i18next = require('i18next')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { getAreaSql, areaRestrictionsDenyAll } = require('../utils/getAreaSql')
const {
  applyManualIdFilter,
  normalizeManualId,
} = require('../utils/manualFilter')
const { getUserMidnight } = require('../utils/getClientTime')
const {
  evalScannerQuery,
  describeScannerResponse,
  fetchFortById,
} = require('../utils/evalScannerQuery')
const { filterRTree } = require('../utils/filterRTree')
const {
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
  getEnabledRocketPokemonSpecies,
  getRocketPokemonFilterKey,
  isRocketPokemonFilterExcluded,
} = require('../utils/rocketPokemonFiltering')
const { mapScanPokestop } = require('./pokestopScanMapper')
const { getCombinedFortAvailable } = require('../utils/fortAvailable')
const { buildPokestopDnfFilters } = require('../filters/fort/pokestop')
const { describeDnfNarrowing } = require('../filters/fort/describeDnfNarrowing')
const { state } = require('../services/state')
const {
  isDualQuestLayerMode,
  resolveQuestLayerSelection,
} = require('../utils/questLayerMode')
const { mapAvailablePokestops } = require('./pokestopAvailableMapper')
const {
  getShowcaseEventFilterKey,
  getShowcaseFocusDisplay,
  getShowcaseFocusFilterKey,
  parseShowcaseFocus,
} = require('../utils/showcaseFocus')

const MEGA_RESOURCE_REWARD_TYPE = 12
const TEMP_EVO_BRANCH_RESOURCE_REWARD_TYPE = 20
const TEMP_EVOLUTION_RESOURCE_REWARD_TYPES = [
  MEGA_RESOURCE_REWARD_TYPE,
  TEMP_EVO_BRANCH_RESOURCE_REWARD_TYPE,
]

/** @typedef {Partial<import('@rm/types').Quest>} QuestReward */

const QUEST_REWARD_FILTER_DEFINITIONS = {
  1: {
    fields: ['xp_amount'],
    getKey: (/** @type {QuestReward} */ quest) => `p${quest.xp_amount}`,
  },
  2: {
    fields: ['quest_item_id', 'item_amount'],
    getKey: (/** @type {QuestReward} */ quest) => `q${quest.quest_item_id}`,
  },
  3: {
    fields: ['stardust_amount'],
    getKey: (/** @type {QuestReward} */ quest) => `d${quest.stardust_amount}`,
  },
  4: {
    fields: ['candy_pokemon_id', 'candy_amount'],
    getKey: (/** @type {QuestReward} */ quest) => `c${quest.candy_pokemon_id}`,
  },
  7: {
    fields: [
      'quest_pokemon_id',
      'quest_form_id',
      'quest_costume_id',
      'quest_gender_id',
      'quest_shiny',
      'quest_shiny_probability',
      'quest_background',
      'quest_bread_mode',
    ],
    getKey: (/** @type {QuestReward} */ quest) =>
      quest.quest_form_id === undefined || quest.quest_form_id === null
        ? `${quest.quest_pokemon_id}`
        : `${quest.quest_pokemon_id}-${quest.quest_form_id}`,
  },
  9: {
    fields: ['xl_candy_pokemon_id', 'xl_candy_amount'],
    getKey: (/** @type {QuestReward} */ quest) =>
      `x${quest.xl_candy_pokemon_id}`,
  },
  [MEGA_RESOURCE_REWARD_TYPE]: {
    fields: ['mega_pokemon_id', 'mega_amount', 'temp_evolution'],
    getKey: (/** @type {QuestReward} */ quest) =>
      `m${quest.mega_pokemon_id}-${quest.mega_amount}`,
  },
  [TEMP_EVO_BRANCH_RESOURCE_REWARD_TYPE]: {
    fields: ['mega_pokemon_id', 'mega_amount', 'temp_evolution'],
    getKey: (/** @type {QuestReward} */ quest) =>
      quest.mega_pokemon_id && quest.mega_amount
        ? `m${quest.mega_pokemon_id}-${quest.mega_amount}`
        : '',
  },
}
const REWARD_TYPES_WITH_DEDICATED_FILTERS = Object.keys(
  QUEST_REWARD_FILTER_DEFINITIONS,
).map(Number)

const ROCKET_REWARD_POSITIONS = [
  {
    name: 'first',
    enabled: 'firstReward',
    pokemonId: 'slot_1_pokemon_id',
    form: 'slot_1_form',
  },
  {
    name: 'second',
    enabled: 'secondReward',
    pokemonId: 'slot_2_pokemon_id',
    form: 'slot_2_form',
  },
  {
    name: 'third',
    enabled: 'thirdReward',
    pokemonId: 'slot_3_pokemon_id',
    form: 'slot_3_form',
  },
]

/**
 * Adds config-derived Rocket encounter fallback keys to
 * `availableSet`, mirroring the SQL `rocketPokemon` case (originally inline
 * here, now shared so the SQL path and the `/api/pokestop/available`
 * endpoint path stay byte-identical). Gated on
 * `map.misc.fallbackRocketPokemonFiltering` (default `true`,
 * `config/default.json`).
 * @param {Set<string>} availableSet
 */
const applyRocketPokemonFallback = (availableSet) => {
  if (!config.getSafe('map.misc.fallbackRocketPokemonFiltering')) return
  // Always include potential rocket Pokemon from state.event.invasions as backup
  Object.entries(state.event.invasions).forEach(([gruntType, invasionInfo]) => {
    if (!invasionInfo) return
    if (isRocketPokemonFilterExcluded(gruntType)) return

    ROCKET_REWARD_POSITIONS.forEach(({ name, enabled }) => {
      if (!invasionInfo[enabled]) return
      invasionInfo.encounters[name]?.forEach((poke) => {
        availableSet.add(getRocketPokemonFilterKey(poke.id, poke.form))
      })
    })
  })
}

/**
 * @param {number|string} gruntType
 * @param {number[]} pokemonIds
 */
const invasionHasMatchingRocketPokemon = (gruntType, pokemonIds) =>
  !isRocketPokemonFilterExcluded(gruntType) &&
  ROCKET_REWARD_POSITIONS.some(
    ({ name, enabled }) =>
      state.event.invasions[gruntType]?.[enabled] &&
      state.event.invasions[gruntType]?.encounters[name]?.some((pokemon) =>
        pokemonIds.includes(pokemon.id),
      ),
  )

/**
 * @param {(number|string)[]} pokemonIds
 * @returns {Record<string, string[]>}
 */
const getMatchingRocketGruntsByPosition = (pokemonIds) => {
  const selected = new Set(pokemonIds.map(Number))
  const matching = Object.fromEntries(
    ROCKET_REWARD_POSITIONS.map(({ name }) => [name, []]),
  )

  Object.entries(state.event.invasions).forEach(([gruntType, info]) => {
    if (!info || isRocketPokemonFilterExcluded(gruntType)) return
    ROCKET_REWARD_POSITIONS.forEach(({ name, enabled }) => {
      if (
        info[enabled] &&
        info.encounters[name]?.some((poke) => selected.has(Number(poke.id)))
      ) {
        matching[name].push(gruntType)
      }
    })
  })
  return matching
}

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
      mem,
      secret,
      httpAuth,
    },
  ) {
    const {
      lures: lurePerms,
      quests: questPerms,
      invasions: invasionPerms,
      pokestops: pokestopPerms,
      eventStops: eventStopPerms,
      areaRestrictions,
    } = perms
    // All-stop and AR-only modes expose ordinary Pokestops, so authorize both
    // at the model boundary before either SQL or Golbat sees the request.
    // Never mutate the shared GraphQL args: DbManager fans them out to sources
    // concurrently.
    const filters = {
      ...(args.filters || {}),
      onlyAllPokestops: Boolean(
        pokestopPerms && args.filters?.onlyAllPokestops,
      ),
      onlyArEligible: Boolean(pokestopPerms && args.filters?.onlyArEligible),
    }
    const {
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
    } = filters
    const midnight = getUserMidnight(args)
    const ts = Math.floor(Date.now() / 1000)
    const { queryLimits, stopValidDataLimit, hideOldPokestops } =
      config.getSafe('api')
    const effectiveOnlyArEligible = isDualQuestLayerMode() && onlyArEligible
    const effectiveQuestLayer = resolveQuestLayerSelection(
      filters.onlyShowQuestSet,
      { hasAltQuests },
    )
    if (
      !onlyAllPokestops &&
      !effectiveOnlyArEligible &&
      !(onlyLures && lurePerms) &&
      !(onlyQuests && questPerms) &&
      !(onlyInvasions && invasionPerms) &&
      !(onlyEventStops && eventStopPerms)
    ) {
      return []
    }
    const dnfFilters = buildPokestopDnfFilters(filters, state.event.invasions)

    const query = Pokestop.query()
    if (hideOldPokestops) {
      query.where('pokestop.updated', '>', ts - stopValidDataLimit * 86400)
    }
    Pokestop.joinIncident(query, hasMultiInvasions, multiInvasionMs)
    applyManualIdFilter(query, {
      manualId: filters.onlyManualId,
      latColumn: 'pokestop.lat',
      lonColumn: 'pokestop.lon',
      idColumn: 'pokestop.id',
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    })

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
      Object.keys(filters).forEach((pokestop) => {
        switch (pokestop.charAt(0)) {
          case 'o':
            break
          case 'f':
          case 'h':
          case 'y':
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
                      .whereIn(
                        'quest_reward_type',
                        TEMP_EVOLUTION_RESOURCE_REWARD_TYPES,
                      )
                      .andWhere('quest_reward_amount', amount)
                      .andWhere('quest_pokemon_id', pokeId)
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altMega) => {
                      altMega
                        .whereIn(
                          'alternative_quest_reward_type',
                          TEMP_EVOLUTION_RESOURCE_REWARD_TYPES,
                        )
                        .andWhere('alternative_quest_reward_amount', amount)
                        .andWhere('alternative_quest_pokemon_id', pokeId)
                    })
                  }
                } else {
                  questTypes.orWhere((mega) => {
                    mega.whereIn(
                      'quest_reward_type',
                      TEMP_EVOLUTION_RESOURCE_REWARD_TYPES,
                    )
                    if (hasRewardAmount) {
                      mega
                        .andWhere('quest_reward_amount', amount)
                        .andWhere('quest_pokemon_id', pokeId)
                    } else {
                      mega
                        .andWhere(
                          raw(
                            `json_extract(quest_rewards, "$[0].info.pokemon_id") = ${pokeId}`,
                          ),
                        )
                        .andWhere(
                          raw(
                            `json_extract(quest_rewards, "$[0].info.amount") = ${amount}`,
                          ),
                        )
                    }
                  })
                  if (hasAltQuests) {
                    questTypes.orWhere((altMega) => {
                      altMega.whereIn(
                        'alternative_quest_reward_type',
                        TEMP_EVOLUTION_RESOURCE_REWARD_TYPES,
                      )
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
                          `json_extract(quest_rewards, "$[0].info.pokemon_id") = ${poke}`,
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
                          `json_extract(quest_rewards, "$[0].info.pokemon_id") = ${poke}`,
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
                // Case (a): Include if the invasion character/grunt type is checked
                subQuery.whereIn('character', invasions)

                // Case (b): Include if invasion has potential rewards that are checked
                if (rocketPokemon.length) {
                  const matchingGruntsByPosition =
                    getMatchingRocketGruntsByPosition(rocketPokemon)

                  // For confirmed invasions, check actual Pokemon slots
                  if (hasConfirmed)
                    subQuery.orWhere((confirmedQuery) => {
                      confirmedQuery
                        .whereNotIn(
                          'character',
                          ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
                        )
                        .andWhere('confirmed', 1)
                        .andWhere((pokemonQuery) => {
                          ROCKET_REWARD_POSITIONS.forEach(
                            ({ name, pokemonId }) => {
                              pokemonQuery.orWhereIn(pokemonId, rocketPokemon)
                              if (matchingGruntsByPosition[name].length) {
                                // Confirmation only makes populated slots
                                // authoritative. A missing slot is still unknown,
                                // so keep rows whose event lineup can reward the
                                // selected Pokemon in that same position.
                                pokemonQuery.orWhere((missingSlotQuery) => {
                                  missingSlotQuery
                                    .whereIn(
                                      'character',
                                      matchingGruntsByPosition[name],
                                    )
                                    .andWhere((missingPokemonQuery) => {
                                      missingPokemonQuery
                                        .whereNull(pokemonId)
                                        .orWhere(pokemonId, 0)
                                    })
                                })
                              }
                            },
                          )
                        })
                    })

                  // For unconfirmed invasions, check if their potential rewards match
                  // Get all grunt types that have potential rewards matching the filter
                  const gruntTypesWithMatchingRewards = [
                    ...new Set(Object.values(matchingGruntsByPosition).flat()),
                  ]

                  if (gruntTypesWithMatchingRewards.length > 0) {
                    subQuery.orWhere((unconfirmedQuery) => {
                      unconfirmedQuery.whereIn(
                        'character',
                        gruntTypesWithMatchingRewards,
                      )
                      if (hasConfirmed)
                        unconfirmedQuery.andWhere((confirmationQuery) => {
                          confirmationQuery
                            .where('confirmed', 0)
                            .orWhereNull('confirmed')
                        })
                    })
                  }
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
            const matchingGrunts = rocketPokemon.length
              ? [
                  ...new Set(
                    Object.values(
                      getMatchingRocketGruntsByPosition(rocketPokemon),
                    ).flat(),
                  ),
                ]
              : []
            stops.orWhere((invasion) => {
              invasion
                // Legacy/non-incident schemas have no observed lineup slots.
                // Use event-info grunt candidates as a safe SQL superset and
                // let secondaryFilter apply the exact Rocket reward filter.
                .whereIn('grunt_type', [
                  ...new Set([...invasions, ...matchingGrunts]),
                ])
                .andWhere('incident_expire_timestamp', '>=', ts)
              if (hasConfirmed) {
                invasion.andWhere('confirmed', onlyConfirmed)
              }
            })
          }
        }
        if (effectiveOnlyArEligible && pokestopPerms) {
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
    // Endpoint-backed source: fetch the DNF scan and map each Golbat row into
    // the mapRDM shape secondaryFilter expects. Golbat applies contest_focus
    // inside its DNF matcher before max_fort_results, so Buddy filters stay on
    // the endpoint path without unrelated Showcases consuming the cap. Mirrors
    // Gym.getAll — the same secondaryFilter runs for both SQL and endpoint
    // rows. `with_incidents:true` makes Golbat attach invasions[] (grunts +
    // showcase/goldstop/kecleon event rows). On any failure/bad-shape we log
    // and fall through to the SQL block below.
    if (mem) {
      // filterRTree below allow-alls on empty area inputs, unlike the SQL
      // getAreaSql — so enforce the strict-area denial before accepting any
      // endpoint rows (else a no-area user under strict mode sees everything).
      if (areaRestrictionsDenyAll(areaRestrictions, onlyAreas)) return []
      try {
        // Endpoint rows always carry BOTH quest layers, so resolve the layer
        // selection as dual-capable (mirrors getAvailable's override). The SQL
        // ctx flags are undefined for a pure-endpoint source, which would make
        // effectiveQuestLayer resolve to 'both' even when questLayerMode
        // restricts to a single layer.
        const memQuestLayer = resolveQuestLayerSelection(
          filters.onlyShowQuestSet,
          { hasAltQuests: true },
        )
        const res = await evalScannerQuery(
          TAGS.pokestops,
          `${mem}/api/pokestop/scan`,
          JSON.stringify({
            min: { latitude: args.minLat, longitude: args.minLon },
            max: { latitude: args.maxLat, longitude: args.maxLon },
            // 0 = Golbat's server default (max_fort_results). The request must
            // NOT cap traversal at the display limit: Golbat stops before
            // ReactMap's filterRTree/freshness/secondaryFilter run, so rejected
            // stops consume the cap and valid ones later in the scan are lost.
            // queryLimits.pokestops is applied below as the display cap, after
            // those local gates.
            limit: 0,
            filters: dnfFilters,
            with_incidents: true,
          }),
          'POST',
          secret,
          httpAuth,
        )
        if (res && Array.isArray(res.pokestops)) {
          // Deep-link parity with SQL's `(bbox) OR id = manualId` — see Gym.
          const manualId = normalizeManualId(filters.onlyManualId)
          if (
            manualId !== null &&
            !res.pokestops.some((p) => p && p.id === manualId)
          ) {
            try {
              const one = await fetchFortById(
                TAGS.pokestops,
                `${mem}/api/pokestop/id/${encodeURIComponent(manualId)}`,
                secret,
                httpAuth,
              )
              // Prepend, not append: secondaryFilter stops at resultLimit, so
              // an off-viewport deep-link appended last would be skipped in a
              // dense viewport that already fills the cap.
              if (one) res.pokestops.unshift(one)
            } catch {
              // by-id miss mirrors SQL finding no such row
            }
          }
          const mapped = res.pokestops.map(mapScanPokestop).filter(
            (stop) =>
              stop &&
              // Mirror the SQL-only gates: the endpoint path never applied
              // them and secondaryFilter has no equivalent, so stale/wrong
              // stops would render where the SQL source suppresses them.
              // Freshness (hideOldPokestops):
              (!hideOldPokestops ||
                stop.updated > ts - stopValidDataLimit * 86400) &&
              // Power-up level (onlyLevels): power-ups are out of the game
              // (also why power_up_level is dropped from the DNF); the gate is
              // vestigial but mirrored for exact endpoint↔SQL parity. SQL only
              // applies it under onlyAllPokestops (the `else` of `if
              // (!onlyAllPokestops)`), so guard on it like the gym sibling —
              // else the whole quest/invasion/lure layer under-returns.
              (!onlyAllPokestops ||
                onlyLevels === 'all' ||
                Number(stop.power_up_level) === Number(onlyLevels)) &&
              filterRTree(stop, areaRestrictions, onlyAreas),
          )
          // Mirror the SQL path: pass the result cap to secondaryFilter (its
          // loop runs while filteredResults.length < resultLimit — omitting it
          // returns zero markers) rather than pre-truncating, which would drop
          // the appended off-viewport manual-id row before filtering.
          const final = Pokestop.secondaryFilter(
            mapped,
            filters,
            ts,
            midnight,
            perms,
            // The endpoint scan always returns confirmed lineup data, so treat
            // it as confirmed-capable regardless of the source's schema flag
            // (which the SQL fallback below still relies on).
            true,
            effectiveOnlyArEligible,
            memQuestLayer,
            queryLimits.pokestops,
          )
          log.info(
            TAGS.pokestops,
            describeDnfNarrowing(
              'POKESTOP',
              dnfFilters,
              res.examined,
              res.pokestops.length,
              final.length,
            ),
          )
          return final
        }
        log.warn(
          TAGS.pokestops,
          `[POKESTOP] /api/pokestop/scan gave no pokestops array — ${describeScannerResponse(
            res,
          )} — falling back to SQL for this source`,
        )
      } catch (e) {
        log.warn(
          TAGS.pokestops,
          `[POKESTOP] /api/pokestop/scan error — falling back to SQL for this source: ${e}`,
        )
      }
    }
    const results = await query

    const normalized = Pokestop.mapRDM(results, ts)
    const finalResults = Pokestop.secondaryFilter(
      normalized,
      filters,
      ts,
      midnight,
      perms,
      hasConfirmed,
      effectiveOnlyArEligible,
      effectiveQuestLayer,
      queryLimits.pokestops,
    )
    return finalResults
  }

  static fieldAssigner(target, source, fields) {
    fields.forEach((field) => (target[field] = source[field]))
  }

  static getIncidentBlocker(incidents) {
    const blocker = {
      displayType: 0,
      expireTimestamp: 0,
    }

    ;(incidents || []).forEach((incident) => {
      const displayType = incident.display_type
      // Showcase expiry is tracked separately on the client so local timer
      // updates can fall through to the next hidden blocker without a refetch.
      if (
        displayType === 7 &&
        incident.incident_expire_timestamp > blocker.expireTimestamp
      ) {
        blocker.displayType = 7
        blocker.expireTimestamp = incident.incident_expire_timestamp
      }
    })

    return {
      displayType: blocker.displayType || null,
      expireTimestamp: blocker.expireTimestamp || null,
    }
  }

  static hasRocketPokemonFilter(
    filters,
    pokemonId,
    formId,
    enabledRocketPokemonSpecies,
  ) {
    if (!pokemonId) return false
    const speciesKey = getRocketPokemonFilterKey(pokemonId)
    const exactKey = getRocketPokemonFilterKey(pokemonId, formId)
    if (filters[exactKey] || filters[speciesKey]) return true

    // An unknown community form is a potential match for any selected exact
    // form of that species. A known form never matches a different exact form.
    return (
      exactKey === speciesKey &&
      (
        enabledRocketPokemonSpecies || getEnabledRocketPokemonSpecies(filters)
      ).has(Number(pokemonId))
    )
  }

  static invasionMatchesFilters(
    invasion,
    filters,
    hasConfirmed,
    enabledRocketPokemonSpecies,
  ) {
    const gruntType = Number(invasion.grunt_type ?? 0)
    const info = state.event.invasions[gruntType]
    if (!gruntType || !info) return false

    if (hasConfirmed && filters.onlyConfirmed && !invasion.confirmed) {
      return false
    }
    if (
      filters.onlyExcludeGrunts &&
      state.event.rocketGruntIDs.includes(gruntType)
    ) {
      return false
    }
    if (
      filters.onlyExcludeLeaders &&
      state.event.rocketLeaderIDs.includes(gruntType)
    ) {
      return false
    }
    if (
      !isRocketPokemonFilterExcluded(gruntType) &&
      ROCKET_REWARD_POSITIONS.some(({ name, enabled, pokemonId, form }) => {
        if (!info[enabled]) return false
        // Trust each observed slot independently. Confirmed incidents can still
        // have partial lineups, so an absent slot falls back to event info.
        if (
          hasConfirmed &&
          invasion.confirmed &&
          Number(invasion[pokemonId]) > 0
        ) {
          return Pokestop.hasRocketPokemonFilter(
            filters,
            invasion[pokemonId],
            invasion[form],
            enabledRocketPokemonSpecies,
          )
        }
        return info.encounters[name]?.some((poke) =>
          Pokestop.hasRocketPokemonFilter(
            filters,
            poke.id,
            poke.form,
            enabledRocketPokemonSpecies,
          ),
        )
      })
    ) {
      return true
    }

    return !!(
      filters[`i${gruntType}`] ||
      (filters.onlyAllPokestops &&
        (filters.onlyConfirmed ? invasion.confirmed : true))
    )
  }

  // filters and removes unwanted data
  static secondaryFilter(
    queryResults,
    filters,
    ts,
    midnight,
    perms,
    hasConfirmed,
    effectiveOnlyArEligible,
    effectiveQuestLayer,
    resultLimit,
  ) {
    const filteredResults = []
    const enabledRocketPokemonSpecies = getEnabledRocketPokemonSpecies(filters)
    for (
      let i = 0;
      i < queryResults.length && filteredResults.length < resultLimit;
      i += 1
    ) {
      const pokestop = queryResults[i]
      const canViewIncidentMetadata = perms.eventStops || perms.invasions
      const incidentBlocker = canViewIncidentMetadata
        ? Pokestop.getIncidentBlocker(pokestop.invasions)
        : null
      const filtered = {
        showcase_expiry: canViewIncidentMetadata
          ? pokestop.showcase_expiry || null
          : null,
        incident_blocker_display_type: incidentBlocker?.displayType || null,
        incident_blocker_expire_timestamp:
          incidentBlocker?.expireTimestamp || null,
      }

      Pokestop.fieldAssigner(filtered, pokestop, [
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
        Pokestop.fieldAssigner(filtered, pokestop, [
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
        const showcaseFocus = parseShowcaseFocus(pokestop.showcase_focus)
        const showcaseFocusDisplay = getShowcaseFocusDisplay(showcaseFocus)
        const useLegacyShowcaseFields = !showcaseFocusDisplay
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
              event.display_type === 9
                ? useLegacyShowcaseFields
                  ? pokestop.showcase_pokemon_id
                  : showcaseFocusDisplay.pokemonId
                : null,
            showcase_pokemon_form_id:
              event.display_type === 9
                ? useLegacyShowcaseFields
                  ? pokestop.showcase_pokemon_form_id
                  : showcaseFocusDisplay.pokemonFormId
                : null,
            showcase_pokemon_type_id:
              event.display_type === 9
                ? useLegacyShowcaseFields
                  ? pokestop.showcase_pokemon_type_id
                  : showcaseFocusDisplay.pokemonTypeId
                : null,
            showcase_focus: event.display_type === 9 ? showcaseFocus : null,
            showcase_rankings: event.display_type === 9 ? showcaseData : null,
            showcase_ranking_standard:
              event.display_type === 9
                ? pokestop.showcase_ranking_standard
                : null,
            display_type: event.display_type,
          }))
          .filter((event) => filters[getShowcaseEventFilterKey(event)])
      }
      if (
        perms.invasions &&
        (filters.onlyAllPokestops || filters.onlyInvasions)
      ) {
        filtered.invasions = pokestop.invasions.filter((invasion) =>
          Pokestop.invasionMatchesFilters(
            invasion,
            filters,
            hasConfirmed,
            enabledRocketPokemonSpecies,
          ),
        )
      }
      if (
        perms.lures &&
        (filters.onlyAllPokestops ||
          (filters.onlyLures &&
            pokestop.lure_expire_timestamp >= ts &&
            filters[`l${pokestop.lure_id}`]))
      ) {
        Pokestop.fieldAssigner(filtered, pokestop, [
          'lure_id',
          'lure_expire_timestamp',
        ])
      }

      if (perms.quests && (filters.onlyAllPokestops || filters.onlyQuests)) {
        filtered.quests = []
        pokestop.quests.forEach((quest) => {
          if (
            quest.quest_reward_type &&
            (effectiveQuestLayer === 'both' ||
              (effectiveQuestLayer === 'with_ar' && quest.with_ar) ||
              (effectiveQuestLayer === 'without_ar' && !quest.with_ar))
          ) {
            const newQuest = {}
            Pokestop.parseRdmRewards(quest)
            const fields = [
              'quest_type',
              'quest_timestamp',
              'quest_target',
              'quest_conditions',
              'quest_reward_type',
              'quest_rewards',
              'with_ar',
              'quest_title',
            ]
            const rewardFilter =
              QUEST_REWARD_FILTER_DEFINITIONS[quest.quest_reward_type]
            if (rewardFilter) {
              newQuest.key = rewardFilter.getKey(quest)
              if (!newQuest.key) return
              fields.push(...rewardFilter.fields)
            } else {
              newQuest.key = `u${quest.quest_reward_type}`
              fields.push('quest_reward_amount')
            }

            const questCondition = `${quest.quest_title}__${quest.quest_target}`
            const filterMatchesQuest = (key) => {
              const filter = filters[key]
              if (!filter?.adv || filter.all) return !!filter
              const selectedConditions = Array.isArray(filter.adv)
                ? filter.adv
                : filter.adv.split(',')
              return (
                !selectedConditions.length ||
                selectedConditions.includes(questCondition)
              )
            }
            const matchesFilter = filterMatchesQuest(newQuest.key)
            if (
              quest.quest_timestamp >= midnight &&
              (filters.onlyAllPokestops || matchesFilter)
            ) {
              Pokestop.fieldAssigner(newQuest, quest, fields)
              filtered.quests.push(newQuest)
            }
          }
        })
      }
      if (
        (pokestop.ar_scan_eligible && effectiveOnlyArEligible) ||
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
    hasShowcaseFocus,
    mem,
    secret,
    httpAuth,
  }) {
    const ts = Math.floor(Date.now() / 1000)
    // A source with a Golbat endpoint (mem truthy) fetches the available list
    // from the endpoint. On failure (503 when fort_in_memory is off, or a
    // network error) it falls through to the SQL block below: a DUAL source
    // (endpoint + DB) runs the SQL fallback on its bound knex, while a
    // pure-endpoint source has no bound knex, so this.query() throws and the
    // caller's Promise.allSettled drops it (contributing nothing).
    if (mem) {
      let res
      let endpointError
      let malformedResponse = false
      try {
        // From the combined /api/fort/available (see Gym.getAvailable) — no
        // per-type fallback; a combined failure falls through to SQL below.
        const combined = await getCombinedFortAvailable(
          TAGS.pokestops,
          mem,
          secret,
          httpAuth,
        )
        res = combined?.pokestops
      } catch (e) {
        endpointError = e
      }
      // A returned Pokestop payload must implement the approved exact focus
      // contract. Do not let an outdated endpoint masquerade as a transient
      // failure and fall through to SQL.
      const hasPayload = res && typeof res === 'object' && !Array.isArray(res)
      if (hasPayload && res.showcase_focus_filter !== true) {
        throw new Error(
          'Golbat lacks the required showcase_focus_filter capability',
        )
      }
      // Transport failures and malformed responses may use the source's
      // normal SQL fallback. Keep only the mapper call inside this catch so
      // internal processing errors remain visible.
      if (
        hasPayload &&
        Array.isArray(res.quests) &&
        Array.isArray(res.invasions)
      ) {
        // The Golbat endpoint always returns both AR (`with_ar:true`) and
        // non-AR quest tuples; honor `map.misc.questLayerMode` the same way
        // the SQL path does so we don't advertise filters for a hidden layer.
        const questLayer = resolveQuestLayerSelection('both', {
          hasAltQuests: true,
        })
        let result
        try {
          result = mapAvailablePokestops(res, {
            invasions: state.event.invasions,
            includeBaseQuests: questLayer !== 'without_ar',
            includeAltQuests: questLayer !== 'with_ar',
          })
        } catch (e) {
          endpointError = e
          malformedResponse = true
        }
        if (result) {
          const availableSet = new Set(result.available)
          applyRocketPokemonFallback(availableSet)
          log.info(
            TAGS.pokestops,
            `[POKESTOP] loaded available from ${mem}/api/fort/available — ${availableSet.size} filter keys (${res.quests.length} quests, ${res.invasions.length} invasions, ${(res.lures || []).length} lures, ${(res.showcases || []).length} showcases), ${Object.keys(result.conditions).length} reward conditions`,
          )
          return {
            available: [...availableSet],
            conditions: result.conditions,
          }
        }
      }
      if (endpointError) {
        log.warn(
          TAGS.pokestops,
          `[POKESTOP] /api/fort/available ${
            malformedResponse ? 'malformed payload' : 'error'
          } — falling through to SQL (empty only for a pure-endpoint source): ${endpointError}`,
        )
      } else {
        // getCombinedFortAvailable resolves null when the endpoint is
        // unavailable (e.g. 503 when fort_in_memory is off, or a network
        // error), so res is undefined and this branch falls through to SQL.
        log.warn(
          TAGS.pokestops,
          '[POKESTOP] /api/fort/available unavailable or malformed (e.g. fort_in_memory off) — falling through to SQL (empty only for a pure-endpoint source)',
        )
      }
    }
    const finalList = new Set()
    const conditions = {}
    const queries = {}
    const questLayer = resolveQuestLayerSelection('both', { hasAltQuests })
    const shouldIncludeBaseQuests = questLayer !== 'without_ar'
    const shouldIncludeAltQuests = hasAltQuests && questLayer !== 'with_ar'

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
    queries.items = Pokestop.query()
      .select('quest_item_id', 'quest_title', 'quest_target')
      .from('pokestop')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id', 'quest_title', 'quest_target')
    if (hasAltQuests) {
      queries.itemsAlt = Pokestop.query()
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
    queries.stardust = Pokestop.query().where('quest_reward_type', 3)
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
      queries.stardustAlt = Pokestop.query().where(
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
    queries.xp = Pokestop.query().where('quest_reward_type', 1)
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
      queries.xpAlt = Pokestop.query().where('alternative_quest_reward_type', 1)
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
    queries.mega = Pokestop.query()
      .from('pokestop')
      .whereIn('quest_reward_type', TEMP_EVOLUTION_RESOURCE_REWARD_TYPES)
    if (hasRewardAmount) {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct('quest_reward_amount AS amount')
        .distinct('quest_pokemon_id AS id')
    } else {
      queries.mega
        .select('quest_title', 'quest_target')
        .distinct(
          raw('json_extract(quest_rewards, "$[0].info.pokemon_id")').as('id'),
        )
        .distinct(
          raw('json_extract(quest_rewards, "$[0].info.amount")').as('amount'),
        )
    }
    if (hasAltQuests) {
      queries.megaAlt = Pokestop.query().whereIn(
        'alternative_quest_reward_type',
        TEMP_EVOLUTION_RESOURCE_REWARD_TYPES,
      )
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
    queries.candy = Pokestop.query()
      .select('quest_title', 'quest_target')
      .distinct('quest_pokemon_id AS id')
      .from('pokestop')
      .where('quest_reward_type', 4)
    if (hasAltQuests) {
      queries.candyAlt = Pokestop.query()
        .select(
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .distinct('alternative_quest_pokemon_id AS id')
        .where('alternative_quest_reward_type', 4)
    }
    // candy

    // xl candy
    queries.xlCandy = Pokestop.query()
      .select('quest_title', 'quest_target')
      .distinct('quest_pokemon_id AS id')
      .from('pokestop')
      .where('quest_reward_type', 9)
    if (hasAltQuests) {
      queries.xlCandyAlt = Pokestop.query()
        .select(
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .distinct('alternative_quest_pokemon_id AS id')
        .where('alternative_quest_reward_type', 9)
    }
    // xl candy

    // pokemon
    queries.pokemon = Pokestop.query()
      .distinct('quest_pokemon_id')
      .select(
        raw('json_extract(quest_rewards, "$[0].info.form_id")').as('form'),
        'quest_title',
        'quest_target',
      )
      .where('quest_reward_type', 7)
    if (hasAltQuests) {
      queries.pokemonAlt = Pokestop.query()
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
      queries.invasions = Pokestop.query()
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
      queries.invasions = Pokestop.query()
        .distinct('grunt_type')
        .where('grunt_type', '>', 0)
        .andWhere('incident_expire_timestamp', '>=', ts)
        .orderBy('grunt_type')
    }
    if (hasConfirmed) {
      queries.rocketPokemon = Pokestop.query()
        .select([
          'character AS grunt_type',
          'slot_1_pokemon_id',
          'slot_1_form',
          'slot_2_pokemon_id',
          'slot_2_form',
          'slot_3_pokemon_id',
          'slot_3_form',
        ])
        .where('confirmed', 1)
        .andWhere(
          multiInvasionMs ? 'expiration_ms' : 'expiration',
          '>=',
          ts * (multiInvasionMs ? 1000 : 1),
        )
        .where((slots) =>
          slots
            .where('slot_1_pokemon_id', '>', 0)
            .orWhere('slot_2_pokemon_id', '>', 0)
            .orWhere('slot_3_pokemon_id', '>', 0),
        )
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
    queries.lures = Pokestop.query()
      .select('lure_id')
      .andWhere('lure_expire_timestamp', '>=', ts)
      .groupBy('lure_id')
      .orderBy('lure_id')
    // lures

    // showcase
    if (hasShowcaseData || hasShowcaseFocus) {
      const distinct = []
      if (hasShowcaseFocus) distinct.push('showcase_focus')
      if (hasShowcaseData) distinct.push('showcase_pokemon_id')
      if (hasShowcaseForm) distinct.push('showcase_pokemon_form_id')
      if (hasShowcaseType) distinct.push('showcase_pokemon_type_id')
      queries.showcase = Pokestop.query()
        .distinct(...distinct)
        .where('showcase_expiry', '>=', ts)
        .orderBy(...distinct)
    }
    // showcase

    ;['items', 'stardust', 'xp', 'mega', 'candy', 'xlCandy', 'pokemon'].forEach(
      (key) => {
        if (!shouldIncludeBaseQuests) {
          delete queries[key]
        }
        if (!shouldIncludeAltQuests) {
          delete queries[`${key}Alt`]
        }
      },
    )

    const resolved = Object.fromEntries(
      await Promise.all(
        Object.entries(queries).map(async ([key, query]) => [key, await query]),
      ),
    )

    const genericQuestQueries = []
    if (shouldIncludeBaseQuests) {
      const genericQuestQuery = Pokestop.query()
        .from('pokestop')
        .select('quest_reward_type', 'quest_title', 'quest_target')
        .whereNotNull('quest_reward_type')
        .whereNotIn('quest_reward_type', REWARD_TYPES_WITH_DEDICATED_FILTERS)
        .groupBy('quest_reward_type', 'quest_title', 'quest_target')
      genericQuestQueries.push(genericQuestQuery)
    }
    if (shouldIncludeAltQuests) {
      const genericQuestQuery = Pokestop.query()
        .select(
          'alternative_quest_reward_type AS quest_reward_type',
          'alternative_quest_title AS quest_title',
          'alternative_quest_target AS quest_target',
        )
        .whereNotNull('alternative_quest_reward_type')
        .whereNotIn(
          'alternative_quest_reward_type',
          REWARD_TYPES_WITH_DEDICATED_FILTERS,
        )
        .groupBy(
          'alternative_quest_reward_type',
          'alternative_quest_title',
          'alternative_quest_target',
        )
      genericQuestQueries.push(genericQuestQuery)
    }
    const genericQuests = (await Promise.all(genericQuestQueries)).flat()

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
          break
        case 'megaAlt':
        case 'mega':
          rewards.forEach((reward) => {
            if (reward.id && reward.amount) {
              process(
                `m${reward.id}-${reward.amount}`,
                reward.quest_title,
                reward.quest_target,
              )
            }
          })
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
          break
        case 'candyAlt':
        case 'candy':
          rewards.forEach((reward) =>
            process(`c${reward.id}`, reward.quest_title, reward.quest_target),
          )
          break
        case 'xlCandyAlt':
        case 'xlCandy':
          rewards.forEach((reward) =>
            process(`x${reward.id}`, reward.quest_title, reward.quest_target),
          )
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
              if (isRocketPokemonFilterExcluded(reward.grunt_type)) return

              const fullGrunt = state.event.invasions[reward.grunt_type]
              if (fullGrunt?.firstReward && reward.slot_1_pokemon_id > 0) {
                finalList.add(
                  getRocketPokemonFilterKey(
                    reward.slot_1_pokemon_id,
                    reward.slot_1_form,
                  ),
                )
              }
              if (fullGrunt?.secondReward && reward.slot_2_pokemon_id > 0) {
                finalList.add(
                  getRocketPokemonFilterKey(
                    reward.slot_2_pokemon_id,
                    reward.slot_2_form,
                  ),
                )
              }
              if (fullGrunt?.thirdReward && reward.slot_3_pokemon_id > 0) {
                finalList.add(
                  getRocketPokemonFilterKey(
                    reward.slot_3_pokemon_id,
                    reward.slot_3_form,
                  ),
                )
              }
            })
          }
          break
        case 'showcase':
          if (hasShowcaseData || hasShowcaseFocus) {
            rewards.forEach((reward) => {
              const showcaseFocus = parseShowcaseFocus(reward.showcase_focus)
              const focusKey = getShowcaseFocusFilterKey(showcaseFocus)
              if (focusKey) {
                finalList.add(focusKey)
              } else if (!showcaseFocus && reward.showcase_pokemon_id) {
                finalList.add(
                  `f${reward.showcase_pokemon_id}-${
                    reward.showcase_pokemon_form_id ?? 0
                  }`,
                )
              } else if (!showcaseFocus && reward.showcase_pokemon_type_id) {
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
          break
      }
    })

    applyRocketPokemonFallback(finalList)

    genericQuests.forEach((reward) =>
      process(
        `u${reward.quest_reward_type}`,
        reward.quest_title,
        reward.quest_target,
      ),
    )

    return { available: [...finalList], conditions }
  }

  static parseRdmRewards = (quest) => {
    if (quest.quest_reward_type) {
      // Endpoint rows carry an already-parsed rewards array; SQL rows carry a
      // JSON string. Defensive: a malformed row could have quest_reward_type
      // with no rewards, so don't let one bad stop throw and break the query.
      const rewards =
        typeof quest.quest_rewards === 'string'
          ? JSON.parse(quest.quest_rewards)
          : quest.quest_rewards
      if (!Array.isArray(rewards) || rewards.length === 0) return quest
      const { info } = rewards[0]
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
          quest.quest_background = quest.quest_background || 0
          quest.quest_bread_mode = quest.quest_bread_mode || 0
          break
        case 9:
          Object.keys(info).forEach((x) => (quest[`xl_candy_${x}`] = info[x]))
          break
        case MEGA_RESOURCE_REWARD_TYPE:
        case TEMP_EVO_BRANCH_RESOURCE_REWARD_TYPE:
          Object.keys(info).forEach((key) => {
            quest[key === 'temp_evolution' ? key : `mega_${key}`] = info[key]
          })
          break
        default:
          quest.quest_reward_amount = info?.amount
          break
      }
    }
    return quest
  }

  static async search(perms, args, _ctx, distance, bbox) {
    const { onlyAreas = [], search = '' } = args
    const query = Pokestop.query()
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
    const { search, onlyAreas = [], locale, lat, lon } = args
    const questLayer = resolveQuestLayerSelection(args.questLayer, {
      hasAltQuests,
    })
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
    const matchingRewardTypes = Object.keys(
      state.event.masterfile.questRewardTypes,
    ).filter((rType) =>
      i18next
        .t(`quest_reward_${rType}`, { lng: locale })
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(search),
    )
    const rewardTypes = [
      ...new Set(
        matchingRewardTypes.includes(`${MEGA_RESOURCE_REWARD_TYPE}`)
          ? [...matchingRewardTypes, `${TEMP_EVO_BRANCH_RESOURCE_REWARD_TYPE}`]
          : matchingRewardTypes,
      ),
    ]

    if (!pokemonIds.length && !itemIds.length && !rewardTypes.length) {
      return []
    }
    const queries = []
    if (questLayer !== 'without_ar') {
      const query = Pokestop.query()
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
      const altQuestQuery = Pokestop.query()
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

    return mapped
      .map((result) => Pokestop.parseRdmRewards(result))
      .filter(Boolean)
  }

  static async searchLures(perms, args, _ctx, distance, bbox) {
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
    const query = Pokestop.query()
      .select(['*', distance])
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
    const validPokemonIds = new Set(
      state.event.available.pokestops
        .filter((key) => key.startsWith('a'))
        .map((key) => key.slice(1).split('-')[0]),
    )
    const pokemonIds = Object.keys(state.event.masterfile.pokemon)
      .filter(
        (pkmn) =>
          i18next
            .t(`poke_${pkmn}`, { lng: locale })
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(search) && validPokemonIds.has(pkmn),
      )
      .map((x) => +x)
    const pokemonInvasions = Object.keys(state.event.invasions).filter(
      (gruntType) => invasionHasMatchingRocketPokemon(gruntType, pokemonIds),
    )
    if (!invasions.length && !pokemonIds.length) {
      return []
    }
    const query = Pokestop.query()
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')

    Pokestop.joinIncident(query, hasMultiInvasions, multiInvasionMs)
    query.select(distance)

    const characterColumn = hasMultiInvasions ? 'character' : 'grunt_type'
    query.andWhere(
      hasMultiInvasions
        ? multiInvasionMs
          ? 'expiration_ms'
          : 'expiration'
        : 'incident_expire_timestamp',
      '>=',
      ts * (hasMultiInvasions && multiInvasionMs ? 1000 : 1),
    )
    if (hasConfirmed && pokemonIds.length) {
      const matchingGruntsByPosition =
        getMatchingRocketGruntsByPosition(pokemonIds)
      query.where((searchQuery) => {
        const addPokemonSearch = (pokemonQuery) => {
          pokemonQuery.where((confirmedQuery) => {
            confirmedQuery
              .whereNotIn(
                characterColumn,
                ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
              )
              .andWhere('confirmed', 1)
              .andWhere((slotQuery) => {
                ROCKET_REWARD_POSITIONS.forEach(({ name, pokemonId }) => {
                  slotQuery.orWhereIn(pokemonId, pokemonIds)
                  if (matchingGruntsByPosition[name].length) {
                    slotQuery.orWhere((missingSlotQuery) => {
                      missingSlotQuery
                        .whereIn(
                          characterColumn,
                          matchingGruntsByPosition[name],
                        )
                        .andWhere((missingPokemonQuery) => {
                          missingPokemonQuery
                            .whereNull(pokemonId)
                            .orWhere(pokemonId, 0)
                        })
                    })
                  }
                })
              })
          })
          if (pokemonInvasions.length) {
            pokemonQuery.orWhere((unconfirmedQuery) => {
              unconfirmedQuery
                .whereIn(characterColumn, pokemonInvasions)
                .andWhere((confirmationQuery) => {
                  confirmationQuery
                    .where('confirmed', 0)
                    .orWhereNull('confirmed')
                })
            })
          }
        }
        if (invasions.length) {
          searchQuery
            .whereIn(characterColumn, invasions)
            .orWhere(addPokemonSearch)
        } else {
          searchQuery.where(addPokemonSearch)
        }
      })
    } else {
      const searchCharacters = [...new Set([...invasions, ...pokemonInvasions])]
      if (searchCharacters.length) {
        query.whereIn(characterColumn, searchCharacters)
      }
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    const results = await query
    const pokemonFilters = Object.fromEntries(
      pokemonIds.map((pokemonId) => [getRocketPokemonFilterKey(pokemonId), {}]),
    )
    return pokemonIds.length
      ? results.filter(
          (invasion) =>
            invasions.includes(String(invasion.grunt_type)) ||
            Pokestop.invasionMatchesFilters(
              invasion,
              pokemonFilters,
              hasConfirmed,
            ),
        )
      : results
  }

  static async getOne(id, { mem, secret, httpAuth }) {
    if (mem) {
      try {
        const one = await fetchFortById(
          TAGS.pokestops,
          `${mem}/api/pokestop/id/${encodeURIComponent(id)}`,
          secret,
          httpAuth,
        )
        // Match the SQL projection ({lat, lon} only). Returning the raw Golbat
        // record would leak lure/power-up/detail fields past the sub-perm gates
        // and area restrictions — a deep link only needs centering.
        if (one) return { lat: one.lat, lon: one.lon }
      } catch (e) {
        log.warn(
          TAGS.pokestops,
          `[POKESTOP] /api/pokestop/id error — falling back to SQL: ${e}`,
        )
      }
    }
    return Pokestop.query().select(['lat', 'lon']).where('id', id).first()
  }

  static async getSubmissions(perms, args, { hasShowcaseData }) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = Pokestop.query()
      .whereBetween('lat', [minLat - 0.025, maxLat + 0.025])
      .andWhereBetween('lon', [minLon - 0.025, maxLon + 0.025])
      .select(['id', 'lat', 'lon', 'enabled', 'deleted', 'partner_id'])
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
  static async getFilterContext({ hasConfirmed, mem }) {
    // Check if rocket Pokemon filtering should be forced via config
    const fallback = config.getSafe('map.misc.fallbackRocketPokemonFiltering')

    if (fallback) {
      // Always enable rocket Pokemon filtering regardless of database support
      // This allows filtering by potential rocket Pokemon even without confirmed invasions
      return { hasConfirmedInvasions: true }
    }

    // Endpoint source: Golbat scan rows always carry confirmed + lineup slots,
    // so it is confirmed-capable without an SQL probe — and a pure-endpoint
    // model has no bound knex, so this.query() below would throw at startup.
    if (mem) return { hasConfirmedInvasions: true }

    // Use original behavior when config is disabled
    if (!hasConfirmed) return { hasConfirmedInvasions: false }
    const result = await Pokestop.query()
      .from('incident')
      .count('id', { as: 'total' })
      .where('confirmed', 1)
      .first()
    return { hasConfirmedInvasions: result.total > 0 }
  }
}

module.exports = { Pokestop }
