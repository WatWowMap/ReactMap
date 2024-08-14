// @ts-check

/**
 *
 * @param {import("./getClientTime").BoundsEnum} bounds
 * @returns
 */
function getCenter(bounds) {
  return 'lat' in bounds
    ? bounds
    : {
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lon: (bounds.minLon + bounds.maxLon) / 2,
      }
}

module.exports = { getCenter }
