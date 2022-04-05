/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable default-case */
const requireFromString = require('require-from-string')
const masterfile = require('../data/masterfile.json')
const {
  api: { pvp: { minCp: pvpMinCp, reactMapHandlesPvp } },
} = require('./config')
const PvpWrapper = require('./PvpWrapper')

const jsifyIvFilter = (filter) => {
  const input = filter.toUpperCase()
  const tokenizer = /\s*([()|&!,]|([ADSL]?|CP|LC|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
  let result = ''
  let expectClause = true // expect a clause or '('
  let stack = 0
  let lastIndex = 0
  let match
  while ((match = tokenizer.exec(input)) !== null) {
    if (match.index > lastIndex) {
      return null
    }
    if (expectClause) {
      if (match[3] !== undefined) {
        const lower = parseFloat(match[3])
        let column = 'iv'
        let subColumn
        switch (match[2]) {
          case 'A': column = 'atk_iv'; break
          case 'D': column = 'def_iv'; break
          case 'S': column = 'sta_iv'; break
          case 'L': column = 'level'; break
          case 'CP': column = 'cp'; break
          case 'GL':
            column = 'cleanPvp'
            subColumn = 'great'; break
          case 'UL':
            column = 'cleanPvp'
            subColumn = 'ultra'; break
          case 'LC':
            column = 'cleanPvp'
            subColumn = 'little'; break
        }
        let upper = lower
        if (match[4] !== undefined) {
          upper = parseFloat(match[4])
        }
        if (subColumn) {
          result += `((pokemon['${column}']['${subColumn}'] || []).some(x => x.rank >= ${lower} && x.rank <= ${upper}))`
        } else {
          result += `(pokemon['${column}'] !== null && pokemon['${column}'] >= ${lower} && pokemon['${column}'] <= ${upper})`
        }
        expectClause = false
      } else {
        switch (match[1]) {
          case '(':
            if (++stack > 1000000000) {
              return null
            }
            result += '('
            break
          case '!':
            result += '!'
            break
          default:
            return null
        }
      }
    } else if (match[3] !== undefined) {
      return null
    } else {
      switch (match[1]) {
        case '(':
        case '!':
          return null
        case ')':
          result += ')'
          if (--stack < 0) {
            return null
          }
          break
        case '&':
          result += '&&'
          expectClause = true
          break
        case '|':
        case ',':
          result += '||'
          expectClause = true
          break
      }
    }
    lastIndex = tokenizer.lastIndex
  }
  if (expectClause || stack !== 0 || lastIndex < filter.length) {
    return null
  }
  return requireFromString(`module.exports = (pokemon) => ${result};`)
}

const getLegacy = (results, args, perms, ts) => {
  const pokemonLookup = {}
  const formLookup = {}
  const pokemonFilterIV = { or: args.filters.onlyIvOr.adv }
  Object.keys(args.filters).forEach(pkmn => {
    if (pkmn.charAt(0) !== 'o') {
      pokemonFilterIV[pkmn] = args.filters[pkmn].adv
    }
  })

  const interestedLevelCaps = Object.keys(args.filters)
    .filter(x => x.startsWith('onlyPvp') && args.filters[x])
    .map(y => parseInt(y.substring(7)))
  const interestedMegas = args.filters.pvpMega ? [1, 2, 3, 'experimental_stats'] : []

  for (const key of args.filters.onlyLegacyExclude || []) {
    if (key === 'global') continue
    const split = key.split('-', 2)
    if (split.length === 2) {
      const pokemonId = parseInt(split[0])
      const formId = parseInt(split[1])
      if ((masterfile.pokemon[pokemonId] || {}).defaultFormId === formId) {
        pokemonLookup[pokemonId] = false
      }
      formLookup[formId] = false
    } else if (key === 'mega_stats') {
      interestedMegas.push(1)
      interestedMegas.push(2)
      interestedMegas.push(3)
    } else if (key === 'experimental_stats') {
      interestedMegas.push('experimental')
    } else if (key === 'level40_stats') {
      interestedLevelCaps.push(40)
    } else if (key === 'level41_stats') {
      interestedLevelCaps.push(41)
    } else if (key === 'level50_stats') {
      interestedLevelCaps.push(50)
    } else if (key === 'level51_stats') {
      interestedLevelCaps.push(51)
    } else {
      const pokemonId = parseInt(key)
      if (Number.isNaN(pokemonId)) {
        // eslint-disable-next-line no-console
        console.warn('Unrecognized key', key)
      } else {
        pokemonLookup[pokemonId] = false
        const defaultForm = (masterfile.pokemon[pokemonId] || {}).defaultFormId
        if (defaultForm) {
          formLookup[defaultForm] = false
        }
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  let orIv = (_) => false
  // eslint-disable-next-line no-unused-vars
  let andIv = (_) => true
  if (perms.iv) {
    for (const [key, filter] of Object.entries(pokemonFilterIV || {})) {
      const jsFilter = jsifyIvFilter(filter)
      if (!jsFilter) {
        continue
      }
      const split = key.split('-', 2)
      if (split.length === 2) {
        const pokemonId = parseInt(split[0])
        const formId = parseInt(split[1])
        if ((masterfile.pokemon[pokemonId] || {}).defaultFormId === formId) {
          pokemonLookup[pokemonId] = jsFilter
        }
        formLookup[formId] = jsFilter
      } else if (key === 'and') {
        andIv = jsFilter
      } else if (key === 'or') {
        orIv = jsFilter
      } else {
        const pokemonId = parseInt(key)
        if (Number.isNaN(pokemonId)) {
          // eslint-disable-next-line no-console
          console.warn('Unrecognized key', key)
        } else {
          pokemonLookup[pokemonId] = jsFilter
          const defaultForm = (masterfile.pokemon[pokemonId] || {}).defaultFormId
          if (defaultForm) {
            formLookup[defaultForm] = jsFilter
          }
        }
      }
    }
  }

  let bestPvp = 4096
  const filterLeagueStats = (pvpResult, target, minCp) => {
    let last
    for (const entry of typeof pvpResult === 'string' ? JSON.parse(pvpResult) : pvpResult) {
      if ((minCp && entry.cp < minCp) || (entry.cap !== undefined && (entry.capped
        ? interestedLevelCaps[interestedLevelCaps.length - 1] < entry.cap
        : !interestedLevelCaps.includes(entry.cap)))) {
        continue
      }
      if (entry.evolution) {
        if (masterfile.pokemon[entry.pokemon].tempEvolutions[entry.evolution].unreleased
          ? !interestedMegas.includes('experimental')
          : !interestedMegas.includes(entry.evolution)) {
          continue
        }
      }
      if (last !== undefined && last.pokemon === entry.pokemon
        && last.form === entry.form && last.evolution === entry.evolution
        && last.level === entry.level && last.rank === entry.rank) {
        last.cap = entry.cap
        if (entry.capped) {
          last.capped = true
        }
      } else {
        if (entry.rank < bestPvp) {
          bestPvp = entry.rank
        }
        target.push(entry)
        last = entry
      }
    }
  }

  const pokemon = []
  if (results && results.length) {
    for (let i = 0; i < results.length; i++) {
      bestPvp = 4096
      const result = results[i]
      const filtered = {}
      if (result.pokemon_id === 132) {
        filtered.ditto_form = result.form
        result.form = masterfile.pokemon[result.pokemon_id]?.defaultFormId || 0
        const statsToCheck = ['atk', 'def', 'sta']
        statsToCheck.forEach(stat => {
          if (!result[`${stat}_iv`] && result[`${stat}_inactive`]) {
            result[`${stat}_iv`] = result[`${stat}_inactive`]
            result.inactive_stats = true
          }
        })
      }
      if (!result.seen_type) {
        if (result.spawn_id === null) {
          result.seen_type = result.pokestop_id ? 'nearby_stop' : 'nearby_cell'
        } else {
          result.seen_type = 'encounter'
        }
      }
      if (perms.iv) {
        filtered.atk_iv = result.atk_iv
        filtered.def_iv = result.def_iv
        filtered.sta_iv = result.sta_iv
        filtered.cp = result.cp
        filtered.iv = result.iv
        filtered.level = result.level
      }
      if (perms.pvp && interestedLevelCaps.length) {
        const { great, ultra } = pvpMinCp
        filtered.cleanPvp = {}
        if (result.pvp || (reactMapHandlesPvp && result.cp)) {
          const pvpResults = reactMapHandlesPvp ? PvpWrapper.resultWithCache(result, ts) : JSON.parse(result.pvp)
          Object.keys(pvpResults).forEach(league => {
            filterLeagueStats(pvpResults[league], filtered.cleanPvp[league] = [])
          })
        } else {
          if (result.pvp_rankings_great_league) {
            filterLeagueStats(result.pvp_rankings_great_league, filtered.cleanPvp.great = [], great)
          }
          if (result.pvp_rankings_ultra_league) {
            filterLeagueStats(result.pvp_rankings_ultra_league, filtered.cleanPvp.ultra = [], ultra)
          }
        }
        filtered.bestPvp = bestPvp
      }
      let pokemonFilter = result.form === 0 ? pokemonLookup[result.pokemon_id] : formLookup[result.form]
      if (pokemonFilter === undefined) {
        pokemonFilter = andIv(filtered) || orIv(filtered)
      } else if (pokemonFilter === false) {
        pokemonFilter = orIv(filtered)
      } else {
        pokemonFilter = pokemonFilter(filtered)
      }
      if (!pokemonFilter) {
        continue
      }
      if (!result.seen_type) {
        if (result.spawn_id === null) {
          filtered.seen_type = result.pokestop_id ? 'nearby_stop' : 'nearby_cell'
        } else {
          filtered.seen_type = 'encounter'
        }
      } else {
        filtered.seen_type = result.seen_type
      }
      filtered.id = result.id
      filtered.pokemon_id = result.pokemon_id
      filtered.lat = result.lat
      filtered.lon = result.lon
      filtered.spawn_id = result.spawn_id
      filtered.expire_timestamp = result.expire_timestamp
      filtered.gender = result.gender
      filtered.form = result.form
      filtered.costume = result.costume
      filtered.weather = result.weather
      filtered.shiny = result.shiny
      filtered.pokestop_id = result.pokestop_id
      filtered.first_seen_timestamp = result.first_seen_timestamp
      filtered.updated = result.updated
      filtered.changed = result.changed
      filtered.cellId = result.cell_id
      filtered.expire_timestamp_verified = result.expire_timestamp_verified
      filtered.display_pokemon_id = result.display_pokemon_id
      if (perms.iv) {
        filtered.move_1 = result.move_1
        filtered.move_2 = result.move_2
        filtered.weight = result.weight
        filtered.size = result.size
      }
      pokemon.push(filtered)
    }
  }
  return pokemon
}

module.exports = getLegacy
