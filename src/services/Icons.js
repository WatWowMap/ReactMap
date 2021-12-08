/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import Fetch from '@services/Fetch'

export default class UIcons {
  constructor({ customizable, sizes, cacheHrs }, questRewardTypes) {
    this.customizable = customizable
    this.sizes = sizes
    this.selected = {}
    this.questRewardTypes = {}
    this.modifiers = {
      base: {
        offsetX: 1,
        offsetY: 1,
        sizeMultiplier: 1,
        popupX: 0,
        popupY: 0,
      },
    }
    this.cacheMs = cacheHrs * 60 * 60 * 1000
    Object.entries(questRewardTypes).forEach(([id, category]) => (
      this.questRewardTypes[id] = category.toLowerCase().replace(' ', '_')
    ))
  }

  async fetchIcons(icons) {
    const baseUrl = 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/'
    if (!icons.some(icon => icon.path === baseUrl)) {
      icons.push({
        name: 'Base',
        path: baseUrl,
        modifiers: {
          gym: {
            0: 1,
            1: 1,
            2: 1,
            3: 3,
            4: 4,
            5: 4,
            6: 18,
            sizeMultiplier: 1.2,
          },
        },
      })
    }
    for (const icon of icons) {
      const cachedIndex = JSON.parse(localStorage.getItem(`${icon.name}_icons`))
      const data = cachedIndex && cachedIndex.lastFetched + this.cacheMs > Date.now()
        ? cachedIndex
        : await Fetch.getIcons(icon.path, icon.name)
      if (data) {
        this[icon.name] = { indexes: Object.keys(data), ...icon }
        if (!this[icon.name].modifiers) {
          this[icon.name].modifiers = {}
        }
        this[icon.name].indexes.forEach(category => {
          let isValid = false
          if (!parseInt(category) && category !== '0' && category !== 'lastFetched') {
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
            if (!this[icon.name].modifiers[category]) {
              this[icon.name].modifiers[category] = this.modifiers.base
            } else {
              this[icon.name].modifiers[category] = {
                ...this.modifiers.base,
                ...this[icon.name].modifiers[category],
              }
            }
            if (icon.path === baseUrl) {
              this.selected.misc = icon.name
            }
            if (!this.selected[category]) {
              this.selected[category] = icon.name
              this.modifiers[category] = this[icon.name].modifiers[category]
            }
          }
        })
      }
    }
  }

  get selection() {
    return { ...this.selected }
  }

  checkValid(localIconObj) {
    return Object.values(localIconObj).every(icon => this[icon])
  }

  setSelection(categories, value) {
    if (typeof categories === 'object') {
      Object.keys(categories).forEach(category => {
        if (category !== 'misc') {
          this.selected[category] = categories[category]
          this.modifiers[category] = this[categories[category]]
            ? this[categories[category]].modifiers[category]
            : this.modifiers.base
        }
      })
    } else if (categories !== 'misc') {
      this.selected[categories] = value
      this.modifiers[categories] = this[value]
        ? this[value].modifiers[categories]
        : this.modifiers.base
    }
  }

  getSize(category, filterId) {
    const refSizes = this.sizes[category]
    const baseSize = filterId ? refSizes[filterId.size] : refSizes.md
    return this.modifiers[category]
      ? baseSize * this.modifiers[category].sizeMultiplier
      : baseSize
  }

  getPopupOffset(category) {
    return this.modifiers[category]
      ? { x: this.modifiers[category].popupX || 0, y: this.modifiers[category].popupY || 0 }
      : { x: 0, y: 0 }
  }

  getIconById(id) {
    switch (id.charAt(0)) {
      case 'c': return this.getRewards(4, ...id.slice(1).split('-'))
      case 'd': return this.getRewards(3, id.slice(1))
      case 'e': return this.getEggs(id.slice(1), false)
      case 'g': return this.getGyms(...id.slice(1).split('-'))
      case 'i': return this.getInvasions(id.slice(1))
      case 'l': return this.getPokestops(id.slice(1))
      case 'm': return this.getPokemon(id.slice(1).split('-')[0], 0, 1)
      case 'q': return this.getRewards(2, ...id.slice(1).split('-'))
      case 'r': return this.getEggs(id.slice(1), true)
      case 's': return this.getPokestops(0)
      case 't': return this.getGyms(...id.slice(1).split('-'))
      case 'u': return this.getRewards(id.slice(1))
      case 'x': return this.getRewards(9, ...id.slice(1).split('-'))
      default: return this.getPokemon(...id.split('-'))
    }
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

  getTypes(typeId) {
    const baseUrl = `${this[this.selected.type].path}/type`
    const result = `${typeId}.png`
    if (this[this.selected.type].type.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.png`
  }

  getPokestops(lureId, invasionActive = false, questActive = false, ar = false) {
    const baseUrl = `${this[this.selected.pokestop].path}/pokestop`
    const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
    const questSuffixes = questActive ? ['_q', ''] : ['']
    const arSuffixes = ar ? ['_ar', ''] : ['']
    for (const invasionSuffix of invasionSuffixes) {
      for (const questSuffix of questSuffixes) {
        for (const arSuffix of arSuffixes) {
          const result = `${lureId}${questSuffix}${invasionSuffix}${arSuffix}.png`
          if (this[this.selected.pokestop].pokestop.has(result)) {
            return `${baseUrl}/${result}`
          }
        }
      }
    }
    return `${baseUrl}/0.png`
  }

  getRewards(rewardType, id, amount) {
    const category = this.questRewardTypes[rewardType] || 'unset'
    const baseUrl = `${this[this.selected.reward].path}/reward/${category}`
    if (this[this.selected.reward][category]) {
      const amountSuffixes = amount > 1 ? [`_a${amount}`, ''] : ['']
      for (const aSuffix of amountSuffixes) {
        const result = `${id}${aSuffix}.png`
        if (this[this.selected.reward][category].has(result)) {
          return `${baseUrl}/${result}`
        }
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

  getGyms(teamId = 0, trainerCount = 0, inBattle = false, ex = false, ar = false) {
    const baseUrl = `${this[this.selected.gym].path}/gym`
    const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
    const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    const arSuffixes = ar ? ['_ar', ''] : ['']
    for (const trainerSuffix of trainerSuffixes) {
      for (const inBattleSuffix of inBattleSuffixes) {
        for (const exSuffix of exSuffixes) {
          for (const arSuffix of arSuffixes) {
            const result = `${teamId}${trainerSuffix}${inBattleSuffix}${exSuffix}${arSuffix}.png`
            if (this[this.selected.gym].gym.has(result)) {
              return `${baseUrl}/${result}`
            }
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

  getWeather(weatherId, isNight = false) {
    const baseUrl = `${this[this.selected.weather].path}/weather`
    const timeSuffixes = isNight ? ['_n', ''] : ['_d', '']
    for (const timeSuffix of timeSuffixes) {
      const result = `${weatherId}${timeSuffix}.png`
      if (this[this.selected.weather].weather.has(result)) {
        return `${baseUrl}/${result}`
      }
    }
    return `${baseUrl}/0.png`
  }

  getNests(typeId) {
    const baseUrl = `${this[this.selected.nest].path}/nest`
    const result = `${typeId}.png`
    if (this[this.selected.nest].nest.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.png`
  }

  getMisc(fileName) {
    const baseUrl = `${this[this.selected.misc].path}/misc`
    switch (true) {
      case this[this.selected.misc].misc.has(`${fileName}.png`):
        return `${baseUrl}/${fileName}.png`
      case fileName.endsWith('s') && this[this.selected.misc].misc.has(`${fileName.slice(0, -1)}.png`):
        return `${baseUrl}/${fileName.slice(0, -1)}.png`
      case !fileName.endsWith('s') && this[this.selected.misc].misc.has(`${fileName}s.png`):
        return `${baseUrl}/${fileName}s.png`
      default: return `${baseUrl}/0.png`
    }
  }
}
