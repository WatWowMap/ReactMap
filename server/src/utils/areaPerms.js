// @ts-check
const config = require('@rm/config')

/**
 * @param {string[]} roles
 * @returns {string[]}
 */
function areaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')

  // Map parent names to child keys for easy lookup when parent-based restrictions are used.
  const parentKeyMap = Object.values(areas.scanAreasObj).reduce(
    (acc, feature) => {
      const { parent } = feature.properties
      if (!parent) return acc
      if (!acc[parent]) acc[parent] = []
      acc[parent].push(feature.properties.key)
      return acc
    },
    /** @type {Record<string, string[]>} */ ({}),
  )

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
          const target = areaRestrictions[j].areas[k]
          if (areas.names.has(target)) {
            perms.push(target)
          } else if (areas.withoutParents[target]) {
            perms.push(...areas.withoutParents[target])
          }
        }
      }

      if (hasParents) {
        for (let k = 0; k < areaRestrictions[j].parent.length; k += 1) {
          const parent = areaRestrictions[j].parent[k]
          // If the parent itself exists as a top-level area, allow it too.
          if (areas.names.has(parent)) perms.push(parent)
          if (parentKeyMap[parent]) perms.push(...parentKeyMap[parent])
        }
      }
    }
  }
  return [...new Set(perms)]
}

module.exports = { areaPerms }
