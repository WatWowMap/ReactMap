export default function (availableForms, pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, shiny = false) {
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
            if (availableForms.has(result)) return result
          }
        }
      }
    }
  }
  return '0'
}
