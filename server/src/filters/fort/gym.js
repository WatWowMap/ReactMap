// @ts-check

/**
 * Translate a gym's `args.filters` into Golbat ApiFortDnfFilter[] clauses,
 * gated on the layer toggles exactly like Gym.getAll's secondaryFilter:
 *
 * - Raid filters only narrow when the raid layer (`onlyRaids`) is on. In
 *   tier-override mode (`onlyRaidTier !== 'all'`) secondaryFilter accepts
 *   EVERY raid/egg of that level regardless of which boss/egg keys are
 *   enabled (`onlyRaidTier === gym.raid_level && (isRaid || isEgg)`), so the
 *   clause matches on level alone — deriving it from the enabled keys would
 *   under-return curated-key users. In 'all' mode the enabled egg (`e`) and
 *   boss (`<id>-<form>`) keys drive the clauses.
 * - The gym/team layer's shown gyms are always covered by either the match-all
 *   poison (`onlyAllGyms`/`onlyExEligible`/`onlyInBattle`/badges) or the
 *   `is_ar_scan_eligible` clause (`onlyArEligible`), so team/slot (`t`/`g`)
 *   filters need no clause of their own — one would only enlarge the fetch.
 * - Badge viewing (`onlyGymBadges`) poisons: badge gyms surface via a
 *   ReactMap-local badge join Golbat can't know about. `onlyBadge` alone is
 *   NOT a poison — it defaults to 'all' for every user with the gymBadges
 *   perm, and badges only surface when `onlyGymBadges` is on.
 *
 * Gender and power-up stay residual. Returns [] (match-all) when an
 * unexpressible category is active or nothing narrowable is on.
 *
 * @param {Record<string, any>} filters args.filters
 * @returns {object[]}
 */
function buildGymDnfFilters(filters) {
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
  // Poison: these categories have no DNF expression -> fetch all.
  if (onlyAllGyms || onlyExEligible || onlyInBattle || onlyGymBadges) return []

  const clauses = []
  if (onlyRaids) {
    const tierOverride =
      onlyRaidTier && onlyRaidTier !== 'all' ? Number(onlyRaidTier) : NaN
    if (Number.isFinite(tierOverride)) {
      clauses.push({ raid_level: [tierOverride] })
    } else {
      const eggs = []
      const raidBosses = []
      Object.entries(filters).forEach(([key]) => {
        if (typeof key !== 'string' || key.length === 0) return
        if (key.charAt(0) === 'e') {
          const tier = Number(key.slice(1))
          if (Number.isFinite(tier)) eggs.push(tier)
        } else if (/^\d/.test(key)) {
          // raid boss "<id>-<form>" (default case in Gym.getAll); gender residual
          const [idPart, formPart] = key.split('-', 2)
          const id = Number(idPart)
          if (!Number.isFinite(id)) return
          const pair = { pokemon_id: id }
          if (
            formPart &&
            formPart !== 'null' &&
            Number.isFinite(Number(formPart))
          )
            pair.form = Number(formPart)
          raidBosses.push(pair)
        }
      })
      // Golbat's tag is `raid_pokemon_id` (unlike other types' `*_pokemon`).
      if (raidBosses.length) clauses.push({ raid_pokemon_id: raidBosses })
      if (eggs.length) clauses.push({ raid_level: eggs })
    }
  }
  if (onlyArEligible) clauses.push({ is_ar_scan_eligible: true })

  return clauses.length ? clauses : []
}

module.exports = { buildGymDnfFilters }
