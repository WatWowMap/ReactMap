// @ts-check

const Ohbem = require('ohbem')

/** @type {import('ohbem').PokemonData | null} */
let pokemonData = null
/** @type {Promise<import('ohbem').PokemonData> | null} */
let pokemonDataPromise = null

async function refreshPokemonData() {
  if (pokemonDataPromise) return pokemonDataPromise

  pokemonDataPromise = Ohbem.fetchPokemonData()
    .then((data) => {
      pokemonData = data
      return data
    })
    .finally(() => {
      pokemonDataPromise = null
    })
  return pokemonDataPromise
}

async function ensurePokemonData() {
  return pokemonData || refreshPokemonData()
}

module.exports = { ensurePokemonData, refreshPokemonData }
