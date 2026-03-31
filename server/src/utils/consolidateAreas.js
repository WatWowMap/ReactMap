// @ts-check
const config = require('@rm/config')

/**
 * Consolidate area restrictions and user set areas, accounts for parents
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {Set<import('@rm/types').RMFeature>}
 */
function consolidateAreas(areaRestrictions = [], onlyAreas = []) {
  const areas = config.getSafe('areas')
  const featuresByKey = Object.values(areas.scanAreas).reduce(
    (acc, featureCollection) => {
      featureCollection.features.forEach((feature) => {
        if (
          !feature.properties.key ||
          feature.properties.manual ||
          !feature.geometry?.type?.includes('Polygon')
        ) {
          return
        }
        if (!acc[feature.properties.key]) {
          acc[feature.properties.key] = []
        }
        acc[feature.properties.key].push(feature)
      })
      return acc
    },
    /** @type {Record<string, import('@rm/types').RMFeature[]>} */ ({}),
  )
  const childFeaturesByKey = Object.values(areas.scanAreas).reduce(
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
        if (
          feature.properties.key &&
          feature.properties.parent &&
          !feature.properties.manual &&
          feature.geometry?.type?.includes('Polygon')
        ) {
          if (!acc[feature.properties.key]) {
            acc[feature.properties.key] = []
          }
          acc[feature.properties.key].push({
            feature,
            parentKey: parentKeysByName[feature.properties.parent] || '',
            parentName: feature.properties.parent,
          })
        }
      })
      return acc
    },
    /** @type {Record<string, {
     *   feature: import('@rm/types').RMFeature,
     *   parentKey: string,
     *   parentName: string,
     * }[]>} */ ({}),
  )
  const validAreaRestrictions = areaRestrictions.flatMap(
    (area) => featuresByKey[area] || [],
  )
  const validUserAreas = onlyAreas.filter((area) => featuresByKey[area]?.length)

  const cleanedValidUserAreas = validUserAreas.flatMap((area) =>
    areaRestrictions.length
      ? areaRestrictions.includes(area)
        ? featuresByKey[area]
        : (() => {
            const matchingChildren = (childFeaturesByKey[area] || []).filter(
              ({ parentKey, parentName }) =>
                (!!parentKey && areaRestrictions.includes(parentKey)) ||
                areaRestrictions.includes(parentName),
            )
            const distinctParentKeys = new Set(
              matchingChildren
                .map(({ parentKey }) => parentKey)
                .filter(Boolean),
            )
            const distinctParentNames = new Set(
              matchingChildren.map(({ parentName }) => parentName),
            )
            return distinctParentKeys.size <= 1 &&
              distinctParentNames.size === 1
              ? matchingChildren.map(({ feature }) => feature)
              : []
          })()
      : featuresByKey[area],
  )
  return new Set(
    validUserAreas.length ? cleanedValidUserAreas : validAreaRestrictions,
  )
}

module.exports = { consolidateAreas }
