// @ts-check
const config = require('@rm/config')

/**
 * @param {Record<string, import('@rm/types').RMGeoJSON>} scanAreas
 * @returns {{
 *   keyDomainMap: Record<string, string>,
 *   parentKeyMap: Record<string, string[]>,
 *   scopedParentKeyMap: Record<string, string[]>,
 * }}
 */
function getAreaMaps(scanAreas) {
  return Object.entries(scanAreas).reduce(
    (acc, [domain, featureCollection]) => {
      featureCollection.features.forEach((feature) => {
        const { key, parent } = feature.properties
        if (!key) return

        acc.keyDomainMap[key] = domain

        if (!parent) return

        if (!acc.parentKeyMap[parent]) acc.parentKeyMap[parent] = []
        acc.parentKeyMap[parent].push(key)

        const scopedKey = `${domain}:${parent}`
        if (!acc.scopedParentKeyMap[scopedKey]) {
          acc.scopedParentKeyMap[scopedKey] = []
        }
        acc.scopedParentKeyMap[scopedKey].push(key)
      })
      return acc
    },
    /** @type {{
     *   keyDomainMap: Record<string, string>,
     *   parentKeyMap: Record<string, string[]>,
     *   scopedParentKeyMap: Record<string, string[]>,
     * }} */ ({
      keyDomainMap: {},
      parentKeyMap: {},
      scopedParentKeyMap: {},
    }),
  )
}

/**
 * Resolves config entries into canonical area keys.
 * `parent` rules expand to both the parent's own area key and all child keys.
 *
 * @param {string[]} perms
 * @param {string | undefined} target
 * @param {{
 *   names: Set<string>,
 *   scanAreasObj: Record<string, import('@rm/types').RMFeature>,
 *   withoutParents: Record<string, string[]>,
 * }} areas
 * @param {ReturnType<typeof getAreaMaps>} areaMaps
 * @param {boolean} [includeChildren]
 */
function pushAreaKeys(perms, target, areas, areaMaps, includeChildren = false) {
  if (!target) return

  if (areas.names.has(target)) {
    perms.push(target)

    if (includeChildren) {
      const parentName = areas.scanAreasObj[target]?.properties?.name
      const domain = areaMaps.keyDomainMap[target]
      const scopedKey =
        parentName && domain ? `${domain}:${parentName}` : undefined

      if (scopedKey && areaMaps.scopedParentKeyMap[scopedKey]) {
        perms.push(...areaMaps.scopedParentKeyMap[scopedKey])
      }
    }
  }

  if (areas.withoutParents[target]) {
    perms.push(...areas.withoutParents[target])
  }

  if (includeChildren && areaMaps.parentKeyMap[target]) {
    perms.push(...areaMaps.parentKeyMap[target])
  }
}

/**
 * @param {string[]} roles
 * @returns {string[]}
 */
function areaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')
  const areaMaps = getAreaMaps(areas.scanAreas)

  const perms = []
  for (let i = 0; i < roles.length; i += 1) {
    for (let j = 0; j < areaRestrictions.length; j += 1) {
      if (!areaRestrictions[j].roles.includes(roles[i])) continue

      const hasAreas = Array.isArray(areaRestrictions[j].areas)
        ? areaRestrictions[j].areas.length > 0
        : false
      const hasParents = Array.isArray(areaRestrictions[j].parent)
        ? areaRestrictions[j].parent.length > 0
        : false

      // No areas/parents means unrestricted access
      if (!hasAreas && !hasParents) return []

      if (hasAreas) {
        for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
          pushAreaKeys(perms, areaRestrictions[j].areas[k], areas, areaMaps)
        }
      }

      if (hasParents) {
        for (let k = 0; k < areaRestrictions[j].parent.length; k += 1) {
          pushAreaKeys(
            perms,
            areaRestrictions[j].parent[k],
            areas,
            areaMaps,
            true,
          )
        }
      }
    }
  }
  return [...new Set(perms)]
}

module.exports = { areaPerms }
