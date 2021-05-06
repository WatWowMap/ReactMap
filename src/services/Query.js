import getAllDevices from './queries/device'
import * as gymIndex from './queries/gym'
import * as pokestopIndex from './queries/pokestop'
import getAllPokemon from './queries/pokemon'
import getAllSpawnpoints from './queries/spawnpoint'
import getAllPortals from './queries/portal'
import getAllWeather from './queries/weather'
import getAllS2cells from './queries/s2cell'
import getAllSubmissionCells from './queries/submissionCells'

class Query {
  static devices() {
    return getAllDevices
  }

  static gyms(filters, perms) {
    const permObj = {
      Gyms: filters.raids ? filters.gyms || perms.gyms : filters.gyms && perms.gyms,
      Raids: filters.raids && perms.raids,
    }
    let query = 'get'
    Object.keys(permObj).forEach(keyPerm => {
      if (permObj[keyPerm]) query += keyPerm
    })
    if (query === 'get'
    && (filters.exEligible || filters.inBattle)) {
      query += 'Gyms'
    }

    return gymIndex[query]
  }

  static pokestops(filters, perms) {
    const permObj = {
      Lures: filters.lures && perms.lures,
      Quests: filters.quests && perms.quests,
      Invasions: filters.invasions && perms.invasions,
    }
    const allPerms = Object.values(permObj).every(val => val === false)
    let query = 'get'

    Object.keys(permObj).forEach(keyPerm => {
      if (permObj[keyPerm]) query += keyPerm
    })
    if (allPerms) query += 'Pokestops'

    return pokestopIndex[query]
  }

  static pokemon() {
    return getAllPokemon
  }

  static portals() {
    return getAllPortals
  }

  static s2cells() {
    return getAllS2cells
  }

  static spawnpoints() {
    return getAllSpawnpoints
  }

  static submissionCells() {
    return getAllSubmissionCells
  }

  static weather() {
    return getAllWeather
  }
}

export default Query
