// @ts-check

/** @param {unknown} value */
const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype

/**
 * Returns only values that differ from the matching defaults.
 * Unknown keys are deliberately retained for forwards/backwards compatibility.
 *
 * @param {unknown} value
 * @param {unknown} defaults
 * @returns {unknown}
 */
function getDifference(value, defaults) {
  if (Object.is(value, defaults)) return undefined

  if (Array.isArray(value) && Array.isArray(defaults)) {
    if (
      value.length === defaults.length &&
      value.every((entry, index) =>
        Object.is(getDifference(entry, defaults[index]), undefined),
      )
    ) {
      return undefined
    }
    return value
  }

  if (isPlainObject(value) && isPlainObject(defaults)) {
    const difference = {}
    Object.entries(value).forEach(([key, entry]) => {
      const entryDifference = Object.prototype.hasOwnProperty.call(
        defaults,
        key,
      )
        ? getDifference(entry, defaults[key])
        : entry
      if (entryDifference !== undefined) difference[key] = entryDifference
    })
    return Object.keys(difference).length ? difference : undefined
  }

  return value
}

/**
 * Produces a JSON-safe profile payload. Filter values matching the current
 * server defaults are omitted because useMapData merges those defaults back in
 * when a profile is loaded.
 *
 * @param {Record<string, any>} state
 * @param {Record<string, any>} defaultFilters
 */
export function createBackupData(state, defaultFilters) {
  const backup = JSON.parse(JSON.stringify(state))
  backup.filters =
    getDifference(backup.filters || {}, defaultFilters || {}) || {}
  return backup
}
