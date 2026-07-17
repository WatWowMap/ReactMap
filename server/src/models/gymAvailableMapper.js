// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/gym/available` response. Reproduces the
 * key output of the SQL `Gym.getAvailable` (t/g/e/r + boss `<id>-<form>`).
 * Dependency-free so it can run under plain node for golden checks.
 * @param {{ teams?: {team_id:number,available_slots:number,count:number}[], raids?: {raid_level:number,pokemon_id:number,form:number,count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapGymAvailable(api) {
  const available = new Set()

  const teams = api.teams || []
  teams.forEach((t) => {
    if (t.team_id === null || t.available_slots === null) return
    available.add(`t${t.team_id}-0`)
    available.add(`g${t.team_id}-${6 - t.available_slots}`)
  })

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
