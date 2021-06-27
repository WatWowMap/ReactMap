import getAllDevices from './queries/device'
import * as gymIndex from './queries/gym'
import * as pokestopIndex from './queries/pokestop'
import * as pokemonIndex from './queries/pokemon'
import getAllSpawnpoints from './queries/spawnpoint'
import getAllPortals from './queries/portal'
import getAllWeather from './queries/weather'
import getAllScanCells from './queries/scanCell'
import getAllSubmissionCells from './queries/submissionCells'
import { getOne, getAllNests } from './queries/nest'
import getAllScanAreas from './queries/scanAreas'
import * as searchIndex from './queries/search'

class Query {
  static devices() {
    return getAllDevices
  }

  static gyms(filters, perms) {
    if (filters === 'id') {
      return gymIndex.getOne
    }
    const permObj = {
      Gyms: filters.raids ? filters.gyms || perms.gyms : filters.gyms && perms.gyms,
      Raids: filters.raids && perms.raids,
    }
    let query = 'get'
    Object.keys(permObj).forEach(keyPerm => {
      if (permObj[keyPerm]) query += keyPerm
    })
    if (query === 'get'
      && (filters.exEligible || filters.inBattle || filters.arEligible)) {
      query += 'Gyms'
    }

    return gymIndex[query]
  }

  static nests(filters) {
    if (filters === 'id') {
      return getOne
    }
    return getAllNests
  }

  static pokestops(filters, perms) {
    if (filters === 'id') {
      return pokestopIndex.getOne
    }
    const permObj = {
      Lures: filters.lures && perms.lures,
      Quests: filters.quests && perms.quests,
      Invasions: filters.invasions && perms.invasions,
    }
    let query = 'get'

    Object.keys(permObj).forEach(keyPerm => {
      if (permObj[keyPerm]) query += keyPerm
    })

    if (query === 'get') query += 'Pokestops'
    return pokestopIndex[query]
  }

  static pokemon(filters, perms) {
    if (filters === 'id') {
      return pokemonIndex.getOne
    }
    const permObj = {
      Ivs: perms.iv,
      Stats: perms.stats,
      Pvp: perms.pvp,
    }
    let query = 'get'

    Object.keys(permObj).forEach(keyPerm => {
      if (permObj[keyPerm]) query += keyPerm
    })
    if (query === 'get') query += 'Pokemon'

    return pokemonIndex[query]
  }

  static portals() {
    return getAllPortals
  }

  static scanCells() {
    return getAllScanCells
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

  static scanAreas() {
    return getAllScanAreas
  }

  static search(category) {
    switch (category) {
      default: return searchIndex.poi
      case 'raids':
      case 'nests':
      case 'quests': return searchIndex[category]
    }
  }
}

export default Query
