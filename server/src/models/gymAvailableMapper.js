// @ts-check

/**
 * Pure mapper for Golbat's gym availability. Reproduces the dynamic raid keys
 * of the SQL `Gym.getAvailable` (e/r + boss `<id>-<form>`); team/slot (t/g)
 * keys are generated statically by buildGyms, so Golbat no longer returns them.
 * Dependency-free so it can run under plain node for golden checks.
 * @param {{ raids?: {raid_level:number,pokemon_id:number,form:number,count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapGymAvailable(api) {
  const available = new Set()

  const raids = api.raids || []
  const raidLevels = new Set()
  raids.forEach((r) => {
    if (!r.raid_level) return
    raidLevels.add(r.raid_level)
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
