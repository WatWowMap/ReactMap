/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable default-case */
const requireFromString = require('require-from-string')
const masterfile = require('../data/masterfile.json')

const jsifyIvFilter = (filter) => {
  const input = filter.toUpperCase()
  const tokenizer = /\s*([()|&!,]|([ADSL]?|CP|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
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
        switch (match[2]) {
          case 'A': column = 'atk_iv'; break
          case 'D': column = 'def_iv'; break
          case 'S': column = 'sta_iv'; break
          case 'L': column = 'level'; break
          case 'CP': column = 'cp'; break
          case 'GL': column = 'pvp_rankings_great_league'; break
          case 'UL': column = 'pvp_rankings_ultra_league'; break
        }
        let upper = lower
        if (match[4] !== undefined) {
          upper = parseFloat(match[4])
        }
        if (column.endsWith('_league')) {
          result += `((pokemon['${column}'] || []).some(x => x.rank >= ${lower} && x.rank <= ${upper}))`
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

module.exports = function getPokemon(results, args, perms) {
  const pokemonLookup = {}
  const formLookup = {}
  const pokemonFilterIV = {
    or: args.filters.onlyIvOr.adv,
  }
  Object.keys(args.filters).forEach(pkmn => {
    if (pkmn.charAt(0) !== 'o') {
      pokemonFilterIV[pkmn] = args.filters[pkmn].adv
    }
  })

  let includeBigKarp = false
  let includeTinyRat = false
  const interestedLevelCaps = [40, 50, 51]
  const interestedMegas = [1, 2, 3, 'experimental_stats']
  for (const key of args.filters.onlyLegacyExclude || []) {
    if (key === 'ivAnd') continue
    const split = key.split('-', 2)
    if (split.length === 2) {
      const pokemonId = parseInt(split[0])
      const formId = parseInt(split[1])
      if ((masterfile.pokemon[pokemonId] || {}).default_form_id === formId) {
        pokemonLookup[pokemonId] = false
      }
      formLookup[formId] = false
    } else if (key === 'big_karp') {
      includeBigKarp = true
    } else if (key === 'tiny_rat') {
      includeTinyRat = true
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
        const defaultForm = (masterfile.pokemon[pokemonId] || {}).default_form_id
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
        if ((masterfile.pokemon[pokemonId] || {}).default_form_id === formId) {
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
          const defaultForm = (masterfile.pokemon[pokemonId] || {}).default_form_id
          if (defaultForm) {
            formLookup[defaultForm] = jsFilter
          }
        }
      }
    }
  }

  const pokemon = []
  if (results && results.length > 0) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const filtered = {}
      if (perms.iv || perms.stats) {
        filtered.atk_iv = result.atk_iv
        filtered.def_iv = result.def_iv
        filtered.sta_iv = result.sta_iv
        filtered.cp = result.cp
        filtered.iv = result.iv
        filtered.level = result.level
      }
      if (perms.pvp && interestedLevelCaps.length > 0) {
        const minCpGreat = 1400
        const minCpUltra = 2400
        const filterLeagueStats = (pvpResult, target, minCp) => {
          let last
          for (const entry of JSON.parse(pvpResult)) {
            if ((minCp && entry.cp < minCp) || (entry.cap !== undefined && (entry.capped
              ? interestedLevelCaps[interestedLevelCaps.length - 1] < entry.cap
              : !interestedLevelCaps.includes(entry.cap)))) {
              continue
            }
            if (entry.evolution) {
              if (masterfile.pokemon[entry.pokemon].temp_evolutions[entry.evolution].unreleased
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
              target.push(entry)
              last = entry
            }
          }
        }
        if (result.pvp_rankings_great_league) {
          filterLeagueStats(result.pvp_rankings_great_league, filtered.great = [], minCpGreat)
        }
        if (result.pvp_rankings_ultra_league) {
          filterLeagueStats(result.pvp_rankings_ultra_league, filtered.ultra = [], minCpUltra)
        }
      }
      let pokemonFilter = result.form === 0 ? pokemonLookup[result.pokemon_id] : formLookup[result.form]
      if (pokemonFilter === undefined) {
        pokemonFilter = andIv(filtered) || orIv(filtered)
      } else if (pokemonFilter === false) {
        pokemonFilter = orIv(filtered)
      } else {
        pokemonFilter = pokemonFilter(filtered)
      }
      if (!(pokemonFilter
        || (includeBigKarp && result.pokemon_id === 129 && result.weight !== null && result.weight >= 13.125)
        || (includeTinyRat && result.pokemon_id === 19 && result.weight !== null && result.weight <= 2.40625))) {
        continue
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
      if (perms.iv || perms.stats) {
        filtered.move_1 = result.move_1
        filtered.move_2 = result.move_2
        filtered.weight = result.weight
        filtered.size = result.size
        filtered.display_pokemon_id = result.display_pokemon_id
      }
      pokemon.push(filtered)
    }
  }
  return pokemon
}
