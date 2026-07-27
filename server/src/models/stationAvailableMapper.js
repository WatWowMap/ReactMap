// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/station/available` response. Reproduces the
 * key output of the SQL `Station.getAvailable`: `j{level}` battle-tier keys and
 * `<pokemon_id>-<form>` battle-pokemon keys. Dependency-free (golden-testable
 * under plain node).
 * @param {{ battles?: {battle_level:number, pokemon_id:number|null, form:number|null, count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapStationAvailable(api) {
  const available = new Set()
  const battles = api.battles || []
  battles.forEach((b) => {
    if (!b.battle_level) return
    // A battle whose boss isn't known yet arrives with a null (Golbat) or 0
    // pokemon_id; publishing `null-null`/`0-0` injects a bogus Pokémon into the
    // masterfile/filter catalog that no station marker can match. Only advertise
    // a boss key once it's known (Number() coerces null/undefined → NaN → false).
    if (Number(b.pokemon_id) > 0) available.add(`${b.pokemon_id}-${b.form}`)
    available.add(`j${b.battle_level}`)
  })
  return { available: [...available] }
}

module.exports = { mapStationAvailable }
