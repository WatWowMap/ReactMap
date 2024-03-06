// @ts-check

/** @param {string} str */
export function camelToSnake(str) {
  return str.replace(/([a-z](?=[A-Z]))/g, '$1_').toLowerCase()
}
