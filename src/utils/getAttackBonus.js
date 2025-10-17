// @ts-check

/** @param {number} stationedPokemon */
export function getStationAttackBonus(stationedPokemon) {
  if (stationedPokemon > 14) return 4
  if (stationedPokemon > 3) return 3
  if (stationedPokemon > 1) return 2
  if (stationedPokemon > 0) return 1
  return 0
}

/** https://www.reddit.com/r/TheSilphRoad/comments/1nmx8fb/small_update_on_max_battle_parameters_and_the_cpm/
 * @param {number} stationedPokemon */
export function getStationDamageBoost(stationedPokemon) {
  const boostTable = [
    0, 10, 15, 17, 18, 18.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8,
    19.9,
  ]
  if (stationedPokemon >= 15) return 20
  return boostTable[stationedPokemon] || 0
}
