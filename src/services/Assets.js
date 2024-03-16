// @ts-check
/* eslint-disable no-console */
import { UICONS } from 'uicons.js'

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
export class UAssets {
  /**
   *
   * @param {import("@rm/types").Config['icons']} iconsConfig
   * @param {import("@rm/masterfile").Masterfile['questRewardTypes']} questRewardTypes
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
        const { data, name: dirtyName, path: dirtyPath, ...rest } = icon
        const name = dirtyName.endsWith('/')
          ? dirtyName?.slice(0, -1)
          : dirtyName
        let path = dirtyPath?.endsWith('/') ? dirtyPath.slice(0, -1) : dirtyPath
        if (!path) {
          console.error(
            `[${this.assetType}] No path provided for`,
            name,
            'using default path',
          )
          this[name].path = this.fallback
        }
        if (!path.startsWith('http')) {
          path = `/images/${this.assetType}/${path}`
        }
        if (data) {
          const indexes = Object.keys(data)
          this[name] = {
            ...this[name],
            ...rest,
            name,
            path,
            class: new UICONS(path, name),
          }
          this[name].class.init(data)
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
                isValid = true
              } else {
                Object.keys(data[category]).forEach((subCategory) => {
                  if (Array.isArray(data[category][subCategory])) {
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
    const baseSize = this.sizes[category]?.[size] || 20
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
        return this.getPokemon(...id.slice(1).split('-', 2), 0, 0, 0, 1)
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
      case 'h':
        return this.getTypes(id.slice(1))
      case 'i':
        // invasions
        return this.getInvasions(id.slice(1), true)
      case 'l':
        // lures
        return this.getPokestops(id.slice(1))
      case 'm':
        // mega energy
        return this.getRewards(12, ...id.slice(1).split('-', 2))
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
      return this[this.selected.pokemon]?.class?.pokemon(
        pokemonId,
        form,
        evolution,
        gender,
        costume,
        alignment,
        shiny,
      )
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/pokemon/0.${this.fallbackExt}`
    }
  }

  /** @param {number | string} [typeId] */
  getTypes(typeId = 0) {
    try {
      return this[this.selected.type]?.class?.type(typeId)
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
      return this[this.selected.pokestop]?.class?.pokestop(
        lureId,
        power,
        display,
        invasionActive,
        questActive,
        ar,
      )
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
      const reward = this.questRewardTypes[rewardType]
      return this[this.selected.reward]?.class?.reward(reward, id, amount)
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
      return this[this.selected.invasion]?.class?.invasion(gruntType, confirmed)
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
      return this[this.selected.gym]?.class?.gym(
        teamId,
        trainerCount,
        inBattle,
        ex,
        ar,
      )
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
      return this[this.selected.raid]?.class?.raidEgg(level, hatched, ex)
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
      return this[this.selected.team]?.class?.team(teamId)
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/team/0.${this.fallbackExt}`
    }
  }

  /**
   *
   * @param {string | number} weatherId
   * @param {import("@rm/types").TimesOfDay} [timeOfDay]
   * @returns
   */
  getWeather(weatherId, timeOfDay = 'day') {
    try {
      return this[this.selected.weather]?.class?.weather(weatherId, timeOfDay)
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
      return this[this.selected.nest]?.class?.nest(typeId)
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/nest/0.${this.fallbackExt}`
    }
  }

  /** @param {string} fileName */
  getMisc(fileName = '') {
    try {
      const miscClass = this[this.selected.misc]?.class

      if (miscClass.has('misc', fileName)) {
        return miscClass.misc(fileName)
      }
      if (
        fileName.endsWith('s') &&
        miscClass.has('misc', fileName.slice(0, -1))
      ) {
        return miscClass.misc(fileName.slice(0, -1))
      }
      if (!fileName.endsWith('s') && miscClass.has('misc', `${fileName}s`)) {
        return miscClass.misc(`${fileName}s`)
      }
      if (
        this[this.selected[fileName]]?.path &&
        this[this.selected[fileName]].class.has(fileName, `0`)
      ) {
        return this[this.selected[fileName]].class[fileName]('0')
      }
      return miscClass.misc('0')
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/misc/0.${this.fallbackExt}`
    }
  }

  /** @param {boolean} [online] */
  getDevices(online = false) {
    try {
      return this[this.selected.device]?.class?.device(online)
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/device/0.${this.fallbackExt}`
    }
  }

  /** @param {boolean} [hasTth] */
  getSpawnpoints(hasTth = false) {
    try {
      return this[this.selected.spawnpoint]?.class?.spawnpoint(hasTth)
    } catch (e) {
      console.error(`[${this.assetType.toUpperCase()}]`, e)
      return `${this.fallback}/spawnpoint/0.${this.fallbackExt}`
    }
  }
}
