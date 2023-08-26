// @ts-check
class PoI {
  /**
   * @param {string} id
   * @param {number} lat
   * @param {number} lon
   */
  constructor(id, lat, lon) {
    this.id = id
    this.lat = lat
    this.lon = lon
  }
}

module.exports = PoI
