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
  const parentKeysByChildKey = Object.values(areas.scanAreas).reduce(
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
            acc[feature.properties.key] = new Set()
          }
          if (parentKeysByName[feature.properties.parent]) {
            acc[feature.properties.key].add(
              parentKeysByName[feature.properties.parent],
            )
          }
        }
      })
      return acc
    },
    /** @type {Record<string, Set<string>>} */ ({}),
  )
  const parentNamesByChildKey = Object.values(areas.scanAreas).reduce(
    (acc, featureCollection) => {
      featureCollection.features.forEach((feature) => {
        if (feature.properties.key && feature.properties.parent) {
          if (!acc[feature.properties.key]) {
            acc[feature.properties.key] = new Set()
          }
          acc[feature.properties.key].add(feature.properties.parent)
        }
      })
      return acc
    },
    /** @type {Record<string, Set<string>>} */ ({}),
  )
  const validAreaRestrictions = areaRestrictions.filter((a) =>
    areas.names.has(a),
  )
  const validUserAreas = onlyAreas.filter((a) => areas.names.has(a))
  const getUniqueValue = (values) =>
    values?.size === 1 ? values.values().next().value : ''

  const cleanedValidUserAreas = validUserAreas.filter((area) =>
    areaRestrictions.length
      ? (() => {
          const parentKey = getUniqueValue(parentKeysByChildKey[area])
          const parentName = parentKey
            ? getUniqueValue(parentNamesByChildKey[area])
            : ''
          return (
            areaRestrictions.includes(area) ||
            (!!parentKey && areaRestrictions.includes(parentKey)) ||
            (!!parentName && areaRestrictions.includes(parentName))
          )
        })()
      : true,
  )
  return new Set(
    validUserAreas.length ? cleanedValidUserAreas : validAreaRestrictions,
  )
}

module.exports = { consolidateAreas }
