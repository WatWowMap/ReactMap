const getPolyVector = require('./functions/getPolyVector')
const getPlacementCells = require('./functions/getPlacementCells')
const getTypeCells = require('./functions/getTypeCells')
const buildDefaultFilters = require('./defaultFilters/buildDefaultFilters')
const primaryUi = require('./ui/primary')
const advMenus = require('./ui/advMenus')
const clientOptions = require('./ui/clientOptions')
const fetchJson = require('./functions/fetchJson')
const fetchRaids = require('./functions/fetchRaids')
const fetchQuests = require('./functions/fetchQuests')
const fetchNests = require('./functions/fetchNests')
const dbSelection = require('./functions/dbSelection')

class Utility {
  static getPolyVector(s2cellId, type) {
    return getPolyVector(s2cellId, type)
  }

  static getPlacementCells(bounds, pokestops, gyms) {
    return getPlacementCells(bounds, pokestops, gyms)
  }

  static getTypeCells(bounds, pokestops, gyms) {
    return getTypeCells(bounds, pokestops, gyms)
  }

  static buildDefaultFilters(perms) {
    return buildDefaultFilters(perms)
  }

  static buildPrimaryUi(filters, perms) {
    return primaryUi(filters, perms)
  }

  static buildAdvMenus() {
    return advMenus()
  }

  static buildClientOptions(perms) {
    return clientOptions(perms)
  }

  static async fetchJson(url) {
    return fetchJson(url)
  }

  static async fetchRaids() {
    return fetchRaids()
  }

  static async fetchQuests() {
    return fetchQuests()
  }

  static async fetchNests() {
    return fetchNests()
  }

  static dbSelection(category) {
    return dbSelection(category)
  }
}

module.exports = Utility
