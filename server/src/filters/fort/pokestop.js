// @ts-check
const { parseIdFormPair } = require('./parseIdForm')

/**
 * Grunt (incident) character ids whose *possible* rocket encounters include any
 * of the requested reward pokemon ids. Mirrors the SQL path's
 * `gruntTypesWithMatchingRewards` (`Pokestop.getAll`): iterate the event
 * invasion map, skip team leaders/Giovanni (41-44), and match by pokemon id
 * across the reward-gated first/second/third encounter slots. This is the DNF
 * expression of the `a<pokemon>` rocket-reward filter — a superset of the real
 * matches (both confirmed slots and unconfirmed grunts of these types),
 * narrowed exactly by secondaryFilter.
 *
 * @param {Record<string, any>} eventInvasions state.event.invasions
 * @param {Set<number>} pokemonIds
 * @returns {number[]}
 */
function gruntTypesForRocketPokemon(eventInvasions, pokemonIds) {
  const grunts = []
  Object.entries(eventInvasions || {}).forEach(([gruntStr, info]) => {
    if (!info) return
    const grunt = Number(gruntStr)
    if (!Number.isFinite(grunt) || (grunt >= 41 && grunt <= 44)) return
    const encounters = [
      ...(info.firstReward ? info.encounters?.first || [] : []),
      ...(info.secondReward ? info.encounters?.second || [] : []),
      ...(info.thirdReward ? info.encounters?.third || [] : []),
    ]
    if (encounters.some((poke) => pokemonIds.has(Number(poke.id)))) {
      grunts.push(grunt)
    }
  })
  return grunts
}

/**
 * Translate a pokestop's `args.filters` into ApiFortDnfFilter[] clauses.
 *
 * CRITICAL — exact key semantics. secondaryFilter matches a stop's computed
 * reward key EXACTLY against the enabled keys, so the translation must be
 * equally exact or Golbat over-returns (users accumulate thousands of enabled
 * keys from past rotations; any looseness matches today's stops those keys
 * don't cover). Two rules follow:
 * 1. One clause per reward TYPE (item 2, candy 4, encounter 7, xl 9, mega 12,
 *    plus a type-only clause for 1/3/u). Golbat ANDs sub-fields within a
 *    clause; merging types would let e.g. a candy pair match an encounter stop
 *    of the same species (cross-type over-return), and mixing item_id with
 *    pokemon sub-fields would match nothing (under-return).
 * 2. Pokemon pairs are always FORM-EXACT — the pokemon-API pattern
 *    ({pokemon_id, form}; form set = exact, omitted = any-form wildcard). A
 *    bare ReactMap key means "reward carries no form_id" (encoded 0, like
 *    proto FORM_UNSET), NOT "any form", so it translates to form:0; an
 *    omitted-form wildcard was the accumulated-keys 997-stop over-return bug.
 * Amounts are exact too where the key carries one: mega keys (`m<id>-<amt>`)
 * group into per-amount clauses with `quest_reward_amount {amt, amt}`, and
 * stardust/xp keys (`d<amt>`/`p<amt>`) emit one amount-exact clause each
 * (int16-overflow amounts fall back to type-level). `u<type>` keys stay
 * type-level by design. DNF is a superset narrow; secondaryFilter finalizes
 * (quest title/target `adv`, invasion `confirmed` stay residual). Returns []
 * (match-all) when a match-all toggle is active or nothing is set.
 *
 * `a<pokemon>` rocket-reward keys are expanded to `incident_character` (the
 * grunt types that can reward those pokemon) via `eventInvasions`; without that
 * map (empty/unloaded) they poison to `[]` since they can't be expressed safely.
 *
 * @param {Record<string, any>} filters args.filters
 * @param {Record<string, any>} [eventInvasions] state.event.invasions (grunt→reward map)
 * @returns {object[]}
 */
function buildPokestopDnfFilters(filters, eventInvasions) {
  if (!filters || typeof filters !== 'object') return []
  const {
    onlyAllPokestops,
    onlyArEligible,
    onlyQuests,
    onlyInvasions,
    onlyLures,
    onlyEventStops,
    onlyExcludeGrunts,
    onlyExcludeLeaders,
  } = filters
  if (onlyAllPokestops) return []
  // NOTE: no power_up_level. Like gyms, pokestop power-up filtering only applies
  // in `onlyAllPokestops` mode (which poisons to [] above), so a power_up_level
  // clause could only fire when the real filter does NOT restrict it — an
  // under-return. Power-up stays residual.

  const INT16_MAX = 32767
  const itemIds = [] // 'q' -> quest reward type 2
  const candyPokemon = [] // 'c' -> type 4 (formless rewards -> form:0)
  const xlPokemon = [] // 'x' -> type 9 (formless rewards -> form:0)
  const megaByAmount = new Map() // 'm<id>-<amt>' -> type 12, amount-exact groups
  const megaLoose = [] // 'm' keys with no parseable amount (amount residual)
  const encounterPokemon = [] // bare '<id>[-<form>]' -> type 7 (form-exact)
  const dustAmounts = new Set() // 'd<amt>' -> type 3, amount-exact
  const xpAmounts = new Set() // 'p<amt>' -> type 1, amount-exact
  const typeOnly = new Set() // 'u<type>' (+ overflow amounts) -> type-level
  const lureId = []
  const incidentCharacter = new Set() // 'i' grunt ids + 'a'-derived grunt ids
  const rocketPokemonIds = new Set() // 'a<pokemon>' reward ids
  const incidentDisplayType = []
  const contestPokemon = []
  const contestPokemonType = []

  Object.keys(filters).forEach((key) => {
    if (typeof key !== 'string' || key.length === 0) return
    const n = Number(key.slice(1))
    switch (key.charAt(0)) {
      case 'o':
        break
      case 'l':
        if (Number.isFinite(n)) lureId.push(n)
        break
      case 'q':
        if (Number.isFinite(n)) itemIds.push(n)
        break
      case 'd':
        // stardust key carries the exact amount; > int16 falls back to type-level
        if (Number.isFinite(n) && n > 0 && n <= INT16_MAX) dustAmounts.add(n)
        else typeOnly.add(3)
        break
      case 'p':
        if (Number.isFinite(n) && n > 0 && n <= INT16_MAX) xpAmounts.add(n)
        else typeOnly.add(1)
        break
      case 'u':
        if (Number.isFinite(n)) typeOnly.add(n)
        break
      case 'c':
        // The candy key has NO form component, so its match is form-agnostic —
        // the exact translation is the form wildcard (form omitted). Pinning
        // form:0 would under-return if a candy reward ever carried a form_id.
        // Safe from over-return: the per-type clause only meets type-4 stops.
        if (Number.isFinite(n)) candyPokemon.push({ pokemon_id: n })
        break
      case 'x':
        // form-agnostic key -> form wildcard (see 'c')
        if (Number.isFinite(n)) xlPokemon.push({ pokemon_id: n })
        break
      case 'm': {
        // key is `m<pokemon_id>-<amount>` (NOT <id>-<form>): mega rewards are
        // formless, and the key's amount is part of the exact match — group by
        // amount so each clause carries quest_reward_amount {amt, amt}.
        const [idPart, amtPart] = key.slice(1).split('-', 2)
        const megaId = Number(idPart)
        if (!Number.isFinite(megaId)) break
        const amt = Number(amtPart)
        // form-agnostic key -> form wildcard (see 'c')
        if (Number.isFinite(amt) && amt > 0 && amt <= INT16_MAX) {
          if (!megaByAmount.has(amt)) megaByAmount.set(amt, [])
          megaByAmount.get(amt).push({ pokemon_id: megaId })
        } else {
          megaLoose.push({ pokemon_id: megaId })
        }
        break
      }
      case 'i':
        if (Number.isFinite(n)) incidentCharacter.add(n)
        break
      case 'b':
        if (Number.isFinite(n)) incidentDisplayType.push(n)
        break
      case 'a': {
        // `a<pokemon>-<form>` rocket reward: match by pokemon id (form ignored,
        // as in the SQL grunt-reward expansion). Expanded after the loop.
        const rocketId = Number(key.slice(1).split('-')[0])
        if (Number.isFinite(rocketId)) rocketPokemonIds.add(rocketId)
        break
      }
      case 'f': {
        const pair = parseIdFormPair(key, 1)
        if (pair) contestPokemon.push(pair)
        break
      }
      case 'h':
        if (Number.isFinite(n)) contestPokemonType.push(n)
        break
      default: {
        // "<pokemon>[-<form>]" = quest reward type 7 (pokemon encounter).
        // Form-exact (see rule 2 above): explicit form matches that form; a
        // bare key means the reward carries no form_id -> form:0 (FortLookup
        // encodes form-absent as 0).
        // "<id>-0" (historic key format; current code normalizes form-0 to a
        // bare key) is DROPPED: it only matches a stop whose reward carries an
        // EXPLICIT form_id 0, which the reward JSON does not produce (proto
        // zero-fields are omitted -> column NULL -> bare key). Translating it
        // as form:0 would collide with Golbat's NULL->0 collapse and match
        // every formless stop of the species that the exact bare key does not
        // cover (the -56 residual). Same accepted divergence class as the
        // availableMapper's §form note.
        const [idPart, formPart] = key.split('-', 2)
        const id = Number(idPart)
        if (!Number.isFinite(id)) break
        if (formPart === '0') break
        const form =
          formPart && formPart !== 'null' && Number.isFinite(Number(formPart))
            ? Number(formPart)
            : 0
        encounterPokemon.push({ pokemon_id: id, form })
        break
      }
    }
  })

  // Emit clauses ONLY for layers that are on — secondaryFilter processes each
  // category only when its toggle is set (onlyQuests/onlyInvasions/onlyLures/
  // onlyEventStops), so a disabled category's forts never show. Emitting their
  // clauses would over-fetch forts secondaryFilter then drops (the common case:
  // persisted-but-disabled invasion/showcase/lure filters still in args.filters).
  const clauses = []
  if (onlyQuests) {
    if (itemIds.length)
      clauses.push({ quest_reward_type: [2], quest_reward_item_id: itemIds })
    if (candyPokemon.length)
      clauses.push({
        quest_reward_type: [4],
        quest_reward_pokemon: candyPokemon,
      })
    if (encounterPokemon.length)
      clauses.push({
        quest_reward_type: [7],
        quest_reward_pokemon: encounterPokemon,
      })
    if (xlPokemon.length)
      clauses.push({ quest_reward_type: [9], quest_reward_pokemon: xlPokemon })
    // type 20 (temp-evo branch resource) is mega energy too, so match both.
    megaByAmount.forEach((pokes, amt) =>
      clauses.push({
        quest_reward_type: [12, 20],
        quest_reward_pokemon: pokes,
        quest_reward_amount: { min: amt, max: amt },
      }),
    )
    if (megaLoose.length)
      clauses.push({
        quest_reward_type: [12, 20],
        quest_reward_pokemon: megaLoose,
      })
    dustAmounts.forEach((amt) =>
      clauses.push({
        quest_reward_type: [3],
        quest_reward_amount: { min: amt, max: amt },
      }),
    )
    xpAmounts.forEach((amt) =>
      clauses.push({
        quest_reward_type: [1],
        quest_reward_amount: { min: amt, max: amt },
      }),
    )
    if (typeOnly.size) clauses.push({ quest_reward_type: [...typeOnly] })
  }
  if (onlyLures && lureId.length) clauses.push({ lure_id: lureId })
  if (onlyInvasions) {
    if (rocketPokemonIds.size) {
      // Can't expand rocket-reward filters without the event map -> match-all so
      // the residual (invasionMatchesFilters) can still surface them.
      if (!eventInvasions || Object.keys(eventInvasions).length === 0) return []
      gruntTypesForRocketPokemon(eventInvasions, rocketPokemonIds).forEach(
        (g) => incidentCharacter.add(g),
      )
    }
    if (
      incidentCharacter.size &&
      (onlyExcludeGrunts || onlyExcludeLeaders) &&
      eventInvasions
    ) {
      // secondaryFilter rejects excluded grunt classes BEFORE any other check
      // (including rocket-reward matches), so subtract them from the clause —
      // same classification EventManager.setInvasions uses for the id sets.
      incidentCharacter.forEach((id) => {
        const grunt = eventInvasions[id]?.grunt
        if (
          (onlyExcludeGrunts && grunt === 'Grunt') ||
          (onlyExcludeLeaders &&
            (grunt === 'Executive' || grunt === 'Giovanni'))
        )
          incidentCharacter.delete(id)
      })
    }
    if (incidentCharacter.size)
      clauses.push({ incident_character: [...incidentCharacter] })
  }
  if (onlyEventStops) {
    // `b<display_type>` keys (goldstop/kecleon/showcase incidents) are consumed
    // by secondaryFilter's EVENTS branch (gated on onlyEventStops), not the
    // invasions branch — grunt-less incidents never match invasionMatchesFilters.
    if (incidentDisplayType.length)
      clauses.push({ incident_display_type: incidentDisplayType })
    if (contestPokemon.length) clauses.push({ contest_pokemon: contestPokemon })
    if (contestPokemonType.length)
      clauses.push({ contest_pokemon_type: contestPokemonType })
  }
  if (onlyArEligible) clauses.push({ is_ar_scan_eligible: true })

  return clauses
}

module.exports = { buildPokestopDnfFilters }
