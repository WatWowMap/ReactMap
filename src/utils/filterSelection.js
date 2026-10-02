// @ts-check

/**
 * @typedef {'all' | 'default' | 'raids' | 'lures' | 'invasions' | 'quests' | 'showcase' | 'rocketPokemon' | 'pokemon'} FilterSelectionScope
 * @typedef {Partial<Record<FilterSelectionScope, boolean>>} FilterSelectionDefaults
 * @typedef {{ [C in import('@rm/types').Categories]: import('@rm/types').AllFilters[C] & { selectionDefaults?: FilterSelectionDefaults } }} StoredFilters
 */

/**
 * Shared by drawer selections and defaults for newly available filters.
 * @param {string} category
 * @param {string} key
 * @param {FilterSelectionScope} [scope]
 * @returns {boolean}
 */
export function matchesFilterSelection(category, key, scope = 'default') {
  if (key === 'global') return false
  switch (scope) {
    case 'all':
      return true
    case 'raids':
      return key.startsWith('e')
    case 'lures':
      return key.startsWith('l')
    case 'invasions':
      return key.startsWith('i')
    case 'quests':
      return ['q', 'm', 'x', 'c', 'd', 'p', 'u'].some((prefix) =>
        key.startsWith(prefix),
      )
    case 'showcase':
      return ['f', 'h', 'y', 'b'].some((prefix) => key.startsWith(prefix))
    case 'rocketPokemon':
      return key.startsWith('a')
    case 'pokemon':
      return Number.isInteger(Number(key.charAt(0)))
    case 'default':
      switch (category) {
        case 'gyms':
          return key.startsWith('t')
        case 'tappables':
          return key.startsWith('q') && key !== 'q0'
        default:
          return Number.isInteger(Number(key.charAt(0)))
      }
    default:
      return false
  }
}
