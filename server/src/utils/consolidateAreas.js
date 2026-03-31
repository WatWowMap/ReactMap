// @ts-check
const config = require('@rm/config')
const {
  decodeAreaGrant,
  decodeParentAreaGrant,
  isAreaGrant,
  isParentAreaGrant,
} = require('./areaPerms')

/**
 * Consolidate area restrictions and user set areas, accounts for parents
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {Set<import('@rm/types').RMFeature>}
 */
function consolidateAreas(areaRestrictions = [], onlyAreas = []) {
  const areas = config.getSafe('areas')
  const featureEntriesByKey = Object.entries(areas.scanAreas).reduce(
    (acc, [domain, featureCollection]) => {
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
        acc[feature.properties.key].push({ domain, feature })
      })
      return acc
    },
    /** @type {Record<string, { domain: string, feature: import('@rm/types').RMFeature }[]>} */ ({}),
  )
  const childFeaturesByKey = Object.entries(areas.scanAreas).reduce(
    (acc, [domain, featureCollection]) => {
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
            domain,
            feature,
            parentKey: parentKeysByName[feature.properties.parent] || '',
            parentName: feature.properties.parent,
          })
        }
      })
      return acc
    },
    /** @type {Record<string, {
     *   domain: string,
     *   feature: import('@rm/types').RMFeature,
     *   parentKey: string,
     *   parentName: string,
     * }[]>} */ ({}),
  )
  const plainAreaRestrictions = areaRestrictions.filter(
    (area) => !isAreaGrant(area) && !isParentAreaGrant(area),
  )
  const scopedAreaDomains = areaRestrictions.reduce((acc, area) => {
    if (!isAreaGrant(area)) {
      return acc
    }
    const areaGrant = decodeAreaGrant(area)
    if (!areaGrant.domain) {
      return acc
    }
    if (!acc[areaGrant.area]) {
      acc[areaGrant.area] = new Set()
    }
    acc[areaGrant.area].add(areaGrant.domain)
    return acc
  }, /** @type {Record<string, Set<string>>} */ ({}))
  const scopedParentDomains = areaRestrictions.reduce((acc, area) => {
    if (!isParentAreaGrant(area)) {
      return acc
    }
    const parentGrant = decodeParentAreaGrant(area)
    if (!parentGrant.domain) {
      return acc
    }
    if (!acc[parentGrant.area]) {
      acc[parentGrant.area] = new Set()
    }
    acc[parentGrant.area].add(parentGrant.domain)
    return acc
  }, /** @type {Record<string, Set<string>>} */ ({}))
  const getScopedDomains = (area) => {
    const scopedDomains = new Set([
      ...(scopedAreaDomains[area] || []),
      ...(scopedParentDomains[area] || []),
    ])

    if (scopedDomains.size) {
      return scopedDomains
    }

    ;(childFeaturesByKey[area] || []).forEach(
      ({ domain, parentKey, parentName }) => {
        const matchingParentDomains = new Set([
          ...(scopedParentDomains[parentKey] || []),
          ...(scopedParentDomains[parentName] || []),
        ])
        if (matchingParentDomains.has(domain)) {
          scopedDomains.add(domain)
        }
      },
    )
    return scopedDomains
  }
  const getDirectFeatures = (area, allowAmbiguous = false) => {
    const featureEntries = featureEntriesByKey[area] || []
    if (!featureEntries.length) {
      return []
    }

    const scopedDomains = getScopedDomains(area)
    if (scopedDomains.size) {
      return featureEntries
        .filter(({ domain }) => scopedDomains.has(domain))
        .map(({ feature }) => feature)
    }

    const distinctDomains = new Set(featureEntries.map(({ domain }) => domain))
    return distinctDomains.size === 1 || allowAmbiguous
      ? featureEntries.map(({ feature }) => feature)
      : []
  }
  const validAreaRestrictions = plainAreaRestrictions.flatMap(getDirectFeatures)
  const validUserAreas = onlyAreas.filter(
    (area) => featureEntriesByKey[area]?.length,
  )

  const cleanedValidUserAreas = validUserAreas.flatMap((area) =>
    areaRestrictions.length
      ? getDirectFeatures(area).length
        ? getDirectFeatures(area)
        : (() => {
            const matchingChildren = (childFeaturesByKey[area] || []).filter(
              ({ domain, parentKey, parentName }) => {
                const scopedDomains = new Set([
                  ...(scopedAreaDomains[parentKey] || []),
                  ...(scopedAreaDomains[parentName] || []),
                  ...(scopedParentDomains[parentKey] || []),
                  ...(scopedParentDomains[parentName] || []),
                ])
                return scopedDomains.size
                  ? scopedDomains.has(domain)
                  : (!!parentKey &&
                      plainAreaRestrictions.includes(parentKey)) ||
                      plainAreaRestrictions.includes(parentName)
              },
            )
            const distinctDomains = new Set(
              matchingChildren.map(({ domain }) => domain),
            )
            return distinctDomains.size === 1
              ? matchingChildren.map(({ feature }) => feature)
              : []
          })()
      : getDirectFeatures(area, true),
  )
  return new Set(
    cleanedValidUserAreas.length
      ? cleanedValidUserAreas
      : validAreaRestrictions,
  )
}

module.exports = { consolidateAreas }
