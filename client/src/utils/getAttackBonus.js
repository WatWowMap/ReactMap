// @ts-check

/** @param {number} stationedPokemon */
export function getStationAttackBonus(stationedPokemon) {
  if (stationedPokemon > 14) return 4
  if (stationedPokemon > 3) return 3
  if (stationedPokemon > 1) return 2
  if (stationedPokemon > 0) return 1
  return 0
}
