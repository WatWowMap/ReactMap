const getPolyVector = require('./functions/getPolyVector')
const getPlacementCells = require('./functions/getPlacementCells')
const getTypeCells = require('./functions/getTypeCells')
const buildDefaultFilters = require('./defaultFilters/buildDefaultFilters')
const updateAvailableForms = require('./functions/updateAvailableForms')

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

  static async updateAvailableForms(icons) {
    return updateAvailableForms(icons)
  }

  static async buildDefaultFilters() {
    return buildDefaultFilters()
  }
}

module.exports = Utility
