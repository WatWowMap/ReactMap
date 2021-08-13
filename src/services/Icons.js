/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Fetch from '@services/Fetch'

export default class UIcons {
  constructor(customizable, iconSizes, questRewardTypes) {
    this.customizable = customizable
    this.sizes = iconSizes
    this.selected = {}
    this.questRewardTypes = questRewardTypes
    this.modifiers = {
      base: {
        offsetX: 1,
        offsetY: 1,
        sizeMultiplier: 1,
      },
    }
    this.baseUrl = 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/'
  }

  async fetchIcons(icons) {
    if (!icons.some(icon => icon.path === this.baseUrl)) {
      icons.push({
        name: 'Base',
        path: this.baseUrl,
        modifiers: {
          gym: {
            0: 1,
            1: 1,
            2: 1,
            3: 3,
            4: 4,
            5: 4,
            6: 18,
          },
        },
      })
    }
    for (const icon of icons) {
      const data = await Fetch.getIcons(icon.path)
      this[icon.name] = { indexes: Object.keys(data), ...icon }
      if (!this[icon.name].modifiers) {
        this[icon.name].modifiers = {}
      }
      this[icon.name].indexes.forEach(category => {
        let isValid
        if (!parseInt(category) && category !== '0') {
          if (Array.isArray(data[category])) {
            this[icon.name][category] = new Set(data[category])
            isValid = true
          } else {
            Object.keys(data[category]).forEach(subCategory => {
              if (Array.isArray(data[category][subCategory])) {
                this[icon.name][subCategory] = new Set(data[category][subCategory])
                isValid = true
              }
            })
          }
          if (!this[category]) {
            this[category] = []
          }
          if (isValid) {
            this[category].push(icon.name)
          }
          if (!this.selected[category]) {
            this.selected[category] = icon.name
          }
          if (!this[icon.name].modifiers[category]) {
            this[icon.name].modifiers[category] = this.modifiers.base
          } else {
            this[icon.name].modifiers[category] = {
              ...this.modifiers.base,
              ...this[icon.name].modifiers[category],
            }
          }
        }
      })
    }
  }

  setSelection(categories, value) {
    if (typeof categories === 'object') {
      Object.keys(categories).forEach(category => {
        this.selected[category] = categories[category]
        this.modifiers[category] = this[categories[category]].modifiers[category]
      })
    } else {
      this.selected[categories] = value
      this.modifiers[categories] = this[value].modifiers[categories]
    }
  }

  getSize(category, filterId) {
    const refSizes = this.sizes[category]
    const baseSize = filterId ? refSizes[filterId.size] : refSizes.md
    return this.modifiers[category]
      ? baseSize * this.modifiers[category].sizeMultiplier
      : baseSize
  }

  getPokemon(pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, shiny = false) {
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
              if (this[this.selected.pokemon].pokemon.has(result)) {
                return `${baseUrl}/${result}`
              }
            }
          }
        }
      }
    }
    return `${baseUrl}/0.png`
  }

  getTypes(typeId = 1) {
    const baseUrl = `${this[this.selected.type].path}/type`
    const result = `${typeId}.png`
    if (this[this.selected.type].type.has(result)) {
      return { url: `${baseUrl}/${result}` }
    }
    return `${baseUrl}/0.png`
  }

  getPokestops(lureId, invasionActive = false, questActive = false) {
    const baseUrl = `${this[this.selected.pokestop].path}/pokestop`
    const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
    const questSuffixes = questActive ? ['_q', ''] : ['']
    for (const invasionSuffix of invasionSuffixes) {
      for (const questSuffix of questSuffixes) {
        const result = `${lureId}${questSuffix}${invasionSuffix}.png`
        if (this[this.selected.pokestop].pokestop.has(result)) {
          return `${baseUrl}/${result}`
        }
      }
    }
    return `${baseUrl}/0.png`
  }

  getRewards(rewardType, id, amount) {
    const category = this.questRewardTypes[rewardType].text.toLowerCase().replace(' ', '_')
    const baseUrl = `${this[this.selected.reward].path}/reward/${category}`
    const amountSuffixes = amount > 1 ? [`_a${amount}`, ''] : ['']
    for (const aSuffix of amountSuffixes) {
      const result = `${id}${aSuffix}.png`
      if (this[this.selected.reward][category].has(result)) {
        return `${baseUrl}/${result}`
      }
    }
    return `${baseUrl}/0.png`
  }

  getInvasions(gruntType) {
    const baseUrl = `${this[this.selected.invasion].path}/invasion`
    const result = `${gruntType}.png`
    if (this[this.selected.invasion].invasion.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.png`
  }

  getGyms(teamId = 0, trainerCount = 0, inBattle = false, ex = false) {
    const baseUrl = `${this[this.selected.gym].path}/gym`
    const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
    const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    for (const trainerSuffix of trainerSuffixes) {
      for (const inBattleSuffix of inBattleSuffixes) {
        for (const exSuffix of exSuffixes) {
          const result = `${teamId}${trainerSuffix}${inBattleSuffix}${exSuffix}.png`
          if (this[this.selected.gym].gym.has(result)) {
            return `${baseUrl}/${result}`
          }
        }
      }
    }
    return `${baseUrl}/0.png`
  }

  getEggs(level, hatched = false, ex = false) {
    const baseUrl = `${this[this.selected.raid].path}/raid/egg`
    const hatchedSuffixes = hatched ? ['_h', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    for (const hatchedSuffix of hatchedSuffixes) {
      for (const exSuffix of exSuffixes) {
        const result = `${level}${hatchedSuffix}${exSuffix}.png`
        if (this[this.selected.raid].egg && this[this.selected.raid].egg.has(result)) {
          return `${baseUrl}/${result}`
        }
      }
    }
    return `${baseUrl}/0.png`
  }

  getTeams(teamId = 0) {
    const baseUrl = `${this[this.selected.team].path}/team`
    const result = `${teamId}.png`
    if (this[this.selected.team].team.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.png`
  }

  getWeather(weatherId) {
    const baseUrl = `${this[this.selected.weather].path}/weather`
    const result = `${weatherId}.png`
    if (this[this.selected.weather].weather.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.png`
  }

  getMisc(fileName) {
    const baseUrl = `${this[this.selected.misc].path}/misc`
    if (this[this.selected.misc].misc.has(`${fileName}.png`)) {
      return `${baseUrl}/${fileName}.png`
    }
    return `${baseUrl}/0.png`
  }
}
