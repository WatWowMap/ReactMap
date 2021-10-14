import { useTranslation } from 'react-i18next'

export default function genPokemon(Icons, masterfile) {
  const { t } = useTranslation()

  const tempObj = {
    pokemon: {},
    unsetQuests: {},
  }

  Object.entries(masterfile.pokemon).forEach(([i, pkmn]) => {
    const pokeName = t(`poke_${i}`)
    Object.entries(pkmn.forms).forEach(([j, form]) => {
      const formName = t(`form_${j}`)
      const id = `${i}-${j}`
      const formTypes = (form.types || pkmn.types || []).map(x => `poke_type_${x}`)
      const name = form.name && form.name !== 'Normal' && j != 0 && j != pkmn.defaultFormId
        ? formName
        : pokeName
      const pkmnObj = {
        name,
        pokedexId: i,
        formId: j,
        defaultFormId: pkmn.defaultFormId,
        pokeName,
        formName,
        formTypes,
        rarity: pkmn.rarity,
        genId: `generation_${pkmn.genId}`,
        url: Icons.getPokemon(i, j),
        perm: 'pokemon',
        family: pkmn.family,
      }
      if (form.name === '*') {
        tempObj.unsetQuests[id] = { ...pkmnObj, name: `${name}*` }
      } else {
        tempObj.pokemon[id] = pkmnObj
      }
    })
  })

  return tempObj
}
