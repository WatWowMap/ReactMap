/* eslint-disable no-unused-vars */
const config = require('../../config')
const { KEYS, MAD_KEY_MAP, STANDARD, LEAGUES } = require('./constants')
const {
  deepCompare,
  between,
  assign,
  getParsedPvp,
  jsifyIvFilter,
} = require('./functions')
const { filterRTree } = require('../../functions/filterRTree')
const { Event, Pvp } = require('../../initialization')

module.exports = class PkmnFilter {
  /**
   * @param {`${number}-${number}`} id
   * @param {import('./constants').PkmnFilter} filter
   * @param {import('./constants').PkmnFilter} global
   * @param {object} perms
   * @param {boolean} perms.pokemon
   * @param {boolean} perms.iv
   * @param {boolean} perms.pvp
   * @param {string[]} perms.areaRestrictions
   * @param {object} mods
   * @param {boolean} mods.onlyLinkGlobal
   * @param {boolean} mods.pvpV2
   * @param {boolean} mods.hasSize
   * @param {boolean} mods.isMad
   * @param {boolean} mods.mem
   * @param {boolean} mods.onlyPvpMega
   * @param {boolean} mods.onlyPvp40
   * @param {boolean} mods.onlyPvp41
   * @param {boolean} mods.onlyPvp50
   * @param {boolean} mods.onlyPvp51
   * @param {boolean} mods.onlyHundoIv
   * @param {boolean} mods.onlyZeroIv
   * @param {boolean} mods.onlyAllPvp
   * @param {string[]} mods.onlyAreas
   * @param {boolean} mods.onlyLegacy
   */
  constructor(id, filter, global, perms, mods) {
    const [pokemon, form] = id.split('-').map(Number)
    this.id = id
    this.pokemon = pokemon
    this.form = form

    this.filter = filter
    this.perms = perms
    this.mods = mods

    this.expertFilter = this.getExpertCallback(filter.adv)
    this.expertGlobalFilter = this.getExpertCallback(global.adv)

    if (this.id !== 'global') this.mergeGlobal(global)

    this.relevantKeys = new Set(
      this.perms.iv || this.perms.pvp ? this.getRelevantKeys() : [],
    )
  }

  get keyArray() {
    return [...this.relevantKeys]
  }

  /**
   * @param {string} filter
   * @returns {(pokemon?: import("../../../types").Pokemon) => boolean}
   */
  getExpertCallback(filter) {
    return this.mods.onlyLegacy && filter
      ? jsifyIvFilter(filter)
      : () => !filter && this.mods.onlyLegacy
  }

  /**
   * @param {import("./constants").PkmnFilter} filter
   * @returns {Set<string>}
   */
  getRelevantKeys(filter = this.filter) {
    return new Set(
      this.perms.iv || this.perms.pvp
        ? KEYS.filter((key) => this.isActive(key, filter))
        : [],
    )
  }

  /**
   * @param {import("./constants").PkmnFilter} global
   * @returns {void}
   */
  mergeGlobal(global) {
    this.getRelevantKeys(global).forEach((key) => {
      this.filter[key] = this.getMinMax(key, global)
    })
  }

  /**
   * @param {(typeof import("./constants").KEYS)[number]} key
   * @returns {boolean}
   */
  isActive(key, filter = this.filter) {
    switch (typeof STANDARD[key]) {
      case 'boolean':
      case 'string':
      case 'number':
        return filter[key] !== STANDARD[key]
      default:
        return Array.isArray(filter[key])
          ? filter[key].some((v, i) => v !== STANDARD[key][i])
          : !deepCompare(filter[key], STANDARD[key])
    }
  }

  /**
   * @param {import("../../PvpWrapper").PokemonEntry} entry
   * @param {typeof import("./constants").LEAGUES[number]} league
   * @returns {boolean}
   */
  pvpCheck(entry, league) {
    const rankCheck = between(entry.rank, ...this.filter[league])
    if (!rankCheck) return false

    const cpCheck =
      this.mods.pvpV2 ||
      config.api.pvp.reactMapHandlesPvp ||
      entry.cp >= config.api.pvp.minCp[league]
    if (!cpCheck) return false

    const megaCheck = !entry.evolution || this.mods.onlyPvpMega
    if (!megaCheck) return false

    const capCheck =
      this.mods.pvpV2 || config.api.pvp.reactMapHandlesPvp
        ? entry.capped || this.mods[`onlyPvp${entry.cap}`]
        : true
    if (!capCheck) return false

    return true
  }

  /**
   * @param {(typeof import("./constants").KEYS)[number]} key
   * @param {import("./constants").PkmnFilter} global
   * @returns {number[]}
   */
  getMinMax(key, global) {
    const localOn = this.isActive(key)
    const globalOn = this.isActive(key, global)
    let [min, max] = localOn ? this.filter[key] : [Infinity, -Infinity]
    if (globalOn) {
      const [globalMin, globalMax] = global[key]
      min = Math.min(min, globalMin)
      max = Math.max(max, globalMax)
    }
    return [min, max]
  }

  /**
   * @param {typeof import("./constants").LEAGUES[number]} league
   * @param {import("../../PvpWrapper").PokemonEntry[]} data
   * @returns {{ best: number; filtered: import("../../PvpWrapper").PokemonEntry[]}}
   */
  getRanks(league, data) {
    const filtered =
      this.mods.onlyAllPvp || this.mods.onlyLegacy
        ? data
        : data.filter((entry) => {
            const valid =
              this.relevantKeys.has(league) && this.pvpCheck(entry, league)
            return valid
          })
    const best = Math.min(4096, ...filtered.map((entry) => entry.rank))
    return { filtered, best }
  }

  /**
   * @returns {object}
   */
  buildApiFilter() {
    const {
      enabled: _enabled,
      size: _size,
      adv,
      iv,
      atk_iv,
      def_iv,
      sta_iv,
      cp,
      level,
      gender,
      xxs,
      xxl,
      ...rest
    } = this.filter
    const pvp = this.perms.pvp
      ? Object.fromEntries(
          Object.entries(rest).map(([league, values]) => {
            if (Array.isArray(values) && this.isActive(league)) {
              return [league, values]
            }
            return [league, undefined]
          }),
        )
      : undefined
    if (adv) {
      return { expert: adv }
    }
    if (!this.relevantKeys.size) {
      return { additional: { include_everything: true } }
    }
    return {
      iv: this.perms.iv && this.isActive('iv') ? iv : undefined,
      atk_iv: this.perms.iv && this.isActive('atk_iv') ? atk_iv : undefined,
      def_iv: this.perms.iv && this.isActive('def_iv') ? def_iv : undefined,
      sta_iv: this.perms.iv && this.isActive('sta_iv') ? sta_iv : undefined,
      cp: this.perms.iv && this.isActive('cp') ? cp : undefined,
      level: this.perms.iv && this.isActive('level') ? level : undefined,
      gender: this.perms.iv && this.isActive('gender') ? gender : undefined,
      xxs: this.isActive('xxs') ? xxs : undefined,
      xxl: this.isActive('xxl') ? xxl : undefined,
      pvp: Object.keys(pvp || {}).length ? pvp : undefined,
      additional: {
        include_everything: false,
      },
    }
  }

  /**
   * @param {import('objection').QueryBuilder} query
   * @param {boolean | undefined} queryPvp
   * @returns {boolean}
   */
  generateSql(query, queryPvp = false) {
    const keys = this.keyArray
    query.andWhere((pkmn) => {
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i]
        switch (key) {
          case 'xxs':
          case 'xxl':
            if (this.hasSize) {
              pkmn.orWhere('pokemon.size', key === 'xxl' ? 5 : 1)
            }
            break
          case 'gender':
            pkmn.andWhere('pokemon.gender', this.filter[key])
            break
          case 'cp':
          case 'level':
          case 'atk_iv':
          case 'def_iv':
          case 'sta_iv':
          case 'iv':
            if (this.perms.iv) {
              pkmn.andWhereBetween(
                this.mods.isMad ? MAD_KEY_MAP[key] : key,
                this.filter[key],
              )
            }
            break
          default:
            if (this.perms.pvp) {
              if (
                !this.relevantKeys.has('iv') &&
                !this.relevantKeys.has('level') &&
                !this.relevantKeys.has('atk_iv') &&
                !this.relevantKeys.has('def_iv') &&
                !this.relevantKeys.has('sta_iv') &&
                !this.relevantKeys.has('cp') &&
                !this.relevantKeys.has('xxs') &&
                !this.relevantKeys.has('xxl')
              ) {
                // doesn't return everything if only pvp stats for individual pokemon
                pkmn.whereNull('pokemon_id')
              }
            }
            break
        }
      }
    })
    return (
      queryPvp ||
      (this.perms.pvp &&
        LEAGUES.some((league) => this.relevantKeys.has(league)))
    )
  }

  /**
   * @param {object} pokemon
   * @return {boolean}
   */
  valid(pokemon) {
    if (
      !this.mods.mem ||
      filterRTree(pokemon, this.perms.areaRestrictions, this.mods.onlyAreas)
    ) {
      if (
        !this.mods.onlyLinkGlobal ||
        (this.pokemon === pokemon.pokemon_id && this.form === pokemon.form)
      ) {
        if (this.expertFilter(pokemon)) {
          return true
        }
        if (this.expertGlobalFilter(pokemon)) {
          return true
        }
        if (this.mods.onlyLegacy) return false

        const keys = this.keyArray
        if (pokemon.checked || keys.length === 0) return true
        if (this.mods.onlyZeroIv && pokemon.iv === 0) return true
        if (this.mods.onlyHundoIv && pokemon.iv === 100) return true

        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i]
          switch (key) {
            case 'xxs':
            case 'xxl':
              if (pokemon.size === (key === 'xxl' ? 5 : 1)) return true
              break
            case 'iv':
            case 'atk_iv':
            case 'def_iv':
            case 'sta_iv':
            case 'cp':
            case 'level':
              if (between(pokemon[key], ...this.filter[key])) return true
              break
            default:
              if (pokemon.cleanPvp?.[key]?.length) return true
          }
        }
      }
    }
    return false
  }

  /**
   * @param {object} pokemon
   * @param {number} safeTs
   * @returns {{ cleanPvp: { [key in typeof LEAGUES[number]]?: number[] }, bestPvp: number }}
   */
  buildPvp(pokemon, safeTs = Math.floor(Date.now() / 1000)) {
    const parsed = config.api.pvp.reactMapHandlesPvp
      ? Pvp.resultWithCache(pokemon, safeTs)
      : getParsedPvp(pokemon)
    const cleanPvp = {}
    let bestPvp = 4096
    Object.keys(parsed).forEach((league) => {
      if (config.api.pvp.leagueObj[league]) {
        const { filtered, best } = this.getRanks(league, parsed[league])
        if (filtered.length) {
          cleanPvp[league] = filtered
          if (best < bestPvp) bestPvp = best
        }
      }
    })
    return { cleanPvp, bestPvp }
  }

  /**
   * @template {object} T
   * @param {T} pokemon
   * @returns {Partial<T>}
   */
  build(pokemon) {
    const result = {
      id: pokemon.id,
      encounter_id: pokemon.encounter_id,
      spawnpoint_id: pokemon.spawnpoint_id,
      lat: pokemon.lat,
      lon: pokemon.lon,
      pokemon_id: pokemon.pokemon_id,
      form: pokemon.form,
      gender: pokemon.gender,
      costume: pokemon.costume,
      first_seen_timestamp: pokemon.first_seen_timestamp,
      expire_timestamp: pokemon.expire_timestamp,
      expire_timestamp_verified: !!pokemon.expire_timestamp_verified,
      updated: pokemon.updated,
      display_pokemon_id: pokemon.display_pokemon_id,
      ditto_form: pokemon.ditto_form,
      seen_type: pokemon.seen_type,
      changed: !!pokemon.changed,
    }
    if (result.pokemon_id === 132 && !result.ditto_form) {
      result.ditto_form = result.form
      result.form =
        Event.masterfile.pokemon[result.pokemon_id]?.defaultFormId || 0
    }
    if (!result.seen_type) {
      if (result.spawn_id === null) {
        result.seen_type = result.pokestop_id ? 'nearby_stop' : 'nearby_cell'
      } else {
        result.seen_type = 'encounter'
      }
    }

    if (!this.perms.pokemon) return result
    if (this.perms.iv) {
      assign(result, pokemon, [
        'atk_iv',
        'def_iv',
        'sta_iv',
        'iv',
        'cp',
        'level',
        'weight',
        'height',
        'size',
        'move_1',
        'move_2',
        'shiny',
        'weather',
      ])
    }
    if (this.perms.pvp) {
      const { cleanPvp, bestPvp } = this.buildPvp(pokemon)
      result.bestPvp = bestPvp
      result.cleanPvp = cleanPvp
    }
    return result
  }
}
