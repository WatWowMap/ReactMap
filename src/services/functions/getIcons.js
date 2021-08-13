/* eslint-disable no-restricted-syntax */

export const getPokemonIcon = (
  availForms, imageType, pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, shiny = false,
) => {
  const evolutionSuffixes = evolution ? [`-e${evolution}`, ''] : ['']
  const formSuffixes = form ? [`-f${form}`, ''] : ['']
  const costumeSuffixes = costume ? [`-c${costume}`, ''] : ['']
  const genderSuffixes = gender ? [`-g${gender}`, ''] : ['']
  const shinySuffixes = shiny ? ['-shiny', ''] : ['']
  for (const evolutionSuffix of evolutionSuffixes) {
    for (const formSuffix of formSuffixes) {
      for (const costumeSuffix of costumeSuffixes) {
        for (const genderSuffix of genderSuffixes) {
          for (const shinySuffix of shinySuffixes) {
            const result = `${pokemonId}${evolutionSuffix}${formSuffix}${costumeSuffix}${genderSuffix}${shinySuffix}.${imageType}`
            if (availForms.has(result)) return result
          }
        }
      }
    }
  }
  return `0.${imageType}`
}

export const getGymIcon = (availGyms, imageType, teamId = 0, trainerCount = 0, inBattle = false, ex = false) => {
  const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
  const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
  const exSuffixes = ex ? ['_ex', ''] : ['']
  for (const trainerSuffix of trainerSuffixes) {
    for (const inBattleSuffix of inBattleSuffixes) {
      for (const exSuffix of exSuffixes) {
        const result = `${teamId}${trainerSuffix}${inBattleSuffix}${exSuffix}.${imageType}`
        if (availGyms.has(result)) return result
      }
    }
  }
  return `0.${imageType}`
}

export const getPokestopIcon = (availPokestop, imageType, lureId, invasionActive = false, questActive = false) => {
  const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
  const questSuffixes = questActive ? ['_q', ''] : ['']
  for (const invasionSuffix of invasionSuffixes) {
    for (const questSuffix of questSuffixes) {
      const result = `${lureId}${invasionSuffix}${questSuffix}.${imageType}`
      if (availPokestop.has(result)) return result
    }
  }
  return `0.${imageType}`
}

export const getEggIcon = (availEgg, imageType, level, hatched = false, ex = false) => {
  const hatchedSuffixes = hatched ? ['_h', ''] : ['']
  const exSuffixes = ex ? ['_ex', ''] : ['']
  for (const hatchedSuffix of hatchedSuffixes) {
    for (const exSuffix of exSuffixes) {
      const result = `${level}${hatchedSuffix}${exSuffix}.${imageType}`
      if (availEgg.has(result)) return result
    }
  }
  return `0.${imageType}`
}

export const getInvasionIcon = (availInvasion, imageType, gruntType) => {
  const result = `${gruntType}.${imageType}`
  if (availInvasion.has(result)) return result

  return `0.${imageType}`
}

export const getItemIcon = (itemAvail, imageType, id, amount = 0) => {
  if (amount) {
    const resultAmount = `${id}_a${amount}.${imageType}`
    if (itemAvail.has(resultAmount)) return resultAmount
  }
  const result = `${id}.${imageType}`
  if (itemAvail.has(result)) return result

  return `0.${imageType}`
}
