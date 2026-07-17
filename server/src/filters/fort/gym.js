// @ts-check

/**
 * Translate a gym's `args.filters` into Golbat ApiFortDnfFilter[] clauses,
 * gated on the layer toggles exactly like Gym.getAll's secondaryFilter:
 *
 * - Raid filters (egg tier `e`, raid boss `<id>-<form>`) only narrow when the
 *   raid layer (`onlyRaids`) is on; otherwise raids never show, so emitting a
 *   raid clause would over-fetch forts secondaryFilter then drops.
 * - The gym/team layer's shown gyms are always covered by either the match-all
 *   poison (`onlyAllGyms`/`onlyExEligible`/`onlyInBattle`/badges) or the
 *   `is_ar_scan_eligible` clause (`onlyArEligible`), so team/slot (`t`/`g`)
 *   filters need no clause of their own — one would only enlarge the fetch.
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
    onlyBadge,
    onlyRaids,
  } = filters
  // Poison: badge gyms (ReactMap-local join) and the show-all/ex/in-battle
  // toggles have no DNF expression -> fetch all.
  if (
    onlyAllGyms ||
    onlyExEligible ||
    onlyInBattle ||
    onlyGymBadges ||
    onlyBadge
  )
    return []

  const clauses = []
  if (onlyRaids) {
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
  if (onlyArEligible) clauses.push({ is_ar_scan_eligible: true })

  return clauses.length ? clauses : []
}

module.exports = { buildGymDnfFilters }
