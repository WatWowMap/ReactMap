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

module.exports = {
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
  isRocketPokemonFilterExcluded,
}
