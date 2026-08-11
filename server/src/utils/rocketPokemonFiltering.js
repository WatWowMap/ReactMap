// @ts-check

const excludedCharacters = require('@rm/masterfile/lib/rocketPokemonFilterExcludedCharacters.json')

// Rocket Pokemon filters apply only to standard grunts. Team leaders (41-43),
// Giovanni (44), and Decoys (45-46) remain selectable by invasion type.
const ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS = Object.freeze([
  ...excludedCharacters,
])

/** @param {number|string|null|undefined} character */
const isRocketPokemonFilterExcluded = (character) =>
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS.includes(Number(character))

/**
 * Builds a Rocket reward filter key without inventing a form. A missing or
 * unknown form is represented by the species-wide `a<pokemon>` key; an
 * explicit form, including `0`, produces `a<pokemon>-<form>`.
 * @param {number|string|null|undefined} pokemonId
 * @param {number|string|null|undefined} form
 * @returns {string}
 */
const getRocketPokemonFilterKey = (pokemonId, form) => {
  const id = Number(pokemonId)
  if (!Number.isFinite(id) || id <= 0) return ''

  const hasForm = form !== null && form !== undefined && form !== ''
  const formId = Number(form)
  return hasForm && Number.isFinite(formId) && formId >= 0
    ? `a${id}-${formId}`
    : `a${id}`
}

/**
 * Exact Rocket form keys take precedence over a species-wide unknown key.
 * Collapse at the merged availability boundary so a community fallback cannot
 * hide a form observed by a scanner. Malformed legacy keys are discarded.
 * @param {Iterable<string>} keys
 * @returns {Set<string>}
 */
const collapseRocketPokemonFilterKeys = (keys) => {
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

/**
 * Builds the set of Rocket species selected by any enabled species-wide or
 * exact-form key. Server request filters contain enabled entries only.
 * @param {Record<string, unknown>} filters
 * @returns {Set<number>}
 */
const getEnabledRocketPokemonSpecies = (filters) => {
  const result = new Set()
  Object.entries(filters).forEach(([key, enabled]) => {
    if (!enabled) return
    const match = key.match(/^a(\d+)(?:-\d+)?$/)
    if (match) result.add(Number(match[1]))
  })
  return result
}

module.exports = {
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
  collapseRocketPokemonFilterKeys,
  getEnabledRocketPokemonSpecies,
  getRocketPokemonFilterKey,
  isRocketPokemonFilterExcluded,
}
