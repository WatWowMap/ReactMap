// @ts-check
import { useMemory } from '@store/useMemory'

import getAllDevices from './queries/device'
import * as gymIndex from './queries/gym'
import * as pokestopIndex from './queries/pokestop'
import * as pokemonIndex from './queries/pokemon'
import getAllSpawnpoints from './queries/spawnpoint'
import * as portalIndex from './queries/portal'
import getAllWeather from './queries/weather'
import getAllScanCells from './queries/scanCell'
import getAllSubmissionCells from './queries/submissionCells'
import { getOne, getAllNests, nestSubmission } from './queries/nest'
import { getAllScanAreas, getScanAreasMenu } from './queries/scanAreas'
import * as searchIndex from './queries/search'
import * as webhookIndex from './queries/webhook'
import * as user from './queries/user'
import s2cell from './queries/s2cell'
import { getRoute, getRoutes } from './queries/route'

export class Query {
  static devices() {
    return getAllDevices
  }

  static gyms(filters) {
    const perms = useMemory.getState().ui.gyms
    if (filters === 'id') {
      return gymIndex.getOne
    }
    if (filters === 'badges') {
      return gymIndex.getBadges
    }
    const permObj = {
      Gyms: filters.raids
        ? filters.allGyms || perms.allGyms
        : filters.allGyms && perms.allGyms,
      Raids: filters.raids && perms.raids,
    }
    let query = 'get'
    Object.keys(permObj).forEach((keyPerm) => {
      if (permObj[keyPerm]) query += keyPerm
    })
    if (
      query === 'get' &&
      (filters.exEligible ||
        filters.inBattle ||
        filters.arEligible ||
        filters.gymBadges)
    ) {
      query += 'Gyms'
    }

    return gymIndex[query]
  }

  static nests(filters) {
    if (filters === 'id') {
      return getOne
    }
    if (filters === 'nestSubmission') {
      return nestSubmission
    }
    return getAllNests
  }

  static pokestops(filters) {
    const perms = useMemory.getState().ui.pokestops
    if (filters === 'id') {
      return pokestopIndex.getOne
    }
    const permObj = {
      Lures: filters.lures && perms.lures,
      Quests: filters.quests && perms.quests,
      Invasions: filters.invasions && perms.invasions,
      Events: filters.eventStops && perms.eventStops,
    }
    let query = 'get'

    Object.keys(permObj).forEach((keyPerm) => {
      if (permObj[keyPerm]) query += keyPerm
    })

    if (query === 'get') query += 'Pokestops'
    return pokestopIndex[query]
  }

  static pokemon(filters) {
    const perms = useMemory.getState().ui.pokemon
    if (filters === 'id') {
      return pokemonIndex.getOne
    }
    const permObj = {
      Ivs: perms.iv,
      Pvp: perms.pvp,
    }
    let query = 'get'

    Object.keys(permObj).forEach((keyPerm) => {
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

  static scanAreasMenu() {
    return getScanAreasMenu
  }

  static search(category) {
    switch (category) {
      case 'lures':
      case 'raids':
      case 'nests':
      case 'quests':
      case 'invasions':
      case 'pokemon':
        return searchIndex[category]
      case 'webhook':
        return searchIndex.poiWebhook
      default:
        return searchIndex.poi
    }
  }

  static webhook(type) {
    return webhookIndex[type]
  }

  static user(type) {
    return user[type]
  }

  static s2cells() {
    return s2cell
  }

  static routes(method) {
    if (method === 'getOne') return getRoute
    return getRoutes
  }
}
