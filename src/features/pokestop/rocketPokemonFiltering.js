// @ts-check

import ROCKET_POKEMON_FILTER_EXCLUDED_GRUNT_TYPES from '@rm/masterfile/lib/rocketPokemonFilterExcludedCharacters.json'

// Rocket Pokemon filters apply only to standard grunts. Team leaders (41-43),
// Giovanni (44), and Decoys (45-46) remain selectable by invasion type.
/** @param {number|string|null|undefined} gruntType */
export function isRocketPokemonFilterExcluded(gruntType) {
  return ROCKET_POKEMON_FILTER_EXCLUDED_GRUNT_TYPES.includes(Number(gruntType))
}

/**
 * @param {number|string|null|undefined} pokemonId
 * @param {number|string|null|undefined} form
 * @returns {string}
 */
export function getRocketPokemonFilterKey(pokemonId, form) {
  const id = Number(pokemonId)
  if (!Number.isFinite(id) || id <= 0) return ''

  const hasForm = form !== null && form !== undefined && form !== ''
  const formId = Number(form)
  return hasForm && Number.isFinite(formId) && formId >= 0
    ? `a${id}-${formId}`
    : `a${id}`
}

/**
 * Exact form keys take precedence over a species-wide unknown key. Malformed
 * legacy keys are discarded.
 * @param {Iterable<string>} keys
 * @returns {Set<string>}
 */
export function collapseRocketPokemonFilterKeys(keys) {
  const result = new Set(keys)
  const exactSpecies = new Set()

  result.forEach((key) => {
    const match = key.match(/^(a\d+)-\d+$/)
    if (match) {
      exactSpecies.add(match[1])
    } else if (/^a\d+-/.test(key)) {
      result.delete(key)
    }
  })
  exactSpecies.forEach((species) => result.delete(species))
  return result
}

const enabledExactKeysByFilters = new WeakMap()

/**
 * @param {import('@rm/types').AllFilters['pokestops']['filter']} filters
 * @returns {Map<string, string[]>}
 */
function getEnabledExactKeysBySpecies(filters) {
  const cached = enabledExactKeysByFilters.get(filters)
  if (cached) return cached

  const result = new Map()
  Object.entries(filters).forEach(([key, filter]) => {
    if (!filter?.enabled) return
    const match = key.match(/^(a\d+)-\d+$/)
    if (!match) return
    result.set(match[1], [...(result.get(match[1]) || []), key])
  })
  enabledExactKeysByFilters.set(filters, result)
  return result
}

/**
 * Returns every enabled key that can match an encounter. Known forms match
 * only their exact key (or a legacy species-wide wildcard); unknown forms
 * match the species-wide key or every enabled exact sibling.
 * @param {number|string|null|undefined} pokemonId
 * @param {number|string|null|undefined} form
 * @param {import('@rm/types').AllFilters['pokestops']['filter']} filters
 * @returns {string[]}
 */
export function getEnabledRocketPokemonFilterKeys(pokemonId, form, filters) {
  const exact = getRocketPokemonFilterKey(pokemonId, form)
  const species = getRocketPokemonFilterKey(pokemonId)
  if (!species) return []

  if (exact !== species) {
    if (filters[exact]?.enabled) return [exact]
    return filters[species]?.enabled ? [species] : []
  }

  const exactKeys = getEnabledExactKeysBySpecies(filters).get(species)
  if (exactKeys?.length) return exactKeys
  return filters[species]?.enabled ? [species] : []
}
