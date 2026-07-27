// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/station/available` response. Reproduces the
 * key output of the SQL `Station.getAvailable`: `j{level}` battle-tier keys and
 * `<pokemon_id>-<form>` battle-pokemon keys. Dependency-free (golden-testable
 * under plain node).
 * @param {{ battles?: {battle_level:number, pokemon_id:number|null, form:number|null}[] }} api
 * @returns {{ available: string[] }}
 */
function mapStationAvailable(api) {
  const available = new Set()
  const battles = api.battles || []
  battles.forEach((b) => {
    if (!b.battle_level) return
    // Golbat sends a null pokemon_id when the boss isn't known yet; publishing
    // `null-null` would inject a bogus Pokémon into the masterfile/filter catalog
    // that no station marker can match. Number(null) is 0 (not NaN), so `> 0`
    // withholds the boss key until it's known; the tier key still ships.
    if (Number(b.pokemon_id) > 0) available.add(`${b.pokemon_id}-${b.form}`)
    available.add(`j${b.battle_level}`)
  })
  return { available: [...available] }
}

module.exports = { mapStationAvailable }
