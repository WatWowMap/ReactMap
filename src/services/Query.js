// @ts-check
import { useMemory } from '@store/useMemory'

import * as gymIndex from './queries/gym'
import * as pokestopIndex from './queries/pokestop'
import * as pokemonIndex from './queries/pokemon'
import * as portalIndex from './queries/portal'
import * as searchIndex from './queries/search'
import * as webhookIndex from './queries/webhook'
import * as user from './queries/user'
import { GET_ALL_DEVICES } from './queries/device'
import { GET_ALL_SPAWNPOINTS } from './queries/spawnpoint'
import { GET_ALL_WEATHER } from './queries/weather'
import { GET_ALL_SCAN_CELLS } from './queries/scanCell'
import { GET_ALL_SUBMISSION_CELLS } from './queries/submissionCells'
import { GET_ONE_NEST, GET_ALL_NESTS, NEST_SUBMISSION } from './queries/nest'
import { GET_ALL_SCAN_AREAS, GET_SCAN_AREAS_MENU } from './queries/scanAreas'
import { S2_CELLS } from './queries/s2cell'
import { GET_ROUTE, GET_ROUTES } from './queries/route'

export class Query {
  /**
   * @param {Record<string, boolean>} object
   * @returns {string}
   */
  static build(object) {
    let query = 'GET'
    Object.entries(object).forEach(([key, value]) => {
      if (value) query += `_${key.toUpperCase()}`
    })
    return query
  }

  static devices() {
    return GET_ALL_DEVICES
  }

  /** @param {import('@rm/types').AllFilters['gyms'] | 'id' | 'badges'} filters */
  static gyms(filters) {
    const perms = useMemory.getState().ui.gyms
    if (filters === 'id') {
      return gymIndex.GET_ONE_GYM
    }
    if (filters === 'badges') {
      return gymIndex.GET_BADGES
    }
    let query = Query.build({
      Gyms: filters.raids
        ? filters.allGyms || perms.allGyms
        : filters.allGyms && perms.allGyms,
      Raids: filters.raids && perms.raids,
    })
    if (
      query === 'GET' &&
      (filters.exEligible ||
        filters.inBattle ||
        filters.arEligible ||
        filters.gymBadges)
    ) {
      query += '_GYMS'
    }

    return gymIndex[query]
  }

  /** @param {import('@rm/types').AllFilters['nests'] | 'id' | 'nestSubmission'} filters */
  static nests(filters) {
    if (filters === 'id') {
      return GET_ONE_NEST
    }
    if (filters === 'nestSubmission') {
      return NEST_SUBMISSION
    }
    return GET_ALL_NESTS
  }

  /** @param {import('@rm/types').AllFilters['pokestops'] | 'id'} filters */
  static pokestops(filters) {
    const perms = useMemory.getState().ui.pokestops
    if (filters === 'id') {
      return pokestopIndex.GET_ONE_POKESTOP
    }
    let query = Query.build({
      Lures: filters.lures && perms.lures,
      Quests: filters.quests && perms.quests,
      Invasions: filters.invasions && perms.invasions,
      Events: filters.eventStops && perms.eventStops,
    })

    if (query === 'GET') query += 'POKESTOPS'
    return pokestopIndex[query]
  }

  /** @param {import('@rm/types').AllFilters['pokemon'] | 'id'} filters */
  static pokemon(filters) {
    const perms = useMemory.getState().ui.pokemon
    if (filters === 'id') {
      return pokemonIndex.GET_ONE_POKEMON
    }
    let query = Query.build({
      Ivs: perms.iv,
      Pvp: perms.pvp,
    })
    if (query === 'GET') query += 'POKEMON'

    return pokemonIndex[query]
  }

  /** @param {import('@rm/types').AllFilters['portals'] | 'id'} filters */
  static portals(filters) {
    if (filters === 'id') {
      return portalIndex.GET_ONE_PORTAL
    }

    return portalIndex.GET_ALL_PORTALS
  }

  static scanCells() {
    return GET_ALL_SCAN_CELLS
  }

  static spawnpoints() {
    return GET_ALL_SPAWNPOINTS
  }

  static submissionCells() {
    return GET_ALL_SUBMISSION_CELLS
  }

  static weather() {
    return GET_ALL_WEATHER
  }

  static scanAreas() {
    return GET_ALL_SCAN_AREAS
  }

  static scanAreasMenu() {
    return GET_SCAN_AREAS_MENU
  }

  /** @param {string} category */
  static search(category) {
    switch (category) {
      case 'lures':
      case 'raids':
      case 'nests':
      case 'quests':
      case 'invasions':
      case 'pokemon':
        return searchIndex[category.toUpperCase()]
      case 'webhook':
        return searchIndex.POI_WEBHOOK
      default:
        return searchIndex.POI
    }
  }

  /** @param {keyof typeof webhookIndex} type */
  static webhook(type) {
    return webhookIndex[type]
  }

  /** @param {keyof typeof user} type */
  static user(type) {
    return user[type]
  }

  static s2cells() {
    return S2_CELLS
  }

  /** @param {import('@rm/types').AllFilters['routes'] | 'getOne'} method */
  static routes(method) {
    if (method === 'getOne') return GET_ROUTE
    return GET_ROUTES
  }
}
