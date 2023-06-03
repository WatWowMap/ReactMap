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
const { log, HELPERS } = require('../../logger')

module.exports = class PkmnBackend {
  /**
   * @param {`${number}-${number}` | 'global'} id
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
    this.pokemon = pokemon || 0
    this.form = form || 0

    this.perms = perms
    this.mods = mods

    this.filter = filter
    this.global = global
    this.filterKeys = this.getRelevantKeys(filter)
    this.globalKeys = this.getRelevantKeys(global)
    this.expertFilter = this.getCallback(id === 'global')
    this.expertGlobal = this.getCallback(true)
  }

  get keyArray() {
    return [...this.filterKeys]
  }

  createExpertFilter(filter = this.filter, keys = this.filterKeys) {
    let andStr = ''
    if (keys.has('iv')) {
      if (andStr) andStr += '&'
      andStr += filter.iv.join('-')
    }
    if (this.mods.onlyZeroIv) {
      if (andStr) andStr += '|'
      andStr += `0`
    }
    if (this.mods.onlyHundoIv) {
      if (andStr) andStr += '|'
      andStr += `100`
    }
    if (andStr) {
      andStr = `(${andStr})`
    }
    if (keys.has('atk_iv')) {
      if (andStr) andStr += '&'
      andStr += `A${filter.atk_iv.join('-')}`
    }
    if (keys.has('def_iv')) {
      if (andStr) andStr += '&'
      andStr += `D${filter.def_iv.join('-')}`
    }
    if (keys.has('sta_iv')) {
      if (andStr) andStr += '&'
      andStr += `S${filter.sta_iv.join('-')}`
    }
    if (keys.has('level')) {
      if (andStr) andStr += '&'
      andStr += `L${filter.level.join('-')}`
    }
    if (keys.has('cp')) {
      if (andStr) andStr += '&'
      andStr += `CP${filter.cp.join('-')}`
    }
    let orStr = ''
    if (keys.has('xxs')) {
      if (orStr) orStr += '|'
      orStr += `X1`
    }
    if (keys.has('xxl')) {
      if (orStr) orStr += '|'
      orStr += `X5`
    }
    if (keys.has('great')) {
      if (orStr) orStr += '|'
      orStr += `GL${filter.great.join('-')}`
    }
    if (keys.has('ultra')) {
      if (orStr) orStr += '|'
      orStr += `UL${filter.ultra.join('-')}`
    }
    if (keys.has('little')) {
      if (orStr) orStr += '|'
      orStr += `LC${filter.little.join('-')}`
    }
    if (andStr && !(andStr.startsWith('(') && andStr.endsWith(')')) && orStr) {
      andStr = `(${andStr})`
    }
    if (orStr && andStr) {
      orStr = `(${orStr})`
    }
    let merged = andStr ? `${andStr}${orStr ? `|${orStr}` : ''}` : orStr
    if (keys.has('gender')) {
      if (merged) merged = `(${merged})`
      merged += `&G${filter.gender}`
    }
    log.info(HELPERS.pokemon, this.id, {
      andStr,
      orStr,
      merged,
    })
    return merged
  }

  /**
   * @param {string} filter
   * @returns {(pokemon?: import("../../../types").Pokemon) => boolean}
   */
  getCallback(global = false) {
    const filter = global ? this.global : this.filter
    if (this.mods.onlyLegacy) {
      return filter.adv ? jsifyIvFilter(this.global.adv) : () => true
    }
    const keys = global ? this.globalKeys : this.filterKeys
    return keys.size ||
      (global ? this.mods.onlyZeroIv || this.mods.onlyHundoIv : false)
      ? jsifyIvFilter(this.createExpertFilter(filter, keys))
      : () => !global
  }

  /**
   * @param {import("./constants").PkmnFilter} filter
   * @returns {Set<(typeof import("./constants").KEYS)[number]>}
   */
  getRelevantKeys(filter = this.filter) {
    return new Set(
      KEYS.filter(
        (key) =>
          (config.api.pvp.leagueObj[key] ? this.perms.pvp : this.perms.iv) &&
          this.isActive(key, filter),
      ),
    )
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
   * @param {import("../../../types").PvpEntry} entry
   * @param {typeof import("./constants").LEAGUES[number]} league
   * @returns {boolean}
   */
  pvpCheck(entry, league) {
    const rankCheck =
      between(entry.rank, ...this.filter[league]) ||
      between(entry.rank, ...this.global[league])
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

  // /**
  //  * @param {(typeof import("./constants").KEYS)[number]} key
  //  * @param {import("./constants").PkmnFilter} global
  //  * @returns {number[]}
  //  */
  // getMinMax(key, global) {
  //   const localOn = this.isActive(key)
  //   const globalOn = this.isActive(key, global)
  //   let [min, max] = localOn ? this.filter[key] : [Infinity, -Infinity]
  //   if (globalOn) {
  //     const [globalMin, globalMax] = global[key]
  //     min = Math.min(min, globalMin)
  //     max = Math.max(max, globalMax)
  //   }
  //   return [min, max]
  // }

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
              (this.filterKeys.has(league) || this.globalKeys.has(league)) &&
              this.pvpCheck(entry, league)
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
            if (Array.isArray(values) && this.filterKeys.has(league)) {
              return [league, values]
            }
            return [league, undefined]
          }),
        )
      : undefined
    if (this.mods.onlyLegacy) {
      return { expert: adv }
    }
    if (!this.filterKeys.size) {
      return { additional: { include_everything: true } }
    }
    return {
      iv: this.filterKeys.has('iv') ? iv : undefined,
      atk_iv: this.filterKeys.has('atk_iv') ? atk_iv : undefined,
      def_iv: this.filterKeys.has('def_iv') ? def_iv : undefined,
      sta_iv: this.filterKeys.has('sta_iv') ? sta_iv : undefined,
      cp: this.filterKeys.has('cp') ? cp : undefined,
      level: this.filterKeys.has('level') ? level : undefined,
      gender: this.filterKeys.has('gender') ? gender : undefined,
      pvp: Object.keys(pvp || {}).length ? pvp : undefined,
      additional: {
        include_everything: false,
        include_xxs: this.filterKeys.has('xxs') ? xxs : undefined,
        include_xxl: this.filterKeys.has('xxl') ? xxl : undefined,
      },
    }
  }

  /**
   * @param {import('../../../types').Pokemon} pokemon
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
        if (this.expertGlobal(pokemon)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * @param {import('../../../types').Pokemon} pokemon
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
   * @param {import('../../../types').Pokemon} pokemon
   * @returns {Partial<import('../../../types').Pokemon>}
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
    } else {
      result.cleanPvp = {}
    }
    return result
  }
}
