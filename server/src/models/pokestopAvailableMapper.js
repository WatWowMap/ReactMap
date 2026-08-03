// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/pokestop/available` response.
 *
 * Reproduces the filter-key formulas built by the SQL `getAvailable` block
 * in `Pokestop.js` (~lines 1763-1932, `process()` helper ~lines 1285-1294)
 * so that switching a pokestop source over to the Golbat endpoint yields the
 * SAME `{ available, conditions }` shape the map UI already expects.
 *
 * Standalone by design: no requires, so it can run under plain `node` with
 * no `node_modules` present.
 *
 * @typedef {object} AvailablePokestopQuest
 * @property {boolean} with_ar
 * @property {number} reward_type
 * @property {number} item_id
 * @property {number} amount
 * @property {number} pokemon_id
 * @property {number} form_id
 * @property {string} title
 * @property {number} target
 * @property {number} count
 *
 * @typedef {object} AvailablePokestopInvasion
 * @property {number} character
 * @property {number} display_type
 * @property {boolean} confirmed
 * @property {number|null} slot1_pokemon_id
 * @property {number|null} slot1_form
 * @property {number|null} slot2_pokemon_id
 * @property {number|null} slot2_form
 * @property {number|null} slot3_pokemon_id
 * @property {number|null} slot3_form
 *
 * @typedef {object} AvailablePokestopLure
 * @property {number} lure_id
 *
 * @typedef {object} AvailablePokestopShowcase
 * @property {number|null} pokemon_id
 * @property {number|null} form
 * @property {number|null} type_id
 *
 * @typedef {object} AvailablePokestops
 * @property {AvailablePokestopQuest[]} quests
 * @property {AvailablePokestopInvasion[]} invasions
 * @property {AvailablePokestopLure[]} lures
 * @property {AvailablePokestopShowcase[]} showcases
 *
 * @typedef {object} InvasionRewardConfig
 * @property {boolean} [firstReward]
 * @property {boolean} [secondReward]
 * @property {boolean} [thirdReward]
 *
 * @typedef {object} MapAvailablePokestopsCtx
 * @property {Record<number, InvasionRewardConfig>} invasions
 * @property {boolean} [includeBaseQuests] include AR (`with_ar:true`) quests; default true
 * @property {boolean} [includeAltQuests] include non-AR (`with_ar:false`) quests; default true
 *
 * @typedef {{ title: number | string, target: number }} QuestCondition
 * @typedef {Record<string, Record<string, QuestCondition>>} QuestConditions
 */

/**
 * Builds the quest reward filter key for a single quest tuple, mirroring
 * the `Pokestop.js:1763-1932` switch statement's per-reward-type branches.
 *
 * `reward_type` values are cross-checked against the SQL query definitions
 * that feed that switch (not just its `questTypes.filter` bookkeeping,
 * which references 9/12 in a way that looks swapped at a glance but is
 * self-correcting because both branches always run together — see
 * task-2-report.md): `candy` filters `quest_reward_type === 4`, `xlCandy`
 * filters `=== 9`, `mega` filters `=== MEGA_RESOURCE_REWARD_TYPE` (`12`).
 *
 * @param {AvailablePokestopQuest} quest
 * @returns {string}
 */
function questRewardKey(quest) {
  const { reward_type, amount, item_id, pokemon_id, form_id } = quest
  switch (reward_type) {
    case 1:
      return `p${amount}`
    case 2:
      return `q${item_id}`
    case 3:
      return `d${amount}`
    case 4:
      return `c${pokemon_id}`
    case 7:
      // §form: the SQL emits a bare `${pokemon_id}` when RDM's JSON
      // `form_id` was absent, and `${pokemon_id}-${form}` (incl. `-0`) when
      // present. The endpoint always sends `form_id` as a number (`0` for
      // absent), so JSON-absence can't be distinguished from a genuine
      // explicit form 0. Normalize `form_id === 0` to the bare key; a real
      // explicit-form-0 reward (rare) would diverge from the SQL output.
      return form_id === 0 ? `${pokemon_id}` : `${pokemon_id}-${form_id}`
    case 9:
      return `x${pokemon_id}`
    case 12:
      return `m${pokemon_id}-${amount}`
    case 20:
      // §type20: temp-evo branch mega energy. secondaryFilter keys type 20 as a
      // dedicated mega reward ONLY when both pokemon_id and amount are present
      // (else no key), and never emits `u20` (type 20 has a dedicated filter).
      // So advertise `m<id>-<amt>` only when complete — `u20`/`m<id>-0` would be
      // a filter no marker can satisfy.
      return pokemon_id > 0 && amount > 0 ? `m${pokemon_id}-${amount}` : ''
    default:
      return `u${reward_type}`
  }
}

/**
 * Maps Golbat's `GET /api/pokestop/available` response to ReactMap's
 * `{ available, conditions }` filter-key shape, matching the SQL-derived
 * output of `Pokestop.getAvailable` key-for-key.
 *
 * @param {AvailablePokestops} api
 * @param {MapAvailablePokestopsCtx} ctx event invasion config (`state.event.invasions`), used to gate `a` keys
 * @returns {{ available: string[], conditions: QuestConditions, taskConditions: Record<string, {title: string | number, target: number, rewards: Record<string, boolean>}> }}
 */
function mapAvailablePokestops(api, ctx) {
  const { includeBaseQuests = true, includeAltQuests = true } = ctx
  const available = new Set()
  /** @type {QuestConditions} */
  const conditions = {}
  // Task-primary filter keys (`k<title>-<target>`), the reverse of
  // `conditions` above - see `addTaskCondition` in
  // `filters/pokestop/questTaskMatch.js` (not required here to keep this
  // mapper dependency-free; kept in lockstep with that version by hand).
  const taskConditions = {}

  const process = (
    /** @type {string} */ key,
    /** @type {number | string} */ title,
    /** @type {number} */ target,
  ) => {
    if (title) {
      if (key in conditions) {
        conditions[key][`${title}-${target}`] = { title, target }
      } else {
        conditions[key] = { [`${title}-${target}`]: { title, target } }
      }
      const taskKey = `k${title}-${target}`
      if (taskKey in taskConditions) {
        taskConditions[taskKey].rewards[key] = true
      } else {
        taskConditions[taskKey] = { title, target, rewards: { [key]: true } }
      }
      available.add(taskKey)
    }
    available.add(key)
  }

  // Quests: `with_ar` true/false tuples both feed the same Set/conditions,
  // exactly as the SQL merges `quest` + `alternative_quest` columns.
  const quests = api.quests || []
  quests.forEach((quest) => {
    // Honor questLayerMode: `with_ar:true` is the AR (base/`quest_*`) layer,
    // `false` the non-AR (alt/`alternative_quest_*`) layer. Skip a layer the
    // config excludes, matching the SQL `shouldIncludeBaseQuests`/
    // `shouldIncludeAltQuests` gating in `Pokestop.getAvailable`.
    if (quest.with_ar ? !includeBaseQuests : !includeAltQuests) {
      return
    }
    // SQL filters reward_type 1 (xp) and 3 (stardust) tuples on
    // `quest_reward_amount > 0`; a non-positive amount emits no key at all.
    if (
      (quest.reward_type === 1 || quest.reward_type === 3) &&
      quest.amount <= 0
    ) {
      return
    }
    const key = questRewardKey(quest)
    // An incomplete reward (e.g. type-20 missing pokemon_id/amount) yields no
    // key — advertise nothing rather than a filter no marker can satisfy.
    if (!key) return
    // Every key — including generic `u<type>` fallbacks — carries its
    // title/target conditions, matching the SQL path's
    // `genericQuests.forEach(process)`. Otherwise endpoint deployments lose the
    // advanced quest-condition selector for generic rewards.
    process(key, quest.title, quest.target)
  })

  // Invasions: `i`/`b` keys are unconditional; the `a` key additionally
  // requires a confirmed slot1 reward the event config marks as a
  // `firstReward`, excluding team leaders (41-43) and Giovanni (44) -
  // mirrors the `invasions` and `rocketPokemon` SQL branches.
  const invasions = api.invasions || []
  invasions.forEach((invasion) => {
    const {
      character,
      display_type,
      confirmed,
      slot1_pokemon_id,
      slot1_form,
      slot2_pokemon_id,
      slot2_form,
      slot3_pokemon_id,
      slot3_form,
    } = invasion
    available.add(character > 0 ? `i${character}` : `b${display_type}`)

    const isRocketLeaderOrGiovanni = character >= 41 && character <= 44
    if (confirmed && !isRocketLeaderOrGiovanni) {
      // Each slot the event config marks as a reward contributes an `a` key,
      // mirroring the SQL path which reads confirmed slots 1/2/3. The form is
      // taken from the masterfile encounter pool, not the scanner-reported
      // slot form: the two disagree often enough (Wobbuffet has shown up as
      // both 602 and 2328 for the same grunt type) that building the key from
      // whichever form THIS poll happened to report lets the same species
      // mint a different key on a later poll, orphaning whatever a user
      // already switched off. Keeping this in lockstep with the SQL path (see
      // `getCanonicalRewardForm` there) means both always agree on one key.
      const cfg = ctx.invasions?.[character]
      const canonicalForm = (encounters, pokemonId, fallbackForm) => {
        const match = encounters?.find((poke) => poke.id === pokemonId)
        return match ? match.form : (fallbackForm ?? 0)
      }
      if (slot1_pokemon_id > 0 && cfg?.firstReward) {
        const form = canonicalForm(
          cfg.encounters?.first,
          slot1_pokemon_id,
          slot1_form,
        )
        available.add(`a${slot1_pokemon_id}-${form}`)
      }
      if (slot2_pokemon_id > 0 && cfg?.secondReward) {
        const form = canonicalForm(
          cfg.encounters?.second,
          slot2_pokemon_id,
          slot2_form,
        )
        available.add(`a${slot2_pokemon_id}-${form}`)
      }
      if (slot3_pokemon_id > 0 && cfg?.thirdReward) {
        const form = canonicalForm(
          cfg.encounters?.third,
          slot3_pokemon_id,
          slot3_form,
        )
        available.add(`a${slot3_pokemon_id}-${form}`)
      }
    }
  })

  // Lures contribute no conditions.
  const lures = api.lures || []
  lures.forEach((lure) => {
    available.add(`l${lure.lure_id}`)
  })

  // Showcases contribute no conditions.
  const showcases = api.showcases || []
  showcases.forEach((showcase) => {
    if (showcase.pokemon_id > 0) {
      available.add(`f${showcase.pokemon_id}-${showcase.form ?? 0}`)
    } else if (showcase.type_id > 0) {
      available.add(`h${showcase.type_id}`)
    }
  })

  return { available: [...available], conditions, taskConditions }
}

module.exports = { mapAvailablePokestops, questRewardKey }
