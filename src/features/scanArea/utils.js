// @ts-check

/**
 * @param {import('@rm/types').Config['areas']['scanAreasMenu']} scanAreasMenu
 * @returns {Pick<import('@rm/types').RMFeature, 'properties'>[]}
 */
export function getScanAreaMenuFeatures(scanAreasMenu = []) {
  return scanAreasMenu.flatMap((parent) => [
    ...(parent?.details ? [parent.details] : []),
    ...(parent?.children || []),
  ])
}

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>} feature
 * @param {string[]} [accessibleAreaKeys]
 * @returns {string[]}
 */
export function getAreaKeys(features, feature, accessibleAreaKeys = []) {
  if (!feature?.properties || feature.properties.manual) return []

  const childKeys =
    !feature.properties.parent && feature.properties.name
      ? features
          .filter(
            (child) =>
              !child.properties.manual &&
              child.properties.parent === feature.properties.name &&
              child.properties.key,
          )
          .map((child) => child.properties.key)
      : []

  if (!feature.properties.key) return childKeys

  const areaKeys =
    !accessibleAreaKeys.length ||
    accessibleAreaKeys.includes(feature.properties.key)
      ? [feature.properties.key]
      : []
  return childKeys.length ? [...areaKeys, ...childKeys] : areaKeys
}

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {string[]} [accessibleAreaKeys]
 * @returns {string[]}
 */
export function getValidAreaKeys(features, accessibleAreaKeys = []) {
  return [
    ...new Set(
      features.flatMap((feature) =>
        getAreaKeys(features, feature, accessibleAreaKeys),
      ),
    ),
  ]
}

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {string[]} selectedAreas
 * @param {string[]} [accessibleAreaKeys]
 * @returns {string[] | null}
 */
export function migrateLegacyAreaKeys(
  features,
  selectedAreas,
  accessibleAreaKeys = [],
) {
  const migrated = new Set(selectedAreas)
  let changed = false

  features.forEach((feature) => {
    if (!feature.properties?.key || !migrated.has(feature.properties.key)) {
      return
    }

    const areaKeys = getAreaKeys(features, feature, accessibleAreaKeys)
    if (areaKeys.length === 1 && areaKeys[0] === feature.properties.key) {
      return
    }

    migrated.delete(feature.properties.key)
    areaKeys.forEach((area) => migrated.add(area))
    changed = true
  })

  return changed ? [...migrated] : null
}
