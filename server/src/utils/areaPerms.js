// @ts-check
const config = require('@rm/config')

const NO_ACCESS_SENTINEL = '__rm_no_access__'

/**
 * @param {string[]} [areaRestrictions]
 * @returns {string[]}
 */
function getPublicAreaRestrictions(areaRestrictions = []) {
  return areaRestrictions.filter((area) => area !== NO_ACCESS_SENTINEL)
}

/**
 * @param {Record<string, import('@rm/types').RMGeoJSON>} scanAreas
 * @returns {{
 *   keyDomainsMap: Record<string, string[]>,
 *   parentDomainsMap: Record<string, string[]>,
 *   scopedParentKeyMap: Record<string, string[]>,
 *   scopedParentAreaKeyMap: Record<string, string>,
 * }}
 */
function getAreaMaps(scanAreas) {
  return Object.entries(scanAreas).reduce(
    (acc, [domain, featureCollection]) => {
      /** @type {Record<string, string[]>} */
      const areaKeysByName = {}

      featureCollection.features.forEach((feature) => {
        const { hidden, key, manual, name, parent } = feature.properties
        if (!key) return

        if (!manual) {
          if (!acc.keyDomainsMap[key]) acc.keyDomainsMap[key] = []
          if (!acc.keyDomainsMap[key].includes(domain)) {
            acc.keyDomainsMap[key].push(domain)
          }
        }
        if (name && !parent && !hidden && !manual) {
          if (!areaKeysByName[name]) areaKeysByName[name] = []
          areaKeysByName[name].push(key)
        }
      })

      featureCollection.features.forEach((feature) => {
        const { hidden, key, manual, parent } = feature.properties

        // Hidden children should not widen backend access through parent expansion.
        if (!key || !parent || hidden || manual) return

        const scopedKey = `${domain}:${parent}`
        if (!acc.parentDomainsMap[parent]) acc.parentDomainsMap[parent] = []
        if (!acc.parentDomainsMap[parent].includes(domain)) {
          acc.parentDomainsMap[parent].push(domain)
        }
        if (!acc.scopedParentKeyMap[scopedKey]) {
          acc.scopedParentKeyMap[scopedKey] = []
        }
        acc.scopedParentKeyMap[scopedKey].push(key)

        if (areaKeysByName[parent]?.length === 1) {
          const [parentAreaKey] = areaKeysByName[parent]
          acc.scopedParentAreaKeyMap[scopedKey] = parentAreaKey
        }
      })
      return acc
    },
    /** @type {{
     *   keyDomainsMap: Record<string, string[]>,
     *   parentDomainsMap: Record<string, string[]>,
     *   scopedParentKeyMap: Record<string, string[]>,
     *   scopedParentAreaKeyMap: Record<string, string>,
     * }} */ ({
      keyDomainsMap: {},
      parentDomainsMap: {},
      scopedParentKeyMap: {},
      scopedParentAreaKeyMap: {},
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

  const targetFeature = areas.scanAreasObj[target]
  const isCanonicalTarget = targetFeature?.properties?.key === target

  if (isCanonicalTarget) {
    perms.push(target)

    if (includeChildren && !targetFeature?.properties?.parent) {
      const parentName = targetFeature?.properties?.name
      ;(areaMaps.keyDomainsMap[target] || []).forEach((domain) => {
        const scopedKey = parentName ? `${domain}:${parentName}` : undefined

        if (scopedKey && areaMaps.scopedParentKeyMap[scopedKey]) {
          perms.push(...areaMaps.scopedParentKeyMap[scopedKey])
        }
      })
    }
  }

  const visibleNameMatches = (areas.withoutParents[target] || []).filter(
    (key) => !areas.scanAreasObj[key]?.properties?.hidden,
  )
  if (!isCanonicalTarget && visibleNameMatches.length) {
    perms.push(...visibleNameMatches)
  }

  if (
    !includeChildren &&
    !visibleNameMatches.length &&
    areaMaps.parentDomainsMap[target]?.length === 1
  ) {
    const scopedKey = `${areaMaps.parentDomainsMap[target][0]}:${target}`
    if (!areaMaps.scopedParentAreaKeyMap[scopedKey]) {
      perms.push(...(areaMaps.scopedParentKeyMap[scopedKey] || []))
    }
  }

  // Bare parent names are ambiguous across multi-domain configs, so only
  // expand children when the parent label resolves to exactly one domain.
  if (includeChildren && areaMaps.parentDomainsMap[target]?.length === 1) {
    const scopedKey = `${areaMaps.parentDomainsMap[target][0]}:${target}`
    if (areaMaps.scopedParentAreaKeyMap[scopedKey]) {
      perms.push(areaMaps.scopedParentAreaKeyMap[scopedKey])
    }
    if (areaMaps.scopedParentKeyMap[scopedKey]) {
      perms.push(...areaMaps.scopedParentKeyMap[scopedKey])
    }
  }
}

/**
 * @param {string[]} roles
 * @returns {{ areaRestrictions: string[], hasUnrestrictedGrant: boolean }}
 */
function resolveAreaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')
  const areaMaps = getAreaMaps(areas.scanAreas)

  const perms = []
  let matchedRestrictedRule = false
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
      if (!hasAreas && !hasParents) {
        return { areaRestrictions: [], hasUnrestrictedGrant: true }
      }

      matchedRestrictedRule = true

      if (hasAreas) {
        for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
          pushAreaKeys(
            perms,
            areaRestrictions[j].areas[k],
            areas,
            areaMaps,
            false,
          )
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

  const uniquePerms = [...new Set(perms)]
  return {
    areaRestrictions:
      matchedRestrictedRule && !uniquePerms.length
        ? [NO_ACCESS_SENTINEL]
        : uniquePerms,
    hasUnrestrictedGrant: false,
  }
}

/**
 * @param {string[]} [areaRestrictions]
 * @returns {string[]}
 */
function normalizeAreaRestrictions(areaRestrictions = []) {
  const areas = config.getSafe('areas')
  const areaMaps = getAreaMaps(areas.scanAreas)
  const normalized = []

  areaRestrictions.forEach((area) => {
    pushAreaKeys(normalized, area, areas, areaMaps, false)
  })

  const uniquePerms = [...new Set(normalized)]
  return uniquePerms.length
    ? uniquePerms
    : areaRestrictions.length
      ? [NO_ACCESS_SENTINEL]
      : uniquePerms
}

/**
 * @param {string[]} roles
 * @returns {string[]}
 */
function areaPerms(roles) {
  return resolveAreaPerms(roles).areaRestrictions
}

module.exports = {
  areaPerms,
  getPublicAreaRestrictions,
  NO_ACCESS_SENTINEL,
  normalizeAreaRestrictions,
  resolveAreaPerms,
}
