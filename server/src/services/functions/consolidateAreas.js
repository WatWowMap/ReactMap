const config = require('../config')

/**
 * Consolidate area restrictions and user set areas, accounts for parents
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {Set<string>}
 */
function consolidateAreas(areaRestrictions = [], onlyAreas = []) {
  const validAreaRestrictions = areaRestrictions.filter((a) =>
    config.areas.names.has(a),
  )
  const validUserAreas = onlyAreas.filter((a) => config.areas.names.has(a))

  const cleanedValidUserAreas = validUserAreas.filter((area) =>
    areaRestrictions.length
      ? areaRestrictions.includes(area) ||
        areaRestrictions.includes(
          config.areas.scanAreasObj[area].properties.parent,
        )
      : true,
  )
  return new Set(
    cleanedValidUserAreas.length
      ? cleanedValidUserAreas
      : validAreaRestrictions,
  )
}

module.exports = { consolidateAreas }
