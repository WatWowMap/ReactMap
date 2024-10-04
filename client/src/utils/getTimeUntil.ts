import { formatInterval } from './formatInterval'

export function getTimeUntil(date: number, until = false) {
  return formatInterval(until ? date - Date.now() : Date.now() - date)
}
