export function setDeep(obj: object, path: string | string[], value: any) {
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
