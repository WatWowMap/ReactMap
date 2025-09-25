// @ts-check

/**
 * Normalize category identifiers so data and UI share consistent lookups.
 *
 * @param {string} category
 * @returns {string}
 */
export function normalizeCategory(category) {
  if (!category) return ''
  const lower = category.toLowerCase()
  switch (lower) {
    case 'raids':
      return 'gyms'
    case 'lures':
    case 'invasions':
      return 'pokestops'
    default:
      return lower
  }
}
