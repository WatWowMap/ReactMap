// @ts-check

/* eslint-disable no-restricted-syntax */
const { Model } = require('objection')
const i18next = require('i18next')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { getAreaSql, areaRestrictionsDenyAll } = require('../utils/getAreaSql')
const { state } = require('../services/state')

const {
  applyManualIdFilter,
  normalizeManualId,
} = require('../utils/manualFilter')
const { isDualQuestLayerMode } = require('../utils/questLayerMode')
const {
  evalScannerQuery,
  describeScannerResponse,
  fetchFortById,
} = require('../utils/evalScannerQuery')
const { filterRTree } = require('../utils/filterRTree')
const { getCombinedFortAvailable } = require('../utils/fortAvailable')
const { buildGymDnfFilters } = require('../filters/fort/gym')
const { describeDnfNarrowing } = require('../filters/fort/describeDnfNarrowing')
const { mapGymAvailable } = require('./gymAvailableMapper')

const coreFields = [
  'id',
  'name',
  'url',
  'lat',
  'lon',
  'updated',
  'last_modified_timestamp',
]

const gymFields = [
  'available_slots',
  'ex_raid_eligible',
  'ar_scan_eligible',
  'team_id',
  'in_battle',
  'guarding_pokemon_id',
  'guarding_pokemon_display',
  'defenders',
  'total_cp',
  'power_up_points',
  'power_up_level',
  'power_up_end_timestamp',
]

const raidFields = [
  'raid_level',
  'raid_battle_timestamp',
  'raid_end_timestamp',
  'raid_pokemon_id',
  'raid_pokemon_form',
  'raid_pokemon_gender',
  'raid_pokemon_costume',
  'raid_pokemon_evolution',
  'raid_pokemon_move_1',
  'raid_pokemon_move_2',
  'raid_pokemon_alignment',
]

/**
 * @param {unknown} gender
 * @returns {1 | 2 | 3 | null}
 */
function parseFilterGender(gender) {
  const parsed = Number(gender)
  return parsed >= 1 && parsed <= 3 ? /** @type {1 | 2 | 3} */ (parsed) : null
}

/**
 * @param {string} key
 * @param {unknown} filter
 * @returns {{ pokemonId: number, form: number | null, gender: 1 | 2 | 3 | null } | null}
 */
function parseRaidBossFilter(key, filter) {
  const [idPart, formPart] = key.split('-', 2)
  const pokemonId = Number(idPart)
  if (!Number.isFinite(pokemonId)) return null

  let form = null
  if (formPart && formPart !== 'null') {
    const parsedForm = Number(formPart)
    if (!Number.isFinite(parsedForm)) return null
    form = parsedForm
  }

  return {
    pokemonId,
    form,
    gender: parseFilterGender(filter?.gender),
  }
}

/**
 * @param {import('@rm/types').Gym} gym
 * @param {unknown} filter
 * @returns {boolean}
 */
function matchesRaidBossGender(gym, filter) {
  const gender = parseFilterGender(filter?.gender)
  return gender === null || gym.raid_pokemon_gender === gender
}

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  /**
   *
   * @param {import('objection').QueryBuilder<Gym, Gym[]>} query
   */
  static onlyValid(query) {
    query.andWhere('enabled', true)
    query.andWhere('deleted', false)
  }

  static async getAll(
    perms,
    args,
    { availableSlotsCol, mem, secret, httpAuth },
    userId,
  ) {
    const {
      gyms: gymPerms,
      raids: raidPerms,
      areaRestrictions,
      gymBadges,
    } = perms
    const {
      onlyLevels,
      onlyAllGyms,
      onlyRaids,
      onlyExEligible,
      onlyInBattle,
      onlyArEligible,
      onlyRaidTier,
      onlyGymBadges,
      onlyBadge,
      onlyAreas = [],
      onlyManualId,
    } = args.filters
    const effectiveOnlyArEligible = isDualQuestLayerMode() && onlyArEligible
    const ts = Math.floor(Date.now() / 1000)
    const query = Gym.query()
    const { queryLimits, gymValidDataLimit, hideOldGyms } =
      config.getSafe('api')
    const { baseGymSlotAmounts } = config.getSafe('defaultFilters.gyms')

    if (hideOldGyms) {
      query.where('updated', '>', ts - gymValidDataLimit * 86400)
    }

    applyManualIdFilter(query, {
      manualId: onlyManualId,
      latColumn: 'lat',
      lonColumn: 'lon',
      idColumn: 'id',
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    })
    Gym.onlyValid(query)

    const raidBossFilters = new Map()
    const teams = []
    const eggs = []
    const slots = []
    const actualBadge = onlyBadge?.startsWith('badge_')
      ? +onlyBadge.replace('badge_', '')
      : `${onlyBadge}`

    const userBadges =
      onlyGymBadges && gymBadges && userId
        ? await state.db.query(
            'Badge',
            'getAll',
            userId,
            ...(typeof actualBadge === 'string'
              ? ['>', 0]
              : ['=', actualBadge]),
          )
        : []

    Object.entries(args.filters).forEach(([gym, filter]) => {
      switch (gym.charAt(0)) {
        case 'r':
        case 'o':
          break
        case 'e':
          eggs.push(gym.slice(1))
          break
        case 't':
          teams.push(gym.slice(1).split('-')[0])
          break
        case 'g':
          slots.push({
            team: gym.slice(1).split('-')[0],
            slots: baseGymSlotAmounts.length - gym.slice(1).split('-')[1],
          })
          break
        default:
          {
            const parsed = parseRaidBossFilter(gym, filter)
            if (parsed) {
              raidBossFilters.set(
                `${parsed.pokemonId}-${parsed.form ?? 'null'}`,
                parsed,
              )
            }
          }
          break
      }
    })

    const finalTeams = []
    const finalSlots = Object.fromEntries(
      Object.keys(state.event.masterfile.teams).map((team) => [team, []]),
    )

    teams.forEach((team) => {
      const all = args.filters[`t${team}-0`]?.all
      let slotCount = all ? baseGymSlotAmounts.length : 0
      if (!all) {
        slots.forEach((slot) => {
          if (slot.team === team) {
            slotCount += 1
            finalSlots[team].push(+slot.slots)
          }
        })
      }
      if (slotCount === baseGymSlotAmounts.length || team == 0) {
        delete finalSlots[team]
        finalTeams.push(+team)
      }
    })

    if (
      !effectiveOnlyArEligible &&
      !onlyExEligible &&
      !onlyInBattle &&
      !userBadges.length
    ) {
      // Does some checks if no special filters are enabled
      if (!onlyRaids && onlyAllGyms && !slots.length && !finalTeams.length) {
        // Returns nothing if gyms are enabled but no teams are selected
        return []
      }
      if (
        !onlyAllGyms &&
        onlyRaids &&
        onlyRaidTier === 'all' &&
        !raidBossFilters.size &&
        !eggs.length
      ) {
        // Returns nothing if only raids are enabled without any filters
        return []
      }
      if (onlyGymBadges && !userBadges.length && !onlyAllGyms && !onlyRaids) {
        // Returns nothing if only gym badges are enabled without any badges
        return []
      }
    }

    if (onlyAllGyms && onlyLevels !== 'all' && onlyLevels) {
      query.andWhere('power_up_level', onlyLevels)
    }
    query.andWhere((gym) => {
      if (onlyExEligible && gymPerms) {
        gym.orWhere((ex) => {
          ex.where('ex_raid_eligible', 1)
        })
      }
      if (onlyInBattle && gymPerms) {
        gym.orWhere((battle) => {
          battle.where('in_battle', 1)
        })
      }
      if (effectiveOnlyArEligible && gymPerms) {
        gym.orWhere((ar) => {
          ar.where('ar_scan_eligible', 1)
        })
      }
      if (onlyAllGyms && gymPerms) {
        if (finalTeams.length === 0 && slots.length === 0) {
          gym.whereNull('team_id')
        } else if (finalTeams.length === 4) {
          gym.orWhereNotNull('team_id')
        } else {
          if (finalTeams.length) {
            gym.orWhere((team) => {
              team.whereIn('team_id', finalTeams || [])
            })
          }
          Object.entries(finalSlots).forEach(([team, teamSlots]) => {
            if (teamSlots.length) {
              gym.orWhere((gymSlot) => {
                gymSlot
                  .where('team_id', team)
                  .whereIn(availableSlotsCol, teamSlots || [])
              })
            }
          })
        }
      }
      if (actualBadge === 'none' && onlyGymBadges) {
        gym.orWhereNotIn('id', userBadges.map((badge) => badge.gymId) || [])
      } else if (userBadges.length) {
        gym.orWhereIn('id', userBadges.map((badge) => badge.gymId) || [])
      }
      if (onlyRaids && raidPerms) {
        if (onlyRaidTier === 'all') {
          if (raidBossFilters.size) {
            gym.orWhere((raid) => {
              raid.where('raid_end_timestamp', '>=', ts).andWhere((bosses) => {
                ;[...raidBossFilters.values()].forEach(
                  ({ pokemonId, form, gender }, index) => {
                    const method = index ? 'orWhere' : 'where'
                    bosses[method]((combo) => {
                      combo.where('raid_pokemon_id', pokemonId)
                      if (form === null) {
                        combo.andWhereNull('raid_pokemon_form')
                      } else {
                        combo.andWhere('raid_pokemon_form', form)
                      }
                      if (gender !== null) {
                        combo.andWhere('raid_pokemon_gender', gender)
                      }
                    })
                  },
                )
              })
            })
          }
          if (eggs.length) {
            gym.orWhere((egg) => {
              if (eggs.length === 6) {
                egg.where('raid_level', '>', 0)
              } else {
                egg.whereIn('raid_level', eggs || [])
              }
              egg.andWhere((eggStatus) => {
                eggStatus
                  .where('raid_battle_timestamp', '>=', ts)
                  .orWhere((unknownEggs) => {
                    unknownEggs
                      .where('raid_pokemon_id', 0)
                      .andWhere('raid_end_timestamp', '>=', ts)
                  })
              })
            })
          }
        } else {
          gym.orWhere((raidTier) => {
            raidTier
              .where('raid_level', onlyRaidTier)
              .andWhere('raid_end_timestamp', '>=', ts)
          })
        }
      }
    })
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }

    const secondaryFilter = (queryResults) => {
      const filteredResults = []
      const userBadgeObj = Object.fromEntries(
        userBadges.map((b) => [b.gymId, b.badge]),
      )

      queryResults.forEach((gym) => {
        const newGym = Object.fromEntries(
          coreFields.map((field) => [field, gym[field]]),
        )
        const isRaid = gym.raid_end_timestamp > ts
        const isEgg = isRaid && !gym.raid_pokemon_id
        const raidBossFilter =
          args.filters[`${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`]

        if (userBadgeObj[gym.id]) {
          newGym.badge = userBadgeObj[gym.id]
        }
        if (gymPerms) {
          if (gym.availble_slots !== undefined) {
            gym.available_slots = gym.availble_slots
          }
          if (gym.updated > ts - gymValidDataLimit * 86400) {
            gymFields.forEach((field) => (newGym[field] = gym[field]))
          }
          if (
            typeof gym.guarding_pokemon_display === 'string' &&
            gym.guarding_pokemon_display
          ) {
            newGym.guarding_pokemon_display = JSON.parse(
              gym.guarding_pokemon_display,
            )
          }
          if (typeof gym.defenders === 'string' && gym.defenders) {
            newGym.defenders = JSON.parse(gym.defenders)
          }
        }
        if (
          onlyRaids &&
          raidPerms &&
          (onlyRaidTier === 'all'
            ? (raidBossFilter &&
                isRaid &&
                matchesRaidBossGender(gym, raidBossFilter)) ||
              (args.filters[`e${gym.raid_level}`] && isEgg)
            : onlyRaidTier === gym.raid_level && (isRaid || isEgg))
        ) {
          raidFields.forEach((field) => (newGym[field] = gym[field]))
          if (!newGym.raid_pokemon_alignment) newGym.raid_pokemon_alignment = 0
          newGym.hasRaid = true
        }
        if (
          (onlyAllGyms ||
            (onlyExEligible && newGym.ex_raid_eligible) ||
            (effectiveOnlyArEligible && newGym.ar_scan_eligible) ||
            (onlyInBattle && newGym.in_battle)) &&
          (finalTeams.includes(gym.team_id) ||
            finalSlots[gym.team_id]?.includes(gym.available_slots))
        ) {
          newGym.hasGym = true
        }
        if (
          newGym.hasRaid ||
          newGym.hasGym ||
          // Badge layer: mirror the SQL query's whereIn/whereNotIn(userBadges).
          // The endpoint candidate set is NOT pre-filtered by badge (it's
          // per-user ReactMap data Golbat can't know), so verify it here: the
          // `none` view keeps only gyms the user has NO badge for, and a
          // specific/`all` badge view keeps only gyms they DO. For the SQL path
          // this is a no-op — its results are already whereIn/whereNotIn'd — but
          // it stops the endpoint `none` view from leaking previously-badged
          // gyms. (newGym.badge is only ever set when onlyGymBadges.)
          (onlyGymBadges &&
            (actualBadge === 'none' ? !newGym.badge : !!newGym.badge))
        ) {
          filteredResults.push(newGym)
        }
      })
      return filteredResults
    }

    if (mem) {
      // filterRTree below allow-alls on empty area inputs, unlike the SQL
      // getAreaSql — so enforce the strict-area denial before accepting any
      // endpoint rows (else a no-area user under strict mode sees everything).
      if (areaRestrictionsDenyAll(areaRestrictions, onlyAreas)) return []
      try {
        // /api/gym/scan returns an envelope { gyms, examined, skipped, total },
        // not a bare array — the matching gyms are on res.gyms.
        const dnf = buildGymDnfFilters(args.filters, baseGymSlotAmounts.length)
        const res = await evalScannerQuery(
          TAGS.gyms,
          `${mem}/api/gym/scan`,
          JSON.stringify({
            min: { latitude: args.minLat, longitude: args.minLon },
            max: { latitude: args.maxLat, longitude: args.maxLon },
            // 0 = Golbat's server default (max_fort_results); the display cap
            // (queryLimits.gyms) is applied after the local gates below, not as
            // a pre-filter traversal cap (see Pokestop.getAll).
            limit: 0,
            filters: dnf,
          }),
          'POST',
          secret,
          httpAuth,
        )
        if (res && Array.isArray(res.gyms)) {
          // Deep-link parity with SQL's `(bbox) OR id = manualId`: an
          // off-viewport manually-selected gym joins the candidate set via the
          // by-id endpoint; every later gate (active/area/secondaryFilter)
          // still runs, exactly as it does for the SQL OR.
          const manualId = normalizeManualId(args.filters.onlyManualId)
          if (
            manualId !== null &&
            !res.gyms.some((g) => g && g.id === manualId)
          ) {
            try {
              const one = await fetchFortById(
                TAGS.gyms,
                `${mem}/api/gym/id/${encodeURIComponent(manualId)}`,
                secret,
                httpAuth,
              )
              // Prepend so the off-viewport deep-link survives secondaryFilter's
              // resultLimit cap in a dense viewport (see Pokestop.getAll).
              if (one) res.gyms.unshift(one)
            } catch {
              // by-id miss mirrors SQL finding no such row
            }
          }
          const active = res.gyms.filter(
            (gym) =>
              gym.enabled &&
              !gym.deleted &&
              (!hideOldGyms || gym.updated > ts - gymValidDataLimit * 86400) &&
              (!onlyAllGyms ||
                !onlyLevels ||
                onlyLevels === 'all' ||
                gym.power_up_level === Number(onlyLevels)) &&
              filterRTree(gym, areaRestrictions, onlyAreas),
          )
          const final = secondaryFilter(active)
          log.info(
            TAGS.gyms,
            describeDnfNarrowing(
              'GYM',
              dnf,
              res.examined,
              res.gyms.length,
              final.length,
            ),
          )
          // Display cap, applied after the local gates (mirrors SQL's
          // `.limit(queryLimits.gyms)`); the scan request itself is uncapped.
          return final.slice(0, queryLimits.gyms)
        }
        log.warn(
          TAGS.gyms,
          `[GYM] /api/gym/scan gave no gyms array — ${describeScannerResponse(res)} — falling back to SQL for this source`,
        )
      } catch (e) {
        log.warn(
          TAGS.gyms,
          `[GYM] /api/gym/scan error — falling back to SQL for this source: ${e}`,
        )
      }
    }
    return secondaryFilter(await query.limit(queryLimits.gyms))
  }

  static async getAvailable({ availableSlotsCol, mem, secret, httpAuth }) {
    // Endpoint source: fetch the aggregate from Golbat; on 503/error fall
    // through to the SQL below (dual source runs SQL on its bound knex; a
    // pure-endpoint source's this.query() throws and is dropped upstream).
    if (mem) {
      try {
        // One combined /api/fort/available per endpoint serves all three fort
        // models' refresh batch; falls back to the per-type endpoint when the
        // combined one is unavailable (older Golbat).
        // Availability comes from the combined /api/fort/available (one Golbat
        // cache pass for all three fort types, deduped across the models). No
        // per-type fallback: ReactMap always runs against a current Golbat that
        // serves it. A combined failure falls through to the SQL block below.
        const combined = await getCombinedFortAvailable(
          TAGS.gyms,
          mem,
          secret,
          httpAuth,
        )
        const res = combined?.gyms
        if (res && Array.isArray(res.raids)) {
          const { available } = mapGymAvailable(res)
          log.info(
            TAGS.gyms,
            `[GYM] loaded available from ${mem}/api/fort/available — ${available.length} filter keys (${res.raids.length} raid options)`,
          )
          return { available }
        }
        log.warn(
          TAGS.gyms,
          `[GYM] combined /api/fort/available had no gyms section — falling through to SQL (empty only for a pure-endpoint source)`,
        )
      } catch (e) {
        log.warn(
          TAGS.gyms,
          `[GYM] /api/fort/available error — falling through to SQL (empty only for a pure-endpoint source): ${e}`,
        )
      }
    }
    const ts = Math.floor(Date.now() / 1000)
    const results = await Gym.query()
      .select(['raid_pokemon_id', 'raid_pokemon_form', 'raid_level'])
      .from('gym')
      .where('raid_end_timestamp', '>=', ts)
      .andWhere('raid_level', '>', 0)
      .groupBy(['raid_pokemon_id', 'raid_pokemon_form', 'raid_level'])
      .orderBy('raid_pokemon_id', 'asc')
      .orderBy('raid_level', 'asc')
    const teamResults = await Gym.query()
      .select(['team_id AS team', `${availableSlotsCol} AS slots`])
      .groupBy(['team_id', availableSlotsCol])
      .then((r) => {
        const unique = new Set()
        r.forEach((result) => {
          if (result.team !== null && result.slots !== null) {
            unique.add(`t${result.team}-0`)
            unique.add(`g${result.team}-${6 - result.slots}`)
          }
        })
        return [...unique]
      })
    const seenBosses = new Set()
    const seenEggLevels = new Set()
    const seenRaidLevels = new Set()
    results.forEach((result) => {
      if (result.raid_pokemon_id) {
        seenBosses.add(`${result.raid_pokemon_id}-${result.raid_pokemon_form}`)
      } else {
        seenEggLevels.add(result.raid_level)
      }
      seenRaidLevels.add(result.raid_level)
    })

    return {
      available: [
        ...teamResults,
        ...Array.from(seenBosses),
        ...Array.from(seenEggLevels)
          .sort((a, b) => Number(a) - Number(b))
          .map((level) => `e${level}`),
        ...Array.from(seenRaidLevels)
          .sort((a, b) => Number(a) - Number(b))
          .map((level) => `r${level}`),
      ],
    }
  }

  static async search(perms, args, _context, distance, bbox) {
    const { areaRestrictions } = perms
    const { onlyAreas = [], search = '' } = args

    const query = Gym.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .whereILike('name', `%${search}%`)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    return query
  }

  static async searchRaids(perms, args, { hasAlignment }, distance, bbox) {
    const { search, locale, onlyAreas = [] } = args
    const pokemonIds = Object.keys(state.event.masterfile.pokemon).filter(
      (pkmn) =>
        i18next
          .t(`poke_${pkmn}`, { lng: locale })
          .toLowerCase()
          .includes(search),
    )
    const ts = Math.floor(Date.now() / 1000)

    const query = Gym.query()
      .select([
        'name',
        'id',
        'lat',
        'lon',
        'raid_pokemon_id',
        'raid_pokemon_form',
        'raid_pokemon_gender',
        'raid_pokemon_costume',
        'raid_pokemon_evolution',
        'raid_end_timestamp',
        distance,
      ])
      .whereBetween('lat', [bbox.minLat, bbox.maxLat])
      .andWhereBetween('lon', [bbox.minLon, bbox.maxLon])
      .whereIn('raid_pokemon_id', pokemonIds)
      .limit(config.getSafe('api.searchResultsLimit'))
      .orderBy('distance')
      .andWhere('raid_pokemon_id', '>', 0)
      .andWhere('raid_end_timestamp', '>=', ts)
    if (hasAlignment) {
      query.select('raid_pokemon_alignment')
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    return query
  }

  static async getBadges(userGyms) {
    const query = Gym.query().select(['*', 'gym.id', 'lat', 'lon', 'deleted'])

    const results = await query.whereIn(
      'gym.id',
      userGyms.map((gym) => gym.gymId) || [],
    )

    return results
      .map((gym) => {
        if (typeof gym.enabled === 'boolean') {
          gym.deleted = !gym.enabled
        }
        const gymBadge = userGyms.find((userGym) => userGym.gymId === gym.id)

        if (gymBadge) {
          gym.badge = gymBadge.badge
          gym.updatedAt = gymBadge.updatedAt
          gym.createdAt = gymBadge.createdAt
        }
        return gym
      })
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .reverse()
  }

  static async getOne(id, { mem, secret, httpAuth }) {
    if (mem) {
      try {
        const one = await fetchFortById(
          TAGS.gyms,
          `${mem}/api/gym/id/${encodeURIComponent(id)}`,
          secret,
          httpAuth,
        )
        // Match the SQL projection ({lat, lon} only). Returning the raw Golbat
        // record would leak raid/team/detail fields past the raids sub-perm
        // split and area restrictions — a deep link only needs centering.
        if (one) return { lat: one.lat, lon: one.lon }
      } catch (e) {
        log.warn(
          TAGS.gyms,
          `[GYM] /api/gym/id error — falling back to SQL: ${e}`,
        )
      }
    }
    return Gym.query().select(['lat', 'lon']).where('id', id).first()
  }

  static async getSubmissions(perms, args) {
    const {
      filters: { onlyAreas = [], onlyIncludeSponsored = true },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const wiggle = 0.025
    const query = Gym.query()
      .whereBetween('lat', [minLat - wiggle, maxLat + wiggle])
      .andWhereBetween('lon', [minLon - wiggle, maxLon + wiggle])
      .select(['id', 'lat', 'lon', 'partner_id'])

    if (!onlyIncludeSponsored) {
      query.andWhere((poi) => {
        poi.whereNull('partner_id').orWhere('partner_id', 0)
      })
    }
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas)) {
      return []
    }
    Gym.onlyValid(query)

    const results = await query
    return results
  }
}

module.exports = { Gym }
