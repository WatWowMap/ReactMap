const freezeProps = (target, property) => {
  const {
    value,
    get = () => value,
    set = () => undefined,
    // eslint-disable-next-line no-unused-vars
    writable: _writable,
    ...desc
  } = Object.getOwnPropertyDescriptor(target, property)
  Object.defineProperty(target, property, {
    ...desc,
    get,
    set,
    configurable: false,
  })
}

export default class UIcons {
  constructor({ customizable, sizes, cacheHrs }, questRewardTypes) {
    this.customizable = customizable
    this.sizes = sizes
    this.selected = {}
    this.questRewardTypes = {}
    this.fallback = ''
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
    Object.entries(questRewardTypes).forEach(
      ([id, category]) =>
        (this.questRewardTypes[id] = category.toLowerCase().replace(' ', '_')),
    )
    // Freezing since we don't change them in the codebase but we're exposing uicons to the global object and we don't want them to be changed in the browser console
    freezeProps(this, 'customizable')
    freezeProps(this, 'sizes')
    freezeProps(this, 'questRewardTypes')
  }

  build(icons) {
    icons.forEach((icon, i) => {
      try {
        const { data, name: dirtyName, path: dirtyPath } = icon
        const name = dirtyName.endsWith('/')
          ? dirtyName?.slice(0, -1)
          : dirtyName
        const path = dirtyPath?.endsWith('/')
          ? dirtyPath.slice(0, -1)
          : dirtyPath

        if (data) {
          this[name] = {
            indexes: Object.keys(data),
            ...icon,
            path,
          }
          if (!i) {
            this.fallback = path
          }
          if (!path) {
            // eslint-disable-next-line no-console
            console.error('No path provided for', name, 'using default path')
            this[
              name
            ].path = `https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main`
          }
          if (!path.startsWith('http')) {
            this[name].path = `/images/uicons/${path}`
          }
          if (!this[name].modifiers) {
            this[name].modifiers = {}
          }
          this[name].indexes.forEach((category) => {
            let isValid = false
            if (
              !parseInt(category) &&
              category !== '0' &&
              category !== 'lastFetched'
            ) {
              if (Array.isArray(data[category])) {
                this[name][category] = new Set(data[category])
                isValid = true
              } else {
                Object.keys(data[category]).forEach((subCategory) => {
                  if (Array.isArray(data[category][subCategory])) {
                    this[name].extension =
                      data[category][subCategory][0]?.split('.')[1] ||
                      this[name].extension
                    this[name][subCategory] = new Set(
                      data[category][subCategory],
                    )
                    isValid = true
                  }
                })
              }
              if (!this[category]) {
                this[category] = []
              }
              if (isValid) {
                this[category].push(name)
              }
              if (!this[name].modifiers[category]) {
                this[name].modifiers[category] = this.modifiers.base
              } else {
                this[name].modifiers[category] = {
                  ...this.modifiers.base,
                  ...this[name].modifiers[category],
                }
              }
              if (path.includes('wwm')) {
                this.selected.misc = name
              }
              if (!this.selected[category]) {
                this.selected[category] = name
                this.modifiers[category] = this[name].modifiers[category]
              }
            }
          })
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Issue loading', icon, '\n', e)
      }
    })
    // for debugging purposes/viewing
    if (!window.uicons) {
      Object.defineProperty(window, 'uicons', {
        value: this,
        writable: false,
        enumerable: true,
        configurable: false,
      })
    }
  }

  get selection() {
    return { ...this.selected }
  }

  checkValid(localIconObj) {
    return Object.values(localIconObj).every((icon) => this[icon])
  }

  setSelection(categories, value) {
    if (typeof categories === 'object') {
      Object.keys(categories).forEach((category) => {
        if (this[categories[category]]) {
          this.selected[category] = categories[category]
          this.modifiers[category] = this[categories[category]]
            ? this[categories[category]].modifiers[category]
            : this.modifiers.base
        }
      })
    } else if (this[categories]) {
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

  getModifiers(category) {
    return this.modifiers[category]
      ? this.modifiers[category]
      : this.modifiers.base
  }

  getIconById(id) {
    if (id === 'kecleon') {
      id = '352'
    } else if (id === 'gold-stop') {
      id = 'l506'
    }
    switch (id.charAt(0)) {
      case 'a':
        return this.getPokemon(...id.slice(1).split('-'))
      case 'c':
        return this.getRewards(4, ...id.slice(1).split('-'))
      case 'd':
        return this.getRewards(3, id.slice(1))
      case 'e':
        return this.getEggs(id.slice(1), false)
      case 'g':
        return this.getGyms(...id.slice(1).split('-'))
      case 'i':
        return this.getInvasions(id.slice(1), true)
      case 'l':
        return this.getPokestops(id.slice(1))
      case 'm':
        return this.getPokemon(id.slice(1).split('-')[0], 0, 1)
      case 'p':
        return this.getRewards(1, id.slice(1))
      case 'q':
        return this.getRewards(2, ...id.slice(1).split('-'))
      case 'r':
        return this.getEggs(id.slice(1), true)
      case 's':
        return this.getPokestops(0)
      case 't':
        return this.getGyms(...id.slice(1).split('-'))
      case 'u':
        return this.getRewards(id.slice(1))
      case 'x':
        return this.getRewards(9, ...id.slice(1).split('-'))
      default:
        return this.getPokemon(...id.split('-'))
    }
  }

  getPokemon(
    pokemonId,
    form = 0,
    evolution = 0,
    gender = 0,
    costume = 0,
    alignment = 0,
    shiny = false,
  ) {
    const baseUrl = `${
      this[this.selected.pokemon]?.path || this.fallback
    }/pokemon`
    const extension = this[this.selected.pokemon]?.extension || 'png'

    const evolutionSuffixes = evolution ? [`_e${evolution}`, ''] : ['']
    const formSuffixes = form ? [`_f${form}`, ''] : ['']
    const costumeSuffixes = costume ? [`_c${costume}`, ''] : ['']
    const genderSuffixes = gender ? [`_g${gender}`, ''] : ['']
    const alignmentSuffixes = alignment ? [`_a${alignment}`, ''] : ['']
    const shinySuffixes = shiny ? ['_s', ''] : ['']

    for (let e = 0; e < evolutionSuffixes.length; e += 1) {
      for (let f = 0; f < formSuffixes.length; f += 1) {
        for (let c = 0; c < costumeSuffixes.length; c += 1) {
          for (let g = 0; g < genderSuffixes.length; g += 1) {
            for (let a = 0; a < alignmentSuffixes.length; a += 1) {
              for (let s = 0; s < shinySuffixes.length; s += 1) {
                const result = `${pokemonId}${evolutionSuffixes[e]}${formSuffixes[f]}${costumeSuffixes[c]}${genderSuffixes[g]}${alignmentSuffixes[a]}${shinySuffixes[s]}.${extension}`
                if (this[this.selected.pokemon].pokemon.has(result)) {
                  return `${baseUrl}/${result}`
                }
              }
            }
          }
        }
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getTypes(typeId) {
    const baseUrl = `${this[this.selected.type]?.path || this.fallback}/type`
    const extension = this[this.selected.type]?.extension || 'png'

    const result = `${typeId}.${extension}`
    if (this[this.selected.type].type.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.${extension}`
  }

  getPokestops(
    lureId,
    invasionActive = false,
    questActive = false,
    ar = false,
    power = 0,
    display = '',
  ) {
    const baseUrl = `${
      this[this.selected.pokestop]?.path || this.fallback
    }/pokestop`
    const extension = this[this.selected.pokestop]?.extension || 'png'

    const invasionSuffixes =
      invasionActive || display ? [`_i${display}`, ''] : ['']
    const questSuffixes = questActive ? ['_q', ''] : ['']
    const arSuffixes = ar ? ['_ar', ''] : ['']
    const powerUpSuffixes = power ? [`_p${power}`, ''] : ['']

    for (let i = 0; i < invasionSuffixes.length; i += 1) {
      for (let q = 0; q < questSuffixes.length; q += 1) {
        for (let a = 0; a < arSuffixes.length; a += 1) {
          for (let p = 0; p < powerUpSuffixes.length; p += 1) {
            const result = `${lureId}${invasionSuffixes[i]}${questSuffixes[q]}${arSuffixes[a]}${powerUpSuffixes[p]}.${extension}`
            if (this[this.selected.pokestop].pokestop.has(result)) {
              return `${baseUrl}/${result}`
            }
          }
        }
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getRewards(rewardType, id, amount) {
    const category = this.questRewardTypes[rewardType] || 'unset'
    const baseUrl = `${
      this[this.selected.reward]?.path || this.fallback
    }/reward/${category}`
    const extension = this[this.selected.reward]?.extension || 'png'

    if (this[this.selected.reward][category]) {
      const amountSuffixes = amount > 1 ? [`_a${amount}`, ''] : ['']
      for (let a = 0; a < amountSuffixes.length; a += 1) {
        const result = `${id}${amountSuffixes[a]}.${extension}`
        if (this[this.selected.reward][category].has(result)) {
          return `${baseUrl}/${result}`
        }
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getInvasions(gruntType, confirmed = false) {
    const baseUrl = `${
      this[this.selected.invasion]?.path || this.fallback
    }/invasion`
    const extension = this[this.selected.invasion]?.extension || 'png'

    const confirmedSuffixes = confirmed ? [''] : ['_u', '']
    for (let c = 0; c < confirmedSuffixes.length; c += 1) {
      const result = `${gruntType}${confirmedSuffixes[c]}.${extension}`
      if (this[this.selected.invasion].invasion.has(result)) {
        return `${baseUrl}/${result}`
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getGyms(
    teamId = 0,
    trainerCount = 0,
    inBattle = false,
    ex = false,
    ar = false,
  ) {
    const baseUrl = `${this[this.selected.gym]?.path || this.fallback}/gym`
    const extension = this[this.selected.gym]?.extension || 'png'

    const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
    const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    const arSuffixes = ar ? ['_ar', ''] : ['']
    for (let t = 0; t < trainerSuffixes.length; t += 1) {
      for (let b = 0; b < inBattleSuffixes.length; b += 1) {
        for (let e = 0; e < exSuffixes.length; e += 1) {
          for (let a = 0; a < arSuffixes.length; a += 1) {
            const result = `${teamId}${trainerSuffixes[t]}${inBattleSuffixes[b]}${exSuffixes[e]}${arSuffixes[a]}.${extension}`
            if (this[this.selected.gym].gym.has(result)) {
              return `${baseUrl}/${result}`
            }
          }
        }
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getEggs(level, hatched = false, ex = false) {
    const baseUrl = `${
      this[this.selected.raid]?.path || this.fallback
    }/raid/egg`
    const extension = this[this.selected.raid]?.extension || 'png'

    const hatchedSuffixes = hatched ? ['_h', ''] : ['']
    const exSuffixes = ex ? ['_ex', ''] : ['']
    for (let h = 0; h < hatchedSuffixes.length; h += 1) {
      for (let e = 0; e < exSuffixes.length; e += 1) {
        const result = `${level}${hatchedSuffixes[h]}${exSuffixes[e]}.${extension}`
        if (
          this[this.selected.raid].egg &&
          this[this.selected.raid].egg.has(result)
        ) {
          return `${baseUrl}/${result}`
        }
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getTeams(teamId = 0) {
    const baseUrl = `${this[this.selected.team]?.path || this.fallback}/team`
    const extension = this[this.selected.team]?.extension || 'png'

    const result = `${teamId}.${extension}`
    if (this[this.selected.team].team.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.${extension}`
  }

  getWeather(weatherId, timeOfDay = false) {
    const baseUrl = `${
      this[this.selected.weather]?.path || this.fallback
    }/weather`
    const extension = this[this.selected.weather]?.extension || 'png'

    const timeSuffixes = timeOfDay === 'night' ? ['_n', ''] : ['_d', '']
    for (let t = 0; t < timeSuffixes.length; t += 1) {
      const result = `${weatherId}${timeSuffixes[t]}.${extension}`
      if (this[this.selected.weather].weather.has(result)) {
        return `${baseUrl}/${result}`
      }
    }
    return `${baseUrl}/0.${extension}`
  }

  getNests(typeId) {
    const baseUrl = `${this[this.selected.nest]?.path || this.fallback}/nest`
    const extension = this[this.selected.nest]?.extension || 'png'

    const result = `${typeId}.${extension}`
    if (this[this.selected.nest].nest.has(result)) {
      return `${baseUrl}/${result}`
    }
    return `${baseUrl}/0.${extension}`
  }

  doesMiscHave(fileName) {
    return this[this.selected.misc].misc.has(
      `${fileName}.${this[this.selected.misc].extension || 'png'}`,
    )
  }

  getMisc(fileName) {
    const baseUrl = `${this[this.selected.misc]?.path || this.fallback}/misc`
    const extension = this[this.selected.misc]?.extension || 'png'

    if (this.doesMiscHave(fileName)) {
      return `${baseUrl}/${fileName}.${extension}`
    }
    if (fileName.endsWith('s') && this.doesMiscHave(fileName.slice(0, -1))) {
      return `${baseUrl}/${fileName.slice(0, -1)}.${extension}`
    }
    if (
      !fileName.endsWith('s') &&
      this.doesMiscHave(`${fileName}s.${extension}`)
    ) {
      return `${baseUrl}/${fileName}s.${extension}`
    }
    if (
      this[this.selected[fileName]]?.path &&
      this[this.selected[fileName]][fileName]?.has(`0.${extension}`)
    ) {
      return `${this[this.selected[fileName]]?.path}/${fileName}/0.${extension}`
    }
    return `${baseUrl}/0.${extension}`
  }

  getDevices(online) {
    const baseUrl = `${
      this[this.selected.device]?.path || this.fallback
    }/device`
    const extension = this[this.selected.device]?.extension || 'png'

    return online ? `${baseUrl}/1.${extension}` : `${baseUrl}/0.${extension}`
  }

  getSpawnpoints(hasTth) {
    const baseUrl = `${
      this[this.selected.spawnpoint]?.path || this.fallback
    }/spawnpoint`
    const extension = this[this.selected.spawnpoint]?.extension || 'png'

    return hasTth ? `${baseUrl}/1.${extension}` : `${baseUrl}/0.${extension}`
  }
}
