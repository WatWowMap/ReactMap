// @ts-check
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable default-case */
const vm = require('vm')

const NodeCache = require('node-cache')
const { log, TAGS } = require('@rm/logger')

/**
 * @param {object} pokemon
 * @returns {Record<string, import("ohbem").PvPRankEntry[]>}
 */
function getParsedPvp(pokemon) {
  if (pokemon.pvp)
    return typeof pokemon.pvp === 'string'
      ? JSON.parse(pokemon.pvp)
      : pokemon.pvp

  const parsed = { great: [], ultra: [], little: [] }
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
 * @param {...number} args
 */
function between(value, ...args) {
  return value >= args[0] && value <= args[1]
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
 * @param {string} filter
 * @returns {(pokemon: import("@rm/types").Pokemon) => boolean}
 */
const jsFnCache = new NodeCache({ stdTTL: 60 * 5 })

/**
 *
 * @param {string} filter
 * @returns {(pokemon: import("@rm/types").Pokemon) => boolean}
 */
function jsifyIvFilter(filter) {
  if (jsFnCache.has(filter)) {
    return jsFnCache.get(filter)
  }
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
          result += `((pokemon['${column}']?.['${subColumn}'] || []).some(x => x.rank >= ${lower} && x.rank <= ${upper}))`
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
  log.trace(TAGS.pokemon, result)
  const fn = vm.runInNewContext(`(pokemon) => ${result};`)

  jsFnCache.set(filter, fn)

  return fn
}

/**
 *
 * @param {string} filter
 * @param {import('@rm/types').FilterId[]} pokemon
 * @returns
 */
function dnfifyIvFilter(filter, pokemon) {
  const results = /** @type {import('@rm/types').DnfFilter[]} */ ([])
  const input = filter.toUpperCase()
  const tokenizer =
    /\s*([|&,]|([ADSLXG]?|CP|LC|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
  let expectClause = true // expect a clause or '('
  let lastIndex = 0
  let match
  let clause = { pokemon }

  while ((match = tokenizer.exec(input)) !== null) {
    if (match.index > lastIndex) {
      return []
    }
    if (expectClause) {
      if (match[3] === undefined) {
        return []
      }
      let column = 'iv'

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
          column = 'pvp_great'
          break
        case 'UL':
          column = 'pvp_ultra'
          break
        case 'LC':
          column = 'pvp_little'
          break
      }
      const minMax = { min: parseFloat(match[3]) }

      if (match[4] !== undefined) {
        minMax.max = parseInt(match[4])
      } else {
        minMax.max = minMax.min
      }
      clause[column] = minMax
      expectClause = false
    } else if (match[3] !== undefined) {
      return []
    } else {
      switch (match[1]) {
        case '&':
          expectClause = true
          break
        case '|':
        case ',':
          results.push(clause)
          clause = { pokemon }
          expectClause = true
          break
      }
    }
    lastIndex = tokenizer.lastIndex
  }
  if (expectClause) {
    return [{ pokemon, iv: { min: -1, max: 100 } }]
  }
  results.push(clause)

  return results
}

module.exports = {
  getParsedPvp,
  deepCompare,
  between,
  assign,
  jsifyIvFilter,
  dnfifyIvFilter,
}
