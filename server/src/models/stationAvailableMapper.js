// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/station/available` response. Reproduces the
 * key output of the SQL `Station.getAvailable`: `j{level}` battle-tier keys and
 * `<pokemon_id>-<form>` battle-pokemon keys. Dependency-free (golden-testable
 * under plain node).
 * @param {{ battles?: {battle_level:number, pokemon_id:number, form:number, count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapStationAvailable(api) {
  const available = new Set()
  const battles = api.battles || []
  battles.forEach((b) => {
    if (!b.battle_level) return
    available.add(`${b.pokemon_id}-${b.form}`)
    available.add(`j${b.battle_level}`)
  })
  return { available: [...available] }
}

module.exports = { mapStationAvailable }
