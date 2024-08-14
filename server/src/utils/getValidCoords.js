// @ts-check
const config = require('@rm/config')

const { filterRTree } = require('./filterRTree')

/**
 *
 * @param {'scanNext' | 'scanZone'} mode
 * @param {[number, number][]} points
 * @param {import('@rm/types').Permissions} perms
 */
function getValidCoords(mode, points, perms) {
  if (perms?.scanner?.includes(mode) && points?.length) {
    const configString =
      mode === 'scanNext'
        ? 'scanner.scanNext.scanNextAreaRestriction'
        : 'scanner.scanZone.scanZoneAreaRestriction'
    const areaRestrictions = config.getSafe(configString) || []

    const validPoints = points.map((point) =>
      filterRTree(
        { lat: point[0], lon: point[1] },
        perms.areaRestrictions,
        areaRestrictions,
      ),
    )
    return validPoints
  }
  return []
}

module.exports = {
  getValidCoords,
}
