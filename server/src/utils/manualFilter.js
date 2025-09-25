// @ts-check

/**
 * @param {unknown} value
 * @returns {(string | number)[]}
 */
function parseManualIds(value) {
  if (Array.isArray(value)) {
    return value.filter((id) => id !== undefined && id !== null && id !== '')
  }
  return value !== undefined && value !== null && value !== '' ? [value] : []
}

/**
 * @param {import('objection').QueryBuilder} query
 * @param {{
 *   manualIds: (string | number)[],
 *   latColumn: string,
 *   lonColumn: string,
 *   idColumn: string,
 *   bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number },
 * }} options
 */
function applyManualIdFilter(query, options) {
  const { manualIds, latColumn, lonColumn, idColumn, bounds } = options
  if (manualIds.length) {
    query.where((builder) => {
      builder
        .whereBetween(latColumn, [bounds.minLat, bounds.maxLat])
        .andWhereBetween(lonColumn, [bounds.minLon, bounds.maxLon])
        .orWhereIn(idColumn, manualIds)
    })
  } else {
    query
      .whereBetween(latColumn, [bounds.minLat, bounds.maxLat])
      .andWhereBetween(lonColumn, [bounds.minLon, bounds.maxLon])
  }
}

module.exports = { parseManualIds, applyManualIdFilter }
