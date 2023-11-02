// @ts-check
class PoI {
  /**
   * @param {string} id
   * @param {number} lat
   * @param {number} lon
   * @param {boolean} [partner]
   * @param {boolean} [showcase]
   */
  constructor(id, lat, lon, partner = false, showcase = false) {
    this.id = id
    this.lat = lat
    this.lon = lon
    this.partner = partner
    this.showcase = showcase
  }
}

module.exports = PoI
