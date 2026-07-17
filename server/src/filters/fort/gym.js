// @ts-check
const { parseIdFormPair } = require('./parseIdForm')

/**
 * Team/slot clauses for the gym layer, mirroring Gym.getAll's
 * finalTeams/finalSlots derivation exactly:
 * - only teams with a `t<team>-0` key participate (g-keys without a t-key do
 *   nothing, as in the model)
 * - `all: true` on the t-key, team 0 (uncontested), or every slot enabled via
 *   g-keys -> the whole team (`team_id` list)
 * - otherwise one clause per enabled slot VALUE (`g<team>-<idx>` encodes
 *   available_slots = slotCount - idx), grouped across teams
 * - `all: false` with no g-keys -> the team shows nothing (no clause)
 *
 * secondaryFilter requires the team/slot match for EVERY gym-layer display
 * (`hasGym = (onlyAllGyms || ex || ar || inBattle) && (team || slot match)`),
 * so these clauses are a correct superset for all of those modes — the
 * ex/ar/in-battle halves stay residual.
 *
 * @param {Record<string, any>} filters
 * @param {number} slotCount baseGymSlotAmounts.length
 * @returns {object[]}
 */
function buildGymTeamClauses(filters, slotCount) {
  const fullTeams = []
  /** @type {Map<number, number[]>} slot value -> teams */
  const bySlot = new Map()
  Object.keys(filters).forEach((key) => {
    if (typeof key !== 'string' || key.charAt(0) !== 't') return
    const teamStr = key.slice(1).split('-')[0]
    const team = Number(teamStr)
    if (!Number.isFinite(team)) return
    const all = filters[`t${teamStr}-0`]?.all
    if (all || team === 0) {
      fullTeams.push(team)
      return
    }
    const slotVals = []
    Object.keys(filters).forEach((gk) => {
      if (gk.charAt(0) !== 'g') return
      const [gTeam, gIdx] = gk.slice(1).split('-')
      if (gTeam !== teamStr) return
      const v = slotCount - Number(gIdx)
      if (Number.isFinite(v)) slotVals.push(v)
    })
    if (slotVals.length >= slotCount) {
      fullTeams.push(team)
      return
    }
    slotVals.forEach((v) => {
      if (!bySlot.has(v)) bySlot.set(v, [])
      bySlot.get(v).push(team)
    })
  })
  const clauses = []
  if (fullTeams.length) clauses.push({ team_id: fullTeams })
  bySlot.forEach((teams, v) =>
    clauses.push({ team_id: teams, available_slots: { min: v, max: v } }),
  )
  return clauses
}

/**
 * Translate a gym's `args.filters` into Golbat ApiFortDnfFilter[] clauses,
 * gated on the layer toggles exactly like Gym.getAll's secondaryFilter:
 *
 * - Raid layer (`onlyRaids`): tier-override mode (`onlyRaidTier !== 'all'`)
 *   matches on raid_level alone — secondaryFilter accepts EVERY raid/egg of
 *   that level regardless of the enabled boss/egg keys, so deriving from the
 *   keys would under-return. In 'all' mode the enabled egg (`e`) and boss
 *   (`<id>-<form>`) keys drive the clauses.
 * - Gym layer (`onlyAllGyms`/`onlyExEligible`/`onlyInBattle`/`onlyArEligible`):
 *   team/slot clauses (see buildGymTeamClauses) — every gym-layer display
 *   requires the team/slot match, so they are a tight superset for all four
 *   enablers; ex/ar/in-battle narrowing stays residual.
 * - Badge viewing (`onlyGymBadges`) poisons: badge gyms surface via a
 *   ReactMap-local badge join Golbat can't know about. `onlyBadge` alone is
 *   NOT a poison — it defaults to 'all' for every user with the gymBadges
 *   perm, and badges only surface when `onlyGymBadges` is on.
 *
 * Gender stays residual; power-ups are no longer in the game (no clause).
 * Returns [] (match-all) when nothing narrowable is on.
 *
 * @param {Record<string, any>} filters args.filters
 * @param {number} [slotCount] baseGymSlotAmounts.length (open-slot base)
 * @returns {object[]}
 */
function buildGymDnfFilters(filters, slotCount = 6) {
  if (!filters || typeof filters !== 'object') return []
  const {
    onlyAllGyms,
    onlyExEligible,
    onlyInBattle,
    onlyArEligible,
    onlyGymBadges,
    onlyRaids,
    onlyRaidTier,
  } = filters
  // Poison: badge gyms come from a ReactMap-local join -> fetch all.
  if (onlyGymBadges) return []

  const clauses = []
  if (onlyRaids) {
    const tierOverride =
      onlyRaidTier && onlyRaidTier !== 'all' ? Number(onlyRaidTier) : NaN
    if (Number.isFinite(tierOverride)) {
      clauses.push({ raid_level: [tierOverride] })
    } else {
      const eggs = []
      const raidBosses = []
      Object.keys(filters).forEach((key) => {
        if (typeof key !== 'string' || key.length === 0) return
        if (key.charAt(0) === 'e') {
          const tier = Number(key.slice(1))
          if (Number.isFinite(tier)) eggs.push(tier)
        } else if (/^\d/.test(key)) {
          // raid boss "<id>-<form>" (default case in Gym.getAll); gender residual
          const pair = parseIdFormPair(key)
          if (pair) raidBosses.push(pair)
        }
      })
      // Golbat's tag is `raid_pokemon_id` (unlike other types' `*_pokemon`).
      if (raidBosses.length) clauses.push({ raid_pokemon_id: raidBosses })
      if (eggs.length) clauses.push({ raid_level: eggs })
    }
  }
  if (onlyAllGyms || onlyExEligible || onlyInBattle || onlyArEligible) {
    clauses.push(...buildGymTeamClauses(filters, slotCount))
  }

  return clauses
}

module.exports = { buildGymDnfFilters }
