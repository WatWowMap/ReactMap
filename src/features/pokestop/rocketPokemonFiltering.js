// @ts-check

import ROCKET_POKEMON_FILTER_EXCLUDED_GRUNT_TYPES from '@rm/masterfile/lib/rocketPokemonFilterExcludedCharacters.json'

// Rocket Pokemon filters apply only to standard grunts. Team leaders (41-43),
// Giovanni (44), and Decoys (45-46) remain selectable by invasion type.
/** @param {number|string|null|undefined} gruntType */
export function isRocketPokemonFilterExcluded(gruntType) {
  return ROCKET_POKEMON_FILTER_EXCLUDED_GRUNT_TYPES.includes(Number(gruntType))
}
