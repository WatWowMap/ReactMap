const getPolyVector = require('./functions/getPolyVector')
const getPlacementCells = require('./functions/getPlacementCells')
const getTypeCells = require('./functions/getTypeCells')
const buildDefaultFilters = require('./defaultFilters/buildDefaultFilters')
const primaryUi = require('./ui/primary')
const advMenus = require('./ui/advMenus')
const clientOptions = require('./ui/clientOptions')
const dbSelection = require('./functions/dbSelection')
const permissions = require('./functions/permissions')
const webhook = require('./ui/webhook')
const geocoder = require('./geocoder')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')

module.exports = class Utility {
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

  static buildAdvMenus(available) {
    return advMenus(available)
  }

  static buildClientOptions(perms) {
    return clientOptions(perms)
  }

  static dbSelection(category) {
    return dbSelection(category)
  }

  static permissions(permToCheck, perms) {
    return permissions(permToCheck, perms)
  }

  static webhookUi(provider, hookConfig, pvp) {
    return webhook(provider, hookConfig, pvp)
  }

  static async geocoder(nominatimUrl, search, reverse) {
    return geocoder(nominatimUrl, search, reverse)
  }

  static areaPerms(roles, provider) {
    return areaPerms(roles, provider)
  }

  static webhookPerms(roles, provider) {
    return webhookPerms(roles, provider)
  }

  static scannerPerms(roles, provider) {
    return scannerPerms(roles, provider)
  }

  static mergePerms(existingPerms, incomingPerms = {}) {
    return mergePerms(existingPerms, incomingPerms)
  }
}
