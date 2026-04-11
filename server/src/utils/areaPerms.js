// @ts-check
const config = require('@rm/config')

const NO_ACCESS_SENTINEL = '__rm_no_access__'
const UNRESTRICTED_ACCESS_SENTINEL = '__rm_unrestricted__'
const AREA_ACCESS_PREFIX = '__rm_area__:'
const PARENT_ACCESS_PREFIX = '__rm_parent__:'
const AREA_SCOPE_PREFIX = '__rm_scope__:'

/**
 * @param {string} area
 * @returns {boolean}
 */
function isAreaGrant(area) {
  return area.startsWith(AREA_ACCESS_PREFIX)
}

/**
 * @param {string} areaOrDomain
 * @param {string} [area]
 * @returns {string}
 */
function encodeAreaGrant(areaOrDomain, area) {
  return `${AREA_ACCESS_PREFIX}${JSON.stringify(
    area ? { domain: areaOrDomain, area } : { area: areaOrDomain },
  )}`
}

/**
 * @param {string} area
 * @returns {{ domain?: string, area: string }}
 */
function decodeAreaGrant(area) {
  return JSON.parse(area.slice(AREA_ACCESS_PREFIX.length))
}

/**
 * @param {string} area
 * @returns {boolean}
 */
function isParentAreaGrant(area) {
  return area.startsWith(PARENT_ACCESS_PREFIX)
}

/**
 * @param {string} areaOrDomain
 * @param {string} [area]
 * @returns {string}
 */
function encodeParentAreaGrant(areaOrDomain, area) {
  return `${PARENT_ACCESS_PREFIX}${JSON.stringify(
    area ? { domain: areaOrDomain, area } : { area: areaOrDomain },
  )}`
}

/**
 * @param {string} area
 * @returns {{ domain?: string, area: string }}
 */
function decodeParentAreaGrant(area) {
  return JSON.parse(area.slice(PARENT_ACCESS_PREFIX.length))
}

/**
 * @param {string} area
 * @returns {boolean}
 */
function isAreaScope(area) {
  return area.startsWith(AREA_SCOPE_PREFIX)
}

/**
 * @param {string} domain
 * @returns {string}
 */
function encodeAreaScope(domain) {
  return `${AREA_SCOPE_PREFIX}${JSON.stringify({ domain })}`
}

/**
 * @param {string} area
 * @returns {{ domain: string }}
 */
function decodeAreaScope(area) {
  return JSON.parse(area.slice(AREA_SCOPE_PREFIX.length))
}

/**
 * @param {string[]} [areaRestrictions]
 * @returns {string[]}
 */
function getPublicAreaRestrictions(areaRestrictions = []) {
  return areaRestrictions.filter(
    (area) =>
      area !== NO_ACCESS_SENTINEL &&
      area !== UNRESTRICTED_ACCESS_SENTINEL &&
      !isAreaGrant(area) &&
      !isParentAreaGrant(area) &&
      !isAreaScope(area),
  )
}

function hasUnrestrictedAreaGrant(areaRestrictions = []) {
  return areaRestrictions.includes(UNRESTRICTED_ACCESS_SENTINEL)
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
 * @param {import('express').Request} [req]
 */
function getRestrictionAreas(req) {
  if (!req) return config.getSafe('areas')

  const scanAreas = config.getAreas(req, 'scanAreas')
  const scanAreasObj = Object.fromEntries(
    scanAreas.features
      .filter((feature) => feature.properties.key)
      .map((feature) => [feature.properties.key, feature]),
  )
  const names = new Set()
  /** @type {Record<string, string[]>} */
  const withoutParents = {}

  scanAreas.features.forEach((feature) => {
    const { key, manual, name } = feature.properties

    if (
      !key ||
      !name ||
      manual ||
      !feature.geometry?.type?.includes('Polygon')
    ) {
      return
    }

    names.add(key)
    if (!withoutParents[name]) {
      withoutParents[name] = []
    }
    withoutParents[name].push(key)
  })

  return {
    names,
    scanAreas: { current: scanAreas },
    scanAreasObj,
    withoutParents,
  }
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function getRequestAreaDomain(req) {
  const domain = req.headers.host.replaceAll('.', '_')
  const location = `areas.scanAreas.${domain}`
  return typeof config.has === 'function' && config.has(location)
    ? domain
    : 'main'
}

/**
 * @param {string[]} perms
 * @param {string[]} areaKeys
 * @param {{
 *   scanAreasObj: Record<string, import('@rm/types').RMFeature>,
 * }} areas
 * @param {import('express').Request} req
 */
function pushRequestScopedAreaGrants(perms, areaKeys, areas, req) {
  const domain = getRequestAreaDomain(req)

  areaKeys.forEach((key) => {
    if (areas.scanAreasObj[key]) {
      perms.push(encodeAreaGrant(domain, key))
    }
  })
}

/**
 * Resolves config entries into canonical area keys.
 * `parent` rules expand to visible child keys and only fall back to the
 * parent's own area key when no visible children are available.
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
 * @param {'auto' | 'key' | 'label'} [lookupMode]
 */
function pushAreaKeys(
  perms,
  target,
  areas,
  areaMaps,
  includeChildren = false,
  lookupMode = 'auto',
) {
  if (!target) return

  const allowCanonicalLookup = lookupMode !== 'label'
  const allowLabelLookup = lookupMode !== 'key'
  const targetFeature = allowCanonicalLookup ? areas.scanAreasObj[target] : null
  const isCanonicalTarget = targetFeature?.properties?.key === target

  if (isCanonicalTarget) {
    if (includeChildren && !targetFeature?.properties?.parent) {
      const parentName = targetFeature?.properties?.name
      const domain =
        areaMaps.keyDomainsMap[target]?.length === 1
          ? areaMaps.keyDomainsMap[target][0]
          : undefined
      const scopedKey =
        parentName && domain ? `${domain}:${parentName}` : undefined
      const scopedChildren = scopedKey
        ? areaMaps.scopedParentKeyMap[scopedKey] || []
        : []

      if (scopedChildren.length) {
        perms.push(...scopedChildren)
      } else {
        perms.push(target)
      }
    } else {
      perms.push(target)
    }
  }

  const nameMatches = allowLabelLookup ? areas.withoutParents[target] || [] : []
  const visibleNameMatches = nameMatches.filter(
    (key) => !areas.scanAreasObj[key]?.properties?.hidden,
  )
  const directNameMatches = includeChildren ? visibleNameMatches : nameMatches
  if (
    !isCanonicalTarget &&
    directNameMatches.length &&
    (!includeChildren || !areaMaps.parentDomainsMap[target]?.length)
  ) {
    perms.push(...directNameMatches)
  }

  if (
    allowLabelLookup &&
    !includeChildren &&
    !directNameMatches.length &&
    areaMaps.parentDomainsMap[target]?.length === 1
  ) {
    const scopedKey = `${areaMaps.parentDomainsMap[target][0]}:${target}`
    if (!areaMaps.scopedParentAreaKeyMap[scopedKey]) {
      perms.push(...(areaMaps.scopedParentKeyMap[scopedKey] || []))
    }
  }

  // Bare parent names are ambiguous across multi-domain configs, so only
  // expand children when the parent label resolves to exactly one domain.
  if (
    allowLabelLookup &&
    includeChildren &&
    areaMaps.parentDomainsMap[target]?.length === 1
  ) {
    const scopedKey = `${areaMaps.parentDomainsMap[target][0]}:${target}`
    const scopedChildren = areaMaps.scopedParentKeyMap[scopedKey] || []
    if (scopedChildren.length) {
      perms.push(...scopedChildren)
    } else if (areaMaps.scopedParentAreaKeyMap[scopedKey]) {
      perms.push(areaMaps.scopedParentAreaKeyMap[scopedKey])
    }
  }
}

/**
 * @param {string | undefined} target
 * @param {{
 *   names: Set<string>,
 *   scanAreasObj: Record<string, import('@rm/types').RMFeature>,
 *   withoutParents: Record<string, string[]>,
 * }} areas
 * @param {ReturnType<typeof getAreaMaps>} areaMaps
 * @param {boolean} [includeChildren]
 * @returns {'key' | 'label' | 'none'}
 */
function getAreaLookupMode(target, areas, areaMaps, includeChildren = false) {
  if (!target) {
    return 'none'
  }

  if (areas.scanAreasObj[target]) {
    return 'key'
  }

  const resolved = []
  pushAreaKeys(resolved, target, areas, areaMaps, includeChildren, 'label')
  return resolved.length ? 'label' : 'none'
}

/**
 * Preserve legacy grouped parent names that still live under the `areas`
 * config key, while keeping the direct parent polygon available when the
 * target is also a canonical area key.
 *
 * @param {string | undefined} target
 * @param {{
 *   names: Set<string>,
 *   scanAreasObj: Record<string, import('@rm/types').RMFeature>,
 *   withoutParents: Record<string, string[]>,
 * }} areas
 * @param {ReturnType<typeof getAreaMaps>} areaMaps
 * @returns {boolean}
 */
function shouldUseParentGrantForLegacyArea(target, areas, areaMaps) {
  if (!target || !areas.scanAreasObj[target]) {
    return false
  }

  const labelResolved = []
  pushAreaKeys(labelResolved, target, areas, areaMaps, true, 'label')
  const uniqueLabelResolved = [...new Set(labelResolved)]

  return (
    !!uniqueLabelResolved.length &&
    (uniqueLabelResolved.length !== 1 || uniqueLabelResolved[0] !== target)
  )
}

/**
 * @param {string[]} roles
 * @param {import('express').Request} [req]
 * @param {boolean} [serializeScopedGrants]
 * @returns {{ areaRestrictions: string[], hasUnrestrictedGrant: boolean }}
 */
function resolveAreaPerms(roles, req, serializeScopedGrants = false) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const globalAreas = getRestrictionAreas()
  const globalAreaMaps = getAreaMaps(globalAreas.scanAreas)
  const requestAreas = req ? getRestrictionAreas(req) : globalAreas
  const requestAreaMaps = req
    ? getAreaMaps(requestAreas.scanAreas)
    : globalAreaMaps

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
        return {
          areaRestrictions: [UNRESTRICTED_ACCESS_SENTINEL],
          hasUnrestrictedGrant: true,
        }
      }

      matchedRestrictedRule = true

      if (hasAreas) {
        for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
          const areaTarget = areaRestrictions[j].areas[k]
          const areaLookupMode =
            !!req && serializeScopedGrants
              ? getAreaLookupMode(
                  areaTarget,
                  requestAreas,
                  requestAreaMaps,
                  false,
                )
              : undefined
          const usesGlobalAreaLookup =
            !req || globalAreas.scanAreasObj[areaTarget]
          const shouldSerializeScopedAreaGrant =
            !!req &&
            serializeScopedGrants &&
            (areaLookupMode === 'label' ||
              !usesGlobalAreaLookup ||
              globalAreaMaps.keyDomainsMap[areaTarget]?.length > 1)
          const shouldSerializeLegacyParentGrant =
            !!req &&
            serializeScopedGrants &&
            shouldUseParentGrantForLegacyArea(
              areaTarget,
              requestAreas,
              requestAreaMaps,
            )

          if (shouldSerializeLegacyParentGrant) {
            perms.push(
              encodeParentAreaGrant(
                req ? getRequestAreaDomain(req) : '',
                areaTarget,
              ),
            )
          } else if (shouldSerializeScopedAreaGrant) {
            perms.push(
              encodeAreaGrant(req ? getRequestAreaDomain(req) : '', areaTarget),
            )
          } else {
            pushAreaKeys(
              perms,
              areaTarget,
              usesGlobalAreaLookup ? globalAreas : requestAreas,
              usesGlobalAreaLookup ? globalAreaMaps : requestAreaMaps,
              false,
            )
          }
        }
      }

      if (hasParents) {
        for (let k = 0; k < areaRestrictions[j].parent.length; k += 1) {
          if (serializeScopedGrants) {
            perms.push(
              encodeParentAreaGrant(
                req ? getRequestAreaDomain(req) : '',
                areaRestrictions[j].parent[k],
              ),
            )
          } else if (req) {
            pushAreaKeys(
              perms,
              areaRestrictions[j].parent[k],
              requestAreas,
              requestAreaMaps,
              true,
            )
          } else {
            perms.push(encodeParentAreaGrant(areaRestrictions[j].parent[k]))
          }
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
 * @param {import('express').Request} [req]
 * @returns {string[]}
 */
function normalizeAreaRestrictions(areaRestrictions, req) {
  const safeAreaRestrictions = areaRestrictions || []
  const authentication = config.getSafe('authentication')
  const hasImplicitUnrestrictedGrant =
    !!req &&
    !safeAreaRestrictions.length &&
    (!authentication.areaRestrictions.length ||
      !authentication.strictAreaRestrictions)

  if (
    hasUnrestrictedAreaGrant(safeAreaRestrictions) ||
    hasImplicitUnrestrictedGrant
  ) {
    return req
      ? [
          UNRESTRICTED_ACCESS_SENTINEL,
          encodeAreaScope(getRequestAreaDomain(req)),
        ]
      : [UNRESTRICTED_ACCESS_SENTINEL]
  }

  const globalAreas = getRestrictionAreas()
  const globalAreaMaps = getAreaMaps(globalAreas.scanAreas)
  const requestAreas = req ? getRestrictionAreas(req) : globalAreas
  const requestAreaMaps = req
    ? getAreaMaps(requestAreas.scanAreas)
    : globalAreaMaps
  const normalized = []

  safeAreaRestrictions.forEach((area) => {
    if (isAreaGrant(area)) {
      if (req) {
        const areaGrant = decodeAreaGrant(area)
        if (areaGrant.domain && areaGrant.domain !== getRequestAreaDomain(req))
          return

        const resolvedAreaKeys = []

        normalized.push(area)
        pushAreaKeys(
          resolvedAreaKeys,
          areaGrant.area,
          requestAreas,
          requestAreaMaps,
          false,
        )
        normalized.push(...resolvedAreaKeys)
        pushRequestScopedAreaGrants(
          normalized,
          resolvedAreaKeys,
          requestAreas,
          req,
        )
      } else {
        normalized.push(area)
      }
      return
    }

    if (isParentAreaGrant(area)) {
      if (req) {
        const parentGrant = decodeParentAreaGrant(area)
        if (
          parentGrant.domain &&
          parentGrant.domain !== getRequestAreaDomain(req)
        )
          return

        normalized.push(area)
        const resolvedAreaKeys = []
        pushAreaKeys(
          resolvedAreaKeys,
          parentGrant.area,
          requestAreas,
          requestAreaMaps,
          true,
        )
        normalized.push(...resolvedAreaKeys)
        pushRequestScopedAreaGrants(
          normalized,
          resolvedAreaKeys,
          requestAreas,
          req,
        )
      } else {
        normalized.push(area)
      }
      return
    }

    const usesGlobalAreaLookup = !req
    const resolvedAreaKeys = []

    pushAreaKeys(
      resolvedAreaKeys,
      area,
      usesGlobalAreaLookup ? globalAreas : requestAreas,
      usesGlobalAreaLookup ? globalAreaMaps : requestAreaMaps,
      false,
      'key',
    )
    normalized.push(...resolvedAreaKeys)
    if (req) {
      pushRequestScopedAreaGrants(
        normalized,
        resolvedAreaKeys,
        requestAreas,
        req,
      )
    }
  })

  const uniquePerms = [...new Set(normalized)]
  return uniquePerms.length
    ? uniquePerms
    : safeAreaRestrictions.length
      ? [NO_ACCESS_SENTINEL]
      : uniquePerms
}

/**
 * @param {string[]} roles
 * @param {import('express').Request} [req]
 * @param {boolean} [serializeScopedGrants]
 * @returns {string[]}
 */
function areaPerms(roles, req, serializeScopedGrants = false) {
  return resolveAreaPerms(roles, req, serializeScopedGrants).areaRestrictions
}

module.exports = {
  areaPerms,
  decodeAreaGrant,
  decodeAreaScope,
  decodeParentAreaGrant,
  getPublicAreaRestrictions,
  hasUnrestrictedAreaGrant,
  isAreaGrant,
  isAreaScope,
  isParentAreaGrant,
  NO_ACCESS_SENTINEL,
  UNRESTRICTED_ACCESS_SENTINEL,
  normalizeAreaRestrictions,
  resolveAreaPerms,
}
