export default function genPokemon(t, pokemon, categories) {
  const tempObj = Object.fromEntries(
    categories.map((x) => [
      x,
      {
        '0-0': {
          webhookOnly: true,
          name: t('poke_global'),
          perms: ['pokemon', 'raids', 'quests', 'nests'],
          formTypes: [],
        },
      },
    ]),
  )

  Object.entries(pokemon).forEach(([i, pkmn]) => {
    const pokeName = t(`poke_${i}`)
    Object.entries(pkmn.forms).forEach(([j, form]) => {
      const formName = t(`form_${j}`)
      const id = `${i}-${j}`
      const formTypes = (form.types || pkmn.types || []).map(
        (x) => `poke_type_${x}`,
      )
      const name =
        form.name && form.name !== 'Normal' && j != 0 && j != pkmn.defaultFormId
          ? formName
          : pokeName
      tempObj.pokemon[id] = {
        name: form.name === '*' ? `${name}*` : name,
        category: form.name === '*' ? form.category : undefined,
        pokedexId: +i,
        formId: +j,
        defaultFormId: pkmn.defaultFormId,
        pokeName,
        formName,
        formTypes,
        rarity: pkmn.rarity,
        genId: `generation_${pkmn.genId}`,
        perms: ['pokemon', 'raids', 'quests', 'nests'],
        family: pkmn.family,
      }
      tempObj.pokemon[id].searchMeta = `${Object.values(tempObj.pokemon[id])
        .flatMap((x) => (Array.isArray(x) ? x.map((y) => t(y)) : t(x)))
        .join(' ')
        .toLowerCase()} ${t('pokemon').toLowerCase()}`
    })
  })
  return tempObj
}
