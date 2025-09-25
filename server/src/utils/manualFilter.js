// @ts-check

/**
 * @param {unknown} manualId
 * @returns {string | number | null}
 */
function normalizeManualId(manualId) {
  if (
    manualId === undefined ||
    manualId === null ||
    manualId === '' ||
    (typeof manualId !== 'string' && typeof manualId !== 'number')
  ) {
    return null
  }
  return manualId
}

/**
 * @param {import('objection').QueryBuilder} query
 * @param {{
 *   manualId?: string | number | null,
 *   latColumn: string,
 *   lonColumn: string,
 *   idColumn: string,
 *   bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number },
 * }} options
 * @returns {string | number | null}
 */
function applyManualIdFilter(query, options) {
  const {
    manualId: rawManual,
    latColumn,
    lonColumn,
    idColumn,
    bounds,
  } = options

  const manualId = normalizeManualId(rawManual)

  if (manualId !== null) {
    query.where((builder) => {
      builder
        .whereBetween(latColumn, [bounds.minLat, bounds.maxLat])
        .andWhereBetween(lonColumn, [bounds.minLon, bounds.maxLon])
        .orWhere(idColumn, manualId)
    })
  } else {
    query
      .whereBetween(latColumn, [bounds.minLat, bounds.maxLat])
      .andWhereBetween(lonColumn, [bounds.minLon, bounds.maxLon])
  }

  return manualId
}

module.exports = { applyManualIdFilter, normalizeManualId }
