/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */

export default class UIcons {
  constructor(customizable, iconSizes) {
    this.customizable = customizable
    this.sizes = iconSizes
    this.selected = {}
    this.modifiers = {
      offsetX: 0,
      offsetY: 0,
      sizeMultiplier: 0,
    }
    this.baseUrl = 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/'
  }

  async fetchIcons(icons) {
    if (!icons.some(icon => icon.path === this.baseUrl)) {
      icons.push({ name: 'Base', path: this.baseUrl })
    }
    for (const icon of icons) {
      const response = await fetch(`${icon.path}/index.json`)
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      const data = await response.json()
      this[icon.name] = { indexes: Object.keys(data), ...icon }
      this[icon.name].indexes.forEach(category => {
        if (!parseInt(category) && category !== '0') {
          if (Array.isArray(data[category])) {
            this[icon.name][category] = data[category]
          } else {
            Object.keys(data[category]).forEach(subCategory => {
              this[icon.name][subCategory] = data[category][subCategory]
            })
          }
          if (!this[category]) {
            this[category] = []
          }
          this[category].push(icon.name)
          if (!this.selected[category]) {
            this.selected[category] = icon.name
          }
        }
      })
    }
  }

  setSelection(categories, value) {
    if (typeof categories === 'object') {
      Object.keys(categories).forEach(category => {
        this.selected[category] = categories[category]
      })
    } else {
      this.selected[categories] = value
    }
  }

  getSize(category, filterId) {
    const refSizes = this.sizes[category]
    return filterId ? refSizes[filterId.size] : refSizes.md
  }

  getPokemon = (filterId, pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, shiny = false) => {
    const baseUrl = `${this[this.selected.pokemon].path}/pokemon`
    const evolutionSuffixes = evolution ? [`_e${evolution}`, ''] : ['']
    const formSuffixes = form ? [`_f${form}`, ''] : ['']
    const costumeSuffixes = costume ? [`_c${costume}`, ''] : ['']
    const genderSuffixes = gender ? [`_g${gender}`, ''] : ['']
    const shinySuffixes = shiny ? ['_shiny', ''] : ['']
    for (const evolutionSuffix of evolutionSuffixes) {
      for (const formSuffix of formSuffixes) {
        for (const costumeSuffix of costumeSuffixes) {
          for (const genderSuffix of genderSuffixes) {
            for (const shinySuffix of shinySuffixes) {
              const result = `${pokemonId}${evolutionSuffix}${formSuffix}${costumeSuffix}${genderSuffix}${shinySuffix}.png`
              if (this[this.selected.pokemon].pokemon.includes(result)) {
                return { url: `${baseUrl}/${result}`, sizes: this.getSize('pokemon', filterId) }
              }
            }
          }
        }
      }
    }
    return { url: `${baseUrl}/0.png`, sizes: this.sizes.pokemon.md }
  }

  getTypes = (typeId = 1) => {
    const baseUrl = `${this[this.selected.type].path}/type`
    const result = `${typeId}.png`
    if (this[this.selected.type].type.includes(result)) {
      return { url: `${baseUrl}/${result}` }
    }
    return { url: `${baseUrl}/0.png` }
  }

  getTeams = (teamId = 0) => {
    const baseUrl = `${this[this.selected.team].path}/team`
    const result = `${teamId}.png`
    if (this[this.selected.team].team.includes(result)) {
      return { url: `${baseUrl}/${result}` }
    }
    return { url: `${baseUrl}/0.png` }
  }

  getGyms = (filterId, teamId = 0, trainerCount = 0, inBattle = false, ex = false) => {
    const baseUrl = `${this[this.selected.gym].path}/gym`
    const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
    const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    for (const trainerSuffix of trainerSuffixes) {
      for (const inBattleSuffix of inBattleSuffixes) {
        for (const exSuffix of exSuffixes) {
          const result = `${teamId}${trainerSuffix}${inBattleSuffix}${exSuffix}.png`
          if (this[this.selected.gym].gym.includes(result)) {
            return { url: `${baseUrl}/${result}`, sizes: this.getSize('gyms', filterId) }
          }
        }
      }
    }
    return { url: `${baseUrl}/0.png`, sizes: this.sizes.gyms.md }
  }

  getPokestops = (filterId, lureId, invasionActive = false, questActive = false) => {
    const baseUrl = `${this[this.selected.pokestop].path}/pokestop`
    const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
    const questSuffixes = questActive ? ['_q', ''] : ['']
    for (const invasionSuffix of invasionSuffixes) {
      for (const questSuffix of questSuffixes) {
        const result = `${lureId}${questSuffix}${invasionSuffix}.png`
        if (this[this.selected.pokestop].pokestop.includes(result)) {
          return { url: `${baseUrl}/${result}`, sizes: this.getSize('pokestops', filterId) }
        }
      }
    }
    return { url: `${baseUrl}/0.png`, sizes: this.sizes.pokestops.md }
  }

  getEggs = (filterId, level, hatched = false, ex = false) => {
    const baseUrl = `${this[this.selected.raid].path}/raid/egg`
    const hatchedSuffixes = hatched ? ['_h', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    for (const hatchedSuffix of hatchedSuffixes) {
      for (const exSuffix of exSuffixes) {
        const result = `${level}${hatchedSuffix}${exSuffix}.png`
        if (this[this.selected.raid].egg.includes(result)) {
          return { url: `${baseUrl}/${result}`, sizes: this.getSize('eggs', filterId) }
        }
      }
    }
    return { url: `${baseUrl}/0.png`, sizes: this.sizes.eggs.md }
  }

  getInvasions = (filterId, gruntType) => {
    const baseUrl = `${this[this.selected.invasion].path}/invasion`
    const result = `${gruntType}.png`
    if (this[this.selected.invasion].invasion.includes(result)) {
      return { url: `${baseUrl}/${result}`, sizes: this.getSize('invasions', filterId) }
    }

    return { url: `${baseUrl}/0.png`, sizes: this.sizes.invasions.md }
  }

  getWeather = (weatherId) => {
    const baseUrl = `${this[this.selected.weather].path}/weather`
    const result = `${weatherId}.png`
    if (this[this.selected.weather].weather.includes(result)) {
      return { url: `${baseUrl}/${result}` }
    }
    return { url: `${baseUrl}/0.png` }
  }

  getRewards = (filterId, category, id, amount) => {
    const baseUrl = `${this[this.selected.reward].path}/reward/${category}`
    const amountSuffixes = amount > 1 ? [`_a${amount}`, ''] : ['']
    for (const aSuffix of amountSuffixes) {
      const result = `${id}${aSuffix}.png`
      if (this[this.selected.reward][category].includes(result)) {
        return { url: `${baseUrl}/${result}`, sizes: this.getSize('rewards', filterId) }
      }
    }
    return { url: `${baseUrl}/0.png`, sizes: this.sizes.rewards.md }
  }
}
