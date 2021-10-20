export default function genPokemon(t, Icons, pokemon, categories) {
  const tempObj = Object.fromEntries(categories.map(x => [x, {}]))

  Object.entries(pokemon).forEach(([i, pkmn]) => {
    const pokeName = t(`poke_${i}`)
    Object.entries(pkmn.forms).forEach(([j, form]) => {
      const formName = t(`form_${j}`)
      const id = `${i}-${j}`
      const formTypes = (form.types || pkmn.types || []).map(x => `poke_type_${x}`)
      const name = form.name && form.name !== 'Normal' && j != 0 && j != pkmn.defaultFormId
        ? formName
        : pokeName
      tempObj.pokemon[id] = {
        name: form.name === '*' ? `${name}*` : name,
        pokedexId: +i,
        formId: +j,
        defaultFormId: pkmn.defaultFormId,
        pokeName,
        formName,
        formTypes,
        rarity: pkmn.rarity,
        genId: `generation_${pkmn.genId}`,
        url: Icons.getPokemon(i, j),
        perms: ['pokemon', 'raids', 'quests', 'nests'],
        family: pkmn.family,
      }
      tempObj.pokemon[id].searchMeta = `${Object.values(tempObj.pokemon[id])
        .flatMap(x => t(x))
        .join(' ')
        .toLowerCase()} ${t('pokemon').toLowerCase()}`
    })
  })
  return tempObj
}
