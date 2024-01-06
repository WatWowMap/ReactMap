// @ts-check
/* eslint-disable no-console */

// /**
//  *
//  * @template {object} T
//  * @param {T} target
//  * @param {keyof T} property
//  */
// const freezeProps = (target, property) => {
//   const {
//     value,
//     get = () => value,
//     set = () => undefined,
//     // eslint-disable-next-line no-unused-vars
//     writable: _writable,
//     ...desc
//   } = Object.getOwnPropertyDescriptor(target, property)
//   Object.defineProperty(target, property, {
//     ...desc,
//     get,
//     set,
//     configurable: false,
//   })
// }

// TODO: This is dumb, should be a state machine with Zustand
class UAssets {
  /**
   *
   * @param {import("@rm/types").Config['icons']} iconsConfig
   * @param {import("@rm/types").Masterfile['questRewardTypes']} questRewardTypes
   * @param {'uicons' | 'uaudio'} assetType
   */
  constructor({ customizable, sizes }, questRewardTypes, assetType) {
    this.customizable = customizable
    this.sizes = sizes
    this.selected = {}
    this.assetType = assetType
    this.questRewardTypes = Object.fromEntries(
      Object.entries(questRewardTypes).map(([id, category]) => [
        id,
        category.toLowerCase().replace(' ', '_').replace(' ', '_'),
      ]),
    )
    this.fallback =
      assetType === 'uicons'
        ? 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main'
        : 'https://raw.githubusercontent.com/WatWowMap/wwm-uaudio/main'
    this.fallbackExt = assetType === 'uicons' ? 'webp' : 'wav'
    this.modifiers = {
      base: {
        offsetX: 1,
        offsetY: 1,
        sizeMultiplier: 1,
        popupX: 0,
        popupY: 0,
      },
    }

    // Freezing since we don't change them in the codebase but we're exposing uassets to the global object and we don't want them to be changed in the browser console
    // freezeProps(this, 'customizable')
    // freezeProps(this, 'sizes')
    // freezeProps(this, 'questRewardTypes')
  }

  /**
   *
   * @param {import("@rm/types").UAssetsClient[]} icons
   */
  build(icons) {
    icons.forEach((icon) => {
      try {
        const { data, name: dirtyName, path: dirtyPath } = icon
        const name = dirtyName.endsWith('/')
          ? dirtyName?.slice(0, -1)
          : dirtyName
        const path = dirtyPath?.endsWith('/')
          ? dirtyPath.slice(0, -1)
          : dirtyPath

        if (data) {
          const indexes = Object.keys(data)
          this[name] = {
            ...this[name],
            ...icon,
            path,
          }
          if (!path) {
            console.error(
              `[${this.assetType}] No path provided for`,
              name,
              'using default path',
            )
            this[name].path = this.fallback
          }
          if (!path.startsWith('http')) {
            this[name].path = `/images/${this.assetType}/${path}`
          }
          if (!this[name].modifiers) {
            this[name].modifiers = {}
          }
          indexes.forEach((category) => {
            let isValid = false
            if (
              !parseInt(category) &&
              category !== '0' &&
              category !== 'lastFetched'
            ) {
              if (Array.isArray(data[category])) {
                this[name][category] = new Set(data[category])
                isValid = true
                this[name].extension =
                  data[category][0]?.split('.')[1] || this[name].extension
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
                this[category] = new Set()
              }
              if (isValid) {
                this[category].add(name)
              }
              if (!this[name].modifiers) {
                this[name].modifiers = {}
              }
              if (!this[name].modifiers[category]) {
                this[name].modifiers[category] = { ...this.modifiers.base }
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
        console.error(
          `[${this.assetType.toUpperCase()}] issue building`,
          icon,
          '\n',
          e,
        )
      }
    })
    // for debugging purposes/viewing
    Object.defineProperty(window, this.assetType, {
      value: this,
      writable: true,
      enumerable: true,
      configurable: false,
    })
  }

  get selection() {
    return { ...this.selected }
  }

  /** @param {Record<string, string>} localIconObj */
  checkValid(localIconObj) {
    return Object.values(localIconObj || {}).every((icon) => this[icon])
  }

  /**
   *
   * @param {Record<string, string> | string} categories
   * @param {string} [value]
   */
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

  /**
   * @param {string} category
   * @param {'sm' | 'md' | 'lg' | 'xl'} [size]
   */
  getSize(category, size = 'md') {
    const baseSize = this.sizes[category][size]
    return this.modifiers[category]
      ? baseSize * this.modifiers[category].sizeMultiplier
      : baseSize
  }

  /** @param {string[]} categories */
  getModifiers(...categories) {
    return categories.map(
      (category) => this.modifiers[category] ?? this.modifiers.base,
    )
  }

  /** @param {string} id */
  getIconById(id) {
    if (typeof id !== 'string') {
      return ''
    }
    if (id === 'kecleon') {
      id = 'b8'
    } else if (id === 'gold-stop') {
      id = 'b7'
    } else if (id === 'showcase') {
      id = 'b9'
    }
    switch (id.charAt(0)) {
      case 'a':
        // rocket pokemon
        return this.getPokemon(...id.slice(1).split('-'))
      case 'b':
        // event stops
        return this.getEventStops(id.slice(1))
      case 'c':
        // candy
        return this.getRewards(4, ...id.slice(1).split('-'))
      case 'd':
        // stardust
        return this.getRewards(3, id.slice(1))
      case 'e':
        // raid eggs
        return this.getEggs(id.slice(1), false)
      case 'f':
        // showcase mons
        return this.getPokemon(...id.slice(1).split('-'))
      case 'g':
        // gyms
        return this.getGyms(...id.slice(1).split('-'))
      case 'i':
        // invasions
        return this.getInvasions(id.slice(1), true)
      case 'l':
        // lures
        return this.getPokestops(id.slice(1))
      case 'm':
        // mega energy
        return this.getPokemon(id.slice(1).split('-')[0], 0, 1)
      case 'p':
        // experience
        return this.getRewards(1, id.slice(1))
      case 'q':
        // items
        return this.getRewards(2, ...id.slice(1).split('-'))
      case 'r':
        // unconfirmed but hatched raids
        return this.getEggs(id.slice(1), true)
      case 's':
        // ...base pokestop maybe?
        return this.getPokestops(0)
      case 't':
        // teams
        return this.getGyms(...id.slice(1).split('-'))
      case 'u':
        // quest types
        return this.getRewards(id.slice(1))
      case 'x':
        // xl candy
        return this.getRewards(9, ...id.slice(1).split('-'))
      default:
        // pokemon
        return this.getPokemon(...id.split('-'))
    }
  }

  /** @param {number | string} [displayType] */
  getEventStops(displayType = 0) {
    try {
      switch (+displayType) {
        case 7:
          // Gimmighoul coin
          return this.getMisc('event_coin')
        case 8:
          // Kecleon
          return this.getPokemon(352)
        case 9:
          // Showcase
          return this.getMisc('showcase')
        default:
      }
      return this.getMisc('0')
    } catch (e) {
      console.error(`[${this.assetType}]`, e)
      return `${this.fallback}/misc/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} [pokemonId]
   * @param {string | number} [form]
   * @param {string | number} [evolution]
   * @param {string | number} [gender]
   * @param {string | number} [costume]
   * @param {string | number} [alignment]
   * @param {boolean} [shiny]
   * @returns
   */
  getPokemon(
    pokemonId = 0,
    form = 0,
    evolution = 0,
    gender = 0,
    costume = 0,
    alignment = 0,
    shiny = false,
  ) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/pokemon/0.${this.fallbackExt}`
    }
  }

  /** @param {number | string} [typeId] */
  getTypes(typeId = 0) {
    try {
      const baseUrl = `${this[this.selected.type]?.path || this.fallback}/type`
      const extension = this[this.selected.type]?.extension || 'png'

      const result = `${typeId}.${extension}`
      if (this[this.selected.type].type.has(result)) {
        return `${baseUrl}/${result}`
      }
      return `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/type/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} [lureId]
   * @param {boolean} [invasionActive]
   * @param {boolean} [questActive]
   * @param {boolean} [ar]
   * @param {string | number} [power]
   * @param {string | number} [display]
   * @returns
   */
  getPokestops(
    lureId = 0,
    invasionActive = false,
    questActive = false,
    ar = false,
    power = 0,
    display = '',
  ) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/pokestop/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} [rewardType]
   * @param {string | number} [id]
   * @param {number} [amount]
   * @returns
   */
  getRewards(rewardType, id, amount = 0) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/reward/unset/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} gruntType
   * @param {boolean} [confirmed]
   * @returns
   */
  getInvasions(gruntType, confirmed = false) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/invasion/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} teamId
   * @param {string | number} trainerCount
   * @param {boolean} [inBattle]
   * @param {boolean} [ex]
   * @param {boolean} [ar]
   * @returns
   */
  getGyms(
    teamId = 0,
    trainerCount = 0,
    inBattle = false,
    ex = false,
    ar = false,
  ) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/gym/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} level
   * @param {boolean} [hatched]
   * @param {boolean} [ex]
   * @returns
   */
  getEggs(level, hatched = false, ex = false) {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/raid/egg/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} [teamId]
   * @returns
   */
  getTeams(teamId = 0) {
    try {
      const baseUrl = `${this[this.selected.team]?.path || this.fallback}/team`
      const extension = this[this.selected.team]?.extension || 'png'

      const result = `${teamId}.${extension}`
      if (this[this.selected.team].team.has(result)) {
        return `${baseUrl}/${result}`
      }
      return `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/team/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} weatherId
   * @param {'day' | 'night'} [timeOfDay]
   * @returns
   */
  getWeather(weatherId, timeOfDay = 'day') {
    try {
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
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/weather/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} typeId
   * @returns
   */
  getNests(typeId) {
    try {
      const baseUrl = `${this[this.selected.nest]?.path || this.fallback}/nest`
      const extension = this[this.selected.nest]?.extension || 'png'

      const result = `${typeId}.${extension}`
      if (this[this.selected.nest].nest.has(result)) {
        return `${baseUrl}/${result}`
      }
      return `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/nest/0.${this.fallbackExt}`
    }
  }

  /** @param {string} fileName */
  doesMiscHave(fileName) {
    return this[this.selected.misc].misc.has(
      `${fileName}.${this[this.selected.misc].extension || 'png'}`,
    )
  }

  /** @param {string} fileName */
  getMisc(fileName = '') {
    try {
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
        return `${
          this[this.selected[fileName]]?.path
        }/${fileName}/0.${extension}`
      }
      return `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/misc/0.${this.fallbackExt}`
    }
  }

  /** @param {boolean} [online] */
  getDevices(online = false) {
    try {
      const baseUrl = `${
        this[this.selected.device]?.path || this.fallback
      }/device`
      const extension = this[this.selected.device]?.extension || 'png'

      return online ? `${baseUrl}/1.${extension}` : `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/device/0.${this.fallbackExt}`
    }
  }

  /** @param {boolean} [hasTth] */
  getSpawnpoints(hasTth = false) {
    try {
      const baseUrl = `${
        this[this.selected.spawnpoint]?.path || this.fallback
      }/spawnpoint`
      const extension = this[this.selected.spawnpoint]?.extension || 'png'

      return hasTth ? `${baseUrl}/1.${extension}` : `${baseUrl}/0.${extension}`
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/spawnpoint/0.${this.fallbackExt}`
    }
  }
}

export default UAssets
