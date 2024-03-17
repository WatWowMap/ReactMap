// @ts-check

/**
 *
 * @param {string} searchCategory
 * @returns {string}
 */
export function fromSearchCategory(searchCategory) {
  switch (searchCategory) {
    case 'lures':
    case 'nests':
    case 'quests':
    case 'invasions':
      return 'pokestops'
    case 'gyms':
    case 'raids':
      return 'gyms'
    default:
      return searchCategory
  }
}
