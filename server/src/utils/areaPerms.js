// @ts-check
const config = require('@rm/config')

/**
 * @param {Record<string, import('@rm/types').RMFeature>} scanAreasObj
 * @returns {Record<string, string[]>}
 */
function getParentKeyMap(scanAreasObj) {
  return Object.values(scanAreasObj).reduce((acc, feature) => {
    const { key, parent } = feature.properties
    if (!parent || !key) return acc
    if (!acc[parent]) acc[parent] = []
    acc[parent].push(key)
    return acc
  }, /** @type {Record<string, string[]>} */ ({}))
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
 * @param {Record<string, string[]>} parentKeyMap
 * @param {boolean} [includeChildren]
 */
function pushAreaKeys(
  perms,
  target,
  areas,
  parentKeyMap,
  includeChildren = false,
) {
  if (!target) return

  if (areas.names.has(target)) {
    perms.push(target)

    if (includeChildren) {
      const parentName = areas.scanAreasObj[target]?.properties?.name
      if (parentName && parentKeyMap[parentName]) {
        perms.push(...parentKeyMap[parentName])
      }
    }
  }

  if (areas.withoutParents[target]) {
    perms.push(...areas.withoutParents[target])
  }

  if (includeChildren && parentKeyMap[target]) {
    perms.push(...parentKeyMap[target])
  }
}

/**
 * @param {string[]} roles
 * @returns {string[]}
 */
function areaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')
  const parentKeyMap = getParentKeyMap(areas.scanAreasObj)

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
          pushAreaKeys(perms, areaRestrictions[j].areas[k], areas, parentKeyMap)
        }
      }

      if (hasParents) {
        for (let k = 0; k < areaRestrictions[j].parent.length; k += 1) {
          pushAreaKeys(
            perms,
            areaRestrictions[j].parent[k],
            areas,
            parentKeyMap,
            true,
          )
        }
      }
    }
  }
  return [...new Set(perms)]
}

module.exports = { areaPerms }
