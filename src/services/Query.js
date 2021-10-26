import getAllDevices from './queries/device'
import * as gymIndex from './queries/gym'
import * as pokestopIndex from './queries/pokestop'
import * as pokemonIndex from './queries/pokemon'
import getAllSpawnpoints from './queries/spawnpoint'
import * as portalIndex from './queries/portal'
import getAllWeather from './queries/weather'
import getAllS2cells from './queries/s2cell'
import getAllSubmissionCells from './queries/submissionCells'
import { getOne, getAllNests } from './queries/nest'
import getAllScanAreas from './queries/scanAreas'
import * as searchIndex from './queries/search'
import * as webhookIndex from './queries/webhook'
import getGeocoder from './queries/geocoder'

export default class Query {
  static devices() {
    return getAllDevices
  }

  static gyms(filters, perms) {
    if (filters === 'id') {
      return gymIndex.getOne
    }
    const permObj = {
      Gyms: filters.raids ? filters.allGyms || perms.allGyms : filters.allGyms && perms.allGyms,
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

  static portals(filters) {
    if (filters === 'id') {
      return portalIndex.getOne
    }

    return portalIndex.getAllPortals
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

  static scanAreas() {
    return getAllScanAreas
  }

  static search(category) {
    switch (category) {
      case 'raids':
      case 'nests':
      case 'quests': return searchIndex[category]
      case 'webhook': return searchIndex.poiWebhook
      default: return searchIndex.poi
    }
  }

  static webhook(type) {
    return webhookIndex[type]
  }

  static geocoder() {
    return getGeocoder
  }
}
