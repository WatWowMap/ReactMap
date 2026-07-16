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
 * @property {number} slot1_pokemon_id
 * @property {number} slot1_form
 * @property {number} count
 *
 * @typedef {object} AvailablePokestopLure
 * @property {number} lure_id
 * @property {number} count
 *
 * @typedef {object} AvailablePokestopShowcase
 * @property {number} pokemon_id
 * @property {number} form
 * @property {number} type_id
 * @property {number} count
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
      // §type20: covers both the GoFest 2026 Mewtwo mega-energy fallback
      // (`m150-150`) and generic temp-evo mega-energy rewards. Falls back
      // to `u20` when no pokemon_id is conveyed.
      return pokemon_id > 0 ? `m${pokemon_id}-${amount}` : 'u20'
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
 * @returns {{ available: string[], conditions: QuestConditions }}
 */
function mapAvailablePokestops(api, ctx) {
  const { includeBaseQuests = true, includeAltQuests = true } = ctx
  const available = new Set()
  /** @type {QuestConditions} */
  const conditions = {}

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
    // SQL builds `u`-prefixed fallback keys via `questTypes.map(t =>
    // `u${t}`)` and never runs them through the conditions-attaching helper,
    // so fallback keys carry no conditions here either.
    if (key[0] === 'u') {
      available.add(key)
    } else {
      process(key, quest.title, quest.target)
    }
  })

  // Invasions: `i`/`b` keys are unconditional; the `a` key additionally
  // requires a confirmed slot1 reward the event config marks as a
  // `firstReward`, excluding team leaders (41-43) and Giovanni (44) -
  // mirrors the `invasions` and `rocketPokemon` SQL branches.
  const invasions = api.invasions || []
  invasions.forEach((invasion) => {
    const { character, display_type, confirmed, slot1_pokemon_id, slot1_form } =
      invasion
    available.add(character > 0 ? `i${character}` : `b${display_type}`)

    const isRocketLeaderOrGiovanni = character >= 41 && character <= 44
    if (
      confirmed &&
      slot1_pokemon_id > 0 &&
      !isRocketLeaderOrGiovanni &&
      ctx.invasions?.[character]?.firstReward
    ) {
      available.add(`a${slot1_pokemon_id}-${slot1_form}`)
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

  return { available: [...available], conditions }
}

module.exports = { mapAvailablePokestops, questRewardKey }
