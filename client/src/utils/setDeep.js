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
    const next = path.shift()
    setDeep(
      (obj[next] =
        Object.prototype.toString.call(obj[next]) === '[object Object]'
          ? { ...obj[next] }
          : {}),
      path,
      value,
    )
  } else {
    obj[path[0]] =
      typeof value === 'object'
        ? Array.isArray(value)
          ? value.slice()
          : { ...value }
        : value
  }

  return { ...obj }
}
