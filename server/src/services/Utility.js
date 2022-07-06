const getPolyVector = require('./functions/getPolyVector')
const getPlacementCells = require('./functions/getPlacementCells')
const getTypeCells = require('./functions/getTypeCells')
const buildDefaultFilters = require('./defaultFilters/buildDefaultFilters')
const primaryUi = require('./ui/primary')
const advMenus = require('./ui/advMenus')
const clientOptions = require('./ui/clientOptions')
const dbSelection = require('./functions/dbSelection')
const webhook = require('./ui/webhook')
const geocoder = require('./geocoder')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')
const evalWebhookId = require('./functions/evalWebhookId')

module.exports = class Utility {
  static getPolyVector(...args) {
    return getPolyVector(...args)
  }

  static getPlacementCells(...args) {
    return getPlacementCells(...args)
  }

  static getTypeCells(...args) {
    return getTypeCells(...args)
  }

  static buildDefaultFilters(...args) {
    return buildDefaultFilters(...args)
  }

  static buildPrimaryUi(...args) {
    return primaryUi(...args)
  }

  static buildAdvMenus(...args) {
    return advMenus(...args)
  }

  static buildClientOptions(...args) {
    return clientOptions(...args)
  }

  static dbSelection(...args) {
    return dbSelection(...args)
  }

  static webhookUi(...args) {
    return webhook(...args)
  }

  static async geocoder(...args) {
    return geocoder(...args)
  }

  static areaPerms(...args) {
    return areaPerms(...args)
  }

  static webhookPerms(...args) {
    return webhookPerms(...args)
  }

  static scannerPerms(...args) {
    return scannerPerms(...args)
  }

  static mergePerms(existingPerms, incomingPerms = {}) {
    return mergePerms(existingPerms, incomingPerms)
  }

  static evalWebhookId(...args) {
    return evalWebhookId(...args)
  }
}
