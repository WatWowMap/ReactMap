/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
// TODO: Make TS compliant

/**
 * Deeply compares two values of the same type and generates a report.
 * Functions are excluded from both the comparison and the report.
 *
 * @template T
 * @param {T} a - The first value to compare.
 * @param {T} b - The second value to compare.
 * @param {boolean} [first=true] - Whether this is the first comparison.
 * @param {string} [changedKey=[]] - An array of keys that have changed.
 * @returns {import('@rm/types').ComparisonReport<T>} An object containing the comparison result and a report object.
 */
function deepCompare(a, b, first = true, changedKey = '') {
  const changed = []
  // If the values are strictly equal, return true with no further checking.
  if (a === b) {
    return { areEqual: true, report: true, changed }
  }
  // If either value is null or undefined, they are not equal.
  if (a == null || b == null) {
    if (changedKey) changed.push(changedKey)
    return { areEqual: false, report: false, changed }
  }
  // Handle array comparison.
  if (Array.isArray(a) && Array.isArray(b)) {
    // Create a report array with boolean results for each element comparison.
    const reportArray = (a.length > b.length ? a : b).map((_, i) =>
      deepCompare(
        a[i],
        b[i],
        false,
        changedKey ? `${changedKey}.${i.toString()}` : i.toString(),
      ),
    )
    const areEqual = reportArray.every((c) => c.areEqual) // Check if all elements are equal.
    const report = reportArray.map((c) => c.report)
    if (!areEqual) {
      changed.push(...reportArray.map((c) => c.changed).flat())
    }

    return { areEqual, report: first ? report : { areEqual, report }, changed }
  }
  // Handle object comparison.
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    const report = {}
    let areEqual = true
    // Compare each key and its corresponding value.
    for (const key of aKeys.length > bKeys.length ? aKeys : bKeys) {
      if (key in (aKeys.length > bKeys.length ? b : a)) {
        if (typeof a[key] === 'function' || typeof b[key] === 'function') {
          continue // Skip functions.
        }
        const {
          areEqual: isEqual,
          report: valueReport,
          changed: valueChanged,
        } = deepCompare(
          a[key],
          b[key],
          false,
          changedKey ? `${changedKey}.${key}` : key,
        )

        report[key] = valueReport
        areEqual = areEqual && isEqual
        if (!isEqual) {
          changed.push(...valueChanged)
        }
      } else {
        report[key] = false
        areEqual = false
        changed.push(changedKey ? `${changedKey}.${key}` : key)
      }
    }
    return { areEqual, report: first ? report : { areEqual, report }, changed }
  }
  // For all other cases, the values are not equal.
  if (a !== b && changedKey) changed.push(changedKey)
  return { areEqual: false, report: false, changed }
}

module.exports = { deepCompare }
