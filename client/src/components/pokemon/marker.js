import { Icon } from 'leaflet'

export default function (pokemon) {
  const getPokemonIcon = (pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, shiny = false) => {
    const evolutionSuffixes = evolution ? ['-e' + evolution, ''] : ['']
    const formSuffixes = form ? ['-f' + form, ''] : ['']
    const costumeSuffixes = costume ? ['-c' + costume, ''] : ['']
    const genderSuffixes = gender ? ['-g' + gender, ''] : ['']
    const shinySuffixes = shiny ? ['-shiny', ''] : ['']
    for (const evolutionSuffix of evolutionSuffixes) {
      for (const formSuffix of formSuffixes) {
        for (const costumeSuffix of costumeSuffixes) {
          for (const genderSuffix of genderSuffixes) {
            for (const shinySuffix of shinySuffixes) {
              const result = `${pokemonId}${evolutionSuffix}${formSuffix}${costumeSuffix}${genderSuffix}${shinySuffix}`
              return result
            }
          }
        }
      }
    }
    return '0'
  }

  return new Icon({
    iconUrl: `https://mygod.github.io/pokicons/v2/${getPokemonIcon(pokemon.pokemon_id, 0, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}