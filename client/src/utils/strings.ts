import { capitalize } from '@mui/material/utils'

export function camelToSnake(str: string) {
  return str.replace(/([a-z](?=[A-Z]))/g, '$1_').toLowerCase()
}

export function fromSnakeCase(str: string, separator: string = ' ') {
  return capitalize(str)
    .replace(/_/g, separator)
    .replace(/([a-z\d])([A-Z])/g, `$1${separator}$2`)
    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, `$1${separator}$2`)
}

export function getProperName(str: string) {
  const capital = `${str.charAt(0).toUpperCase()}${str.slice(1)}`

  return capital.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}
