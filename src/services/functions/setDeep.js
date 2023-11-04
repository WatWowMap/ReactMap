// @ts-check
/**
 *
 * @param {object} obj
 * @param {string | string[]} path
 * @param {any} value
 */
export function setDeep(obj, path, value) {
  if (typeof path === 'string') {
    path = path.split('.')
  }
  if (path.length > 1) {
    const e = path.shift()
    setDeep(
      (obj[e] =
        Object.prototype.toString.call(obj[e]) === '[object Object]'
          ? { ...obj[e] }
          : {}),
      path,
      value,
    )
  } else {
    obj[path[0]] = value
  }
  return { ...obj }
}
