// @ts-check

/**
 * Builds a mega energy filter key. Energy for different temp evolutions of the
 * same species (Mega X and Mega Y) is kept apart, so a reward carrying a temp
 * evolution produces `m<pokemon>-<amount>-<temp evolution>`; one without it
 * produces `m<pokemon>-<amount>`.
 * @param {number|string} pokemonId
 * @param {number|string} amount
 * @param {number|string|null|undefined} [tempEvolution]
 * @returns {string}
 */
const getMegaEnergyFilterKey = (pokemonId, amount, tempEvolution) => {
  const evolution = Number(tempEvolution)
  return evolution
    ? `m${pokemonId}-${amount}-${evolution}`
    : `m${pokemonId}-${amount}`
}

module.exports = { getMegaEnergyFilterKey }
