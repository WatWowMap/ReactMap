const DITTO_ID = 132

export const getWildFilterId = (pokemonId, formId = 0) => {
  const normalizedPokemonId = Number.parseInt(`${pokemonId}`, 10)
  const normalizedFormId = Number.parseInt(`${formId ?? 0}`, 10)
  if (normalizedPokemonId === DITTO_ID) {
    return `${DITTO_ID}-0`
  }
  return `${Number.isNaN(normalizedPokemonId) ? 0 : normalizedPokemonId}-${
    Number.isNaN(normalizedFormId) ? 0 : normalizedFormId
  }`
}
