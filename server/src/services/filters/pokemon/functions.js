/* eslint-disable no-nested-ternary */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable default-case */
const requireFromString = require('require-from-string')

/**
 * @param {object} pokemon
 * @returns {{ [key in typeof import("./constants").LEAGUES[number]]: PokemonEntry[] }}
 */
function getParsedPvp(pokemon) {
  if (pokemon.pvp)
    return typeof pokemon.pvp === 'string'
      ? JSON.parse(pokemon.pvp)
      : pokemon.pvp

  const parsed = {}
  const pvpKeys = ['great', 'ultra']
  pvpKeys.forEach((league) => {
    if (pokemon[`pvp_rankings_${league}_league`]) {
      parsed[league] = JSON.parse(pokemon[`pvp_rankings_${league}_league`])
    }
  })
  return parsed
}

/**
 * @template {Record<string, any>} T
 * @param {T} incoming
 * @param {T} reference
 * @returns {boolean}
 */
function deepCompare(incoming, reference) {
  return Object.entries(incoming).every(([key, value]) => {
    const refValue = reference[key]
    if (typeof value === 'object') {
      if (Array.isArray(value) && Array.isArray(refValue)) {
        return (
          value.every((val, i) => val === refValue[i]) &&
          value.length === refValue.length
        )
      }
      return deepCompare(value, refValue)
    }
    return value === refValue
  })
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function between(value, min, max) {
  return value >= min && value <= max
}

/**
 *
 * @param {object} newObject
 * @param {object} reference
 * @param {string[]} props
 */
function assign(newObject, reference, props) {
  for (let i = 0; i < props.length; i += 1) {
    const prop = props[i]
    newObject[prop] = reference[prop]
  }
}

/**
 *
 * @param {string} filter
 * @returns {(pokemon: object) => boolean}
 */
function jsifyIvFilter(filter) {
  const input = filter.toUpperCase()
  const tokenizer =
    /\s*([()|&!,]|([ADSLXG]?|CP|LC|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
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
          case 'A':
            column = 'atk_iv'
            break
          case 'D':
            column = 'def_iv'
            break
          case 'G':
            column = 'gender'
            break
          case 'S':
            column = 'sta_iv'
            break
          case 'L':
            column = 'level'
            break
          case 'X':
            column = 'size'
            break
          case 'CP':
            column = 'cp'
            break
          case 'GL':
            column = 'cleanPvp'
            subColumn = 'great'
            break
          case 'UL':
            column = 'cleanPvp'
            subColumn = 'ultra'
            break
          case 'LC':
            column = 'cleanPvp'
            subColumn = 'little'
            break
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

module.exports = {
  getParsedPvp,
  deepCompare,
  between,
  assign,
  jsifyIvFilter,
}
