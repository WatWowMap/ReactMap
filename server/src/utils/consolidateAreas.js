// @ts-check
const config = require('@rm/config')

/**
 * Consolidate area restrictions and user set areas, accounts for parents
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {Set<string>}
 */
function consolidateAreas(areaRestrictions = [], onlyAreas = []) {
  const areas = config.getSafe('areas')
  const parentRefsByChildKey = Object.values(areas.scanAreas).reduce(
    (acc, featureCollection) => {
      const parentKeysByName = Object.fromEntries(
        featureCollection.features
          .filter(
            (feature) =>
              !feature.properties.parent &&
              feature.properties.name &&
              feature.properties.key,
          )
          .map((feature) => [feature.properties.name, feature.properties.key]),
      )

      featureCollection.features.forEach((feature) => {
        if (feature.properties.key && feature.properties.parent) {
          if (!acc[feature.properties.key]) {
            acc[feature.properties.key] = []
          }
          acc[feature.properties.key].push(feature.properties.parent)
          if (parentKeysByName[feature.properties.parent]) {
            acc[feature.properties.key].push(
              parentKeysByName[feature.properties.parent],
            )
          }
        }
      })
      return acc
    },
    /** @type {Record<string, string[]>} */ ({}),
  )
  const validAreaRestrictions = areaRestrictions.filter((a) =>
    areas.names.has(a),
  )
  const validUserAreas = onlyAreas.filter((a) => areas.names.has(a))

  const cleanedValidUserAreas = validUserAreas.filter((area) =>
    areaRestrictions.length
      ? areaRestrictions.includes(area) ||
        (parentRefsByChildKey[area] || []).some((parentRef) =>
          areaRestrictions.includes(parentRef),
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
