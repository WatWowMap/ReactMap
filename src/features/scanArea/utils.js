// @ts-check

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>} feature
 * @param {string[]} [accessibleAreaKeys]
 * @returns {string[]}
 */
export function getAreaKeys(features, feature, accessibleAreaKeys = []) {
  if (!feature?.properties || feature.properties.manual) return []

  if (feature.properties.key) {
    const areaKeys =
      !accessibleAreaKeys.length ||
      accessibleAreaKeys.includes(feature.properties.key)
        ? [feature.properties.key]
        : []
    if (areaKeys.length) return areaKeys
  }

  return !feature.properties.parent && feature.properties.name
    ? features
        .filter(
          (child) =>
            !child.properties.manual &&
            child.properties.parent === feature.properties.name &&
            child.properties.key,
        )
        .map((child) => child.properties.key)
    : []
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
