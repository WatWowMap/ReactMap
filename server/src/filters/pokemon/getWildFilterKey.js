const DITTO_ID = 132

const normalizePokemonId = (pokemonId) => {
  const parsedPokemonId = Number.parseInt(`${pokemonId}`, 10)
  return Number.isNaN(parsedPokemonId) ? 0 : parsedPokemonId
}

const normalizePokemonForm = (pokemonId, formId = 0) => {
  if (normalizePokemonId(pokemonId) === DITTO_ID) {
    // Confirmed wild Ditto is already treated as species-based upstream.
    // Golbat/MEM keeps the scanner lookup on `pokemon_id = 132, form = 0`,
    // while the raw form field may still carry the disguise form for display.
    return 0
  }
  const parsedFormId = Number.parseInt(`${formId ?? 0}`, 10)
  return Number.isNaN(parsedFormId) ? 0 : parsedFormId
}

const getWildFilterKey = (pokemonId, formId = 0) =>
  `${normalizePokemonId(pokemonId)}-${normalizePokemonForm(pokemonId, formId)}`

module.exports = {
  DITTO_ID,
  getWildFilterKey,
}
