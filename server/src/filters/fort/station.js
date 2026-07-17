// @ts-check

/**
 * Translate a station's `args.filters` into ApiFortDnfFilter[] clauses.
 * DNF is a superset narrow; the station JS gate (passesTimeGate/
 * passesFilterGate) finalizes.
 *
 * Stations are the one ephemeral fort type — expired stations (end_time past)
 * accumulate in Golbat's index, so a match-all scan ships mostly dead weight
 * (observed 1330 returned / 174 live). Every mode except inactive-viewing only
 * ever shows ACTIVE stations, so `station_active: true` is stamped into every
 * clause (and IS the whole clause for All-Stations mode, which needs no other
 * narrowing). The remaining now-relative pieces — the `updated > activeCutoff`
 * config cutoff, upcoming windows, and the inactive mode's day-based cutoff —
 * stay residual in the JS gate.
 *
 * Returns [] (match-all) only for `onlyInactiveStations`, which needs expired
 * stations AND filtered actives (an OR the cutoffs keep residual).
 *
 * @param {Record<string, any>} filters args.filters
 * @returns {object[]}
 */
function buildStationDnfFilters(filters) {
  if (!filters || typeof filters !== 'object') return []
  const {
    onlyAllStations,
    onlyInactiveStations,
    onlyMaxBattles,
    onlyBattleTier,
    onlyGmaxStationed,
  } = filters
  // Inactive mode shows expired stations (day-based cutoff) OR filtered
  // actives — the mix isn't expressible without the cutoffs -> fetch all.
  if (onlyInactiveStations) return []
  // All-Stations mode = every ACTIVE station, no further narrowing.
  if (onlyAllStations) return [{ station_active: true }]

  const clauses = []

  if (onlyMaxBattles) {
    const battleLevels = []
    const battlePokemon = []
    if (onlyBattleTier && onlyBattleTier !== 'all') {
      const t = Number(onlyBattleTier)
      if (Number.isFinite(t)) battleLevels.push(t)
    } else {
      // per-level multi-select + battle-combo keys
      Object.entries(filters).forEach(([key]) => {
        if (typeof key !== 'string' || key.length === 0) return
        if (key.startsWith('j')) {
          const lvl = Number(key.slice(1))
          if (Number.isFinite(lvl)) battleLevels.push(lvl)
        } else if (/^\d/.test(key)) {
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
          battlePokemon.push(pair)
        }
      })
    }
    if (battleLevels.length || battlePokemon.length) {
      // Separate OR clauses: the real filter's level-vs-pokemon AND/OR is
      // unverified, so separate clauses are a safe superset either way
      // (secondaryFilter's matchesStationBattleFilter narrows exactly).
      if (battleLevels.length)
        clauses.push({ battle_level: battleLevels, station_active: true })
      if (battlePokemon.length)
        clauses.push({ battle_pokemon: battlePokemon, station_active: true })
    } else {
      // onlyMaxBattles with no expressible battle condition = "any active
      // battle" — the battle part stays residual, but liveness still narrows.
      clauses.push({ station_active: true })
    }
  }

  if (onlyGmaxStationed)
    clauses.push({ stationed_gmax: true, station_active: true })

  // Nothing narrowable set: still only active stations can ever render.
  return clauses.length ? clauses : [{ station_active: true }]
}

module.exports = { buildStationDnfFilters }
