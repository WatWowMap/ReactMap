// @ts-check
import { capitalize } from '@mui/material/utils'

/** @param {string} str */
export function camelToSnake(str) {
  return str.replace(/([a-z](?=[A-Z]))/g, '$1_').toLowerCase()
}

/**
 * @param {string} str
 * @param {string} [separator]
 */
export function fromSnakeCase(str, separator = ' ') {
  return capitalize(str)
    .replace(/_/g, separator)
    .replace(/([a-z\d])([A-Z])/g, `$1${separator}$2`)
    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, `$1${separator}$2`)
}

/**
 * @param {string} str
 */
export function getProperName(str) {
  const capital = `${str.charAt(0).toUpperCase()}${str.slice(1)}`
  return capital.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}
