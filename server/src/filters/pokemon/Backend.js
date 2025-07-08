// @ts-check

/* eslint-disable no-unused-vars */
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { AND_KEYS, BASE_KEYS } = require('./constants')
const {
  deepCompare,
  between,
  assign,
  getParsedPvp,
  jsifyIvFilter,
  dnfifyIvFilter,
} = require('./functions')
const { filterRTree } = require('../../utils/filterRTree')
const { PokemonFilter } = require('./Frontend')
const { state } = require('../../services/state')

class PkmnBackend {
  /**
   * @param {`${number}-${number}` | 'global'} id
   * @param {import("./Frontend").PokemonFilter} filter
   * @param {import("./Frontend").PokemonFilter} global
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
   * @param {boolean} mods.onlyEasyMode
   * @param {string[]} mods.onlyAreas
   * @param {boolean} mods.onlyLegacy
   */
  constructor(id, filter, global, perms, mods) {
    /** @type {import("@rm/types").Config['api']['pvp']} */
    this.pvpConfig = config.getSafe('api.pvp')

    const [pokemon, form] = id.split('-', 2).map(Number)
    this.id = id
    this.pokemon = pokemon || 0
    this.form = form || 0

    this.perms = perms
    this.mods = mods
    this.standard = new PokemonFilter()
    this.allKeys = [...BASE_KEYS, ...this.pvpConfig.leagues.map((l) => l.name)]
    this.filter = filter
    this.global = global
    this.filterKeys = this.getRelevantKeys(filter)
    this.globalKeys = this.getRelevantKeys(global)
    this.expertFilter = this.getCallback(id === 'global')
    this.expertGlobal = this.getCallback(true)
    this.isEqualToGlobal =
      this.expertFilter?.toString() === this.expertGlobal?.toString()
  }

  get keyArray() {
    return [...this.filterKeys]
  }

  createExpertFilter(filter = this.filter, keys = this.filterKeys) {
    let andStr = ''
    let orStr = ''

    if (this.perms.iv) {
      if (keys.has('iv')) {
        if (andStr) andStr += '&'
        andStr += filter.iv.join('-')
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
      if (keys.has('xxs')) {
        if (orStr) orStr += '|'
        orStr += `X1`
      }
      if (keys.has('xxl')) {
        if (orStr) orStr += '|'
        orStr += `X5`
      }
    }
    if (this.perms.pvp) {
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
    }
    if (andStr && !(andStr.startsWith('(') && andStr.endsWith(')')) && orStr) {
      andStr = `(${andStr})`
    }
    if (orStr && andStr) {
      orStr = `(${orStr})`
    }
    let merged = andStr ? `${andStr}${orStr ? `|${orStr}` : ''}` : orStr
    if (keys.has('gender') && this.perms.iv) {
      if (merged) merged = `(${merged})&`
      merged += `G${filter.gender}`
    }
    log.trace(TAGS.pokemon, this.id, {
      andStr,
      orStr,
      merged,
    })
    return merged
  }

  /**
   * @param {boolean} global
   * @returns {(pokemon?: Partial<import("@rm/types").Pokemon>) => boolean}
   */
  getCallback(global = false) {
    const filter = global ? this.global : this.filter
    if (this.mods.onlyLegacy) {
      return filter.adv ? jsifyIvFilter(filter.adv) : () => true
    }
    const keys = global ? this.globalKeys : this.filterKeys
    return keys.size ||
      (global ? this.mods.onlyZeroIv || this.mods.onlyHundoIv : false)
      ? jsifyIvFilter(this.createExpertFilter(filter, keys))
      : () => !global
  }

  /**
   * @param {import("./Frontend").PokemonFilter} filter
   * @returns {Set<string>}
   */
  getRelevantKeys(filter = this.filter) {
    return this.filter.all
      ? new Set()
      : new Set(
          this.allKeys.filter(
            (key) =>
              (this.pvpConfig.leagueObj[key]
                ? this.perms.pvp
                : this.perms.iv) && this.isActive(key, filter),
          ),
        )
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  isActive(key, filter = this.filter) {
    switch (typeof this.standard[key]) {
      case 'boolean':
      case 'string':
      case 'number':
        return filter[key] !== this.standard[key]
      default:
        return Array.isArray(filter[key])
          ? filter[key].some((v, i) => v !== this.standard[key][i])
          : !deepCompare(filter[key], this.standard[key])
    }
  }

  /**
   * @param {import("ohbem").PvPRankEntry} entry
   * @param {string} league
   * @returns {boolean}
   */
  pvpCheck(entry, league) {
    const rankCheck =
      between(entry.rank, ...this.filter[league]) ||
      between(entry.rank, ...this.global[league])
    if (!rankCheck) return false

    const cpCheck =
      this.mods.pvpV2 ||
      this.pvpConfig.reactMapHandlesPvp ||
      entry.cp >= this.pvpConfig.minCp[league]
    if (!cpCheck) return false

    const megaCheck = !entry.evolution || this.mods.onlyPvpMega
    if (!megaCheck) return false

    const capCheck =
      this.mods.pvpV2 || this.pvpConfig.reactMapHandlesPvp
        ? entry.capped || this.mods[`onlyPvp${entry.cap}`]
        : true
    if (!capCheck) return false

    return true
  }

  /**
   * @param {string} league
   * @param {import("ohbem").PvPRankEntry[]} data
   * @returns {{ best: number; filtered: import("ohbem").PvPRankEntry[]}}
   */
  getRanks(league, data) {
    const filtered =
      this.mods.onlyAllPvp || this.mods.onlyLegacy || this.filter.all
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
   *
   * @param {number[]} filter
   * @param {number} [limit]
   * @returns DnfMinMax
   */
  static ensureSafe(filter, limit = 100) {
    // eslint-disable-next-line no-nested-ternary
    const [min, max] = filter.map((x, i) => (x > limit ? (i ? limit : 0) : x))
    return { min, max }
  }

  /**
   * Build the API filter for Golbat
   * @param {import('@rm/types').FilterId[]} [pokemon]
   * @returns {import('@rm/types').DnfFilter[]}
   */
  buildApiFilter(pokemon = undefined) {
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
    if (this.id !== 'global') {
      if (pokemon === undefined) {
        pokemon = [{ id: this.pokemon, form: this.form }]
      }
      if (!this.filterKeys.size || (!this.perms.iv && !this.perms.pvp)) {
        return [{ pokemon, iv: { min: -1, max: 100 } }]
      }
      if (this.isEqualToGlobal) {
        return []
      }
    }
    if (this.mods.onlyLegacy) {
      return dnfifyIvFilter(adv, pokemon)
    }
    const results = /** @type {import('@rm/types').DnfFilter[]} */ ([])
    if (
      this.perms.iv &&
      ((this.filterKeys.has('gender') && this.filterKeys.size === 1) ||
        AND_KEYS.some((k) => this.filterKeys.has(k)))
    ) {
      results.push({
        pokemon,
        iv: this.filterKeys.has('iv') ? PkmnBackend.ensureSafe(iv) : undefined,
        atk_iv: this.filterKeys.has('atk_iv')
          ? PkmnBackend.ensureSafe(atk_iv, 15)
          : undefined,
        def_iv: this.filterKeys.has('def_iv')
          ? PkmnBackend.ensureSafe(def_iv, 15)
          : undefined,
        sta_iv: this.filterKeys.has('sta_iv')
          ? PkmnBackend.ensureSafe(sta_iv, 15)
          : undefined,
        cp: this.filterKeys.has('cp')
          ? PkmnBackend.ensureSafe(cp, this.standard.cp[1])
          : undefined,
        level: this.filterKeys.has('level')
          ? PkmnBackend.ensureSafe(level)
          : undefined,
        gender: this.filterKeys.has('gender')
          ? { min: gender, max: gender }
          : undefined,
      })
    }
    if (this.perms.pvp) {
      Object.entries(rest).forEach(([league, values]) => {
        if (Array.isArray(values) && this.filterKeys.has(league)) {
          /** @type {import('@rm/types').DnfFilter} */
          const pvpFilter = {
            pokemon,
            [`pvp_${league}`]: PkmnBackend.ensureSafe(
              values,
              this.standard[league]?.[1],
            ),
          }
          if (this.filterKeys.has('gender')) {
            pvpFilter.gender = { min: gender, max: gender }
          }
          results.push(pvpFilter)
        }
      })
    }
    if (this.filterKeys.has('xxs')) {
      /** @type {import('@rm/types').DnfFilter} */
      const xxsFilter = { pokemon, size: { min: 1, max: 1 } }
      if (this.filterKeys.has('gender')) {
        xxsFilter.gender = { min: gender, max: gender }
      }
      results.push(xxsFilter)
    }
    if (this.filterKeys.has('xxl')) {
      /** @type {import('@rm/types').DnfFilter} */
      const xxlFilter = { pokemon, size: { min: 5, max: 5 } }
      if (this.filterKeys.has('gender')) {
        xxlFilter.gender = { min: gender, max: gender }
      }
      results.push(xxlFilter)
    }
    return results
  }

  /**
   * @param {Partial<import("@rm/types").Pokemon>} pokemon
   * @return {boolean}
   */
  valid(pokemon) {
    if (
      !this.mods.mem ||
      filterRTree(pokemon, this.perms.areaRestrictions, this.mods.onlyAreas)
    ) {
      if (
        (this.mods.onlyHundoIv && pokemon.iv === 100) ||
        (this.mods.onlyZeroIv && pokemon.iv === 0)
      )
        return true
      if (
        !this.mods.onlyLinkGlobal ||
        (this.pokemon === pokemon.pokemon_id && this.form === pokemon.form)
      ) {
        if (!this.expertFilter || !this.expertGlobal) return true
        if (this.expertFilter(pokemon)) {
          return true
        }
        if (this.expertGlobal(pokemon)) {
          return true
        }
      }
    }
    log.trace(pokemon)
    return false
  }

  /**
   * @param {import("@rm/types").Pokemon} pokemon
   * @param {number} [ts]
   * @returns {{ cleanPvp: import('@rm/types').CleanPvp, bestPvp: number }}
   */
  buildPvp(pokemon, ts = Math.floor(Date.now() / 1000)) {
    const parsed = this.pvpConfig.reactMapHandlesPvp
      ? state.pvp.resultWithCache(pokemon, ts)
      : getParsedPvp(pokemon)
    const cleanPvp = /** @type {import('@rm/types').CleanPvp} */ ({})
    let bestPvp = 4096
    Object.keys(parsed).forEach((league) => {
      if (this.pvpConfig.leagueObj[league]) {
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
   * @param {import("@rm/types").Pokemon} pokemon
   * @returns {Partial<import("@rm/types").Pokemon>}
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
        state.event.masterfile.pokemon[result.display_pokemon_id]
          ?.defaultFormId || 0
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
    if (this.perms.pvp && pokemon.cp) {
      const { cleanPvp, bestPvp } = this.buildPvp(pokemon)
      result.bestPvp = bestPvp
      result.cleanPvp = cleanPvp
    } else {
      result.cleanPvp = {}
    }
    return result
  }
}

module.exports = { PkmnBackend }
