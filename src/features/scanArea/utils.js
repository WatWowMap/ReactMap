// @ts-check

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

  if (childKeys.length) return childKeys
  if (!feature.properties.key) return childKeys

  const areaKeys =
    !accessibleAreaKeys.length ||
    accessibleAreaKeys.includes(feature.properties.key)
      ? [feature.properties.key]
      : []
  return areaKeys
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
