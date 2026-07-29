// @ts-check

/**
 * Pure mapper for Golbat's gym availability. Reproduces the dynamic raid keys
 * of the SQL `Gym.getAvailable` (e/r + boss `<id>-<form>`); team/slot (t/g)
 * keys are generated statically by buildGyms, so Golbat no longer returns them.
 * Dependency-free so it can run under plain node for golden checks.
 * @param {{ raids?: {raid_level:number,pokemon_id:number|null,form:number|null}[] }} api
 * @returns {{ available: string[] }}
 */
function mapGymAvailable(api) {
  const available = new Set()

  const raids = api.raids || []
  const raidLevels = new Set()
  raids.forEach((r) => {
    if (!r.raid_level) return
    raidLevels.add(r.raid_level)
    // A null pokemon_id is an unhatched egg (`null > 0` is false → egg key);
    // a known boss keeps `<id>-<form>` (form 0 is valid and stays 0).
    if (r.pokemon_id > 0) {
      available.add(`${r.pokemon_id}-${r.form}`)
    } else {
      available.add(`e${r.raid_level}`)
    }
  })
  ;[...raidLevels]
    .sort((a, b) => a - b)
    .forEach((level) => available.add(`r${level}`))

  return { available: [...available] }
}

module.exports = { mapGymAvailable }
