import formatInterval from '@services/functions/formatInterval';

export default function getTimers(date, until) {
  return formatInterval(until ? date - Date.now() : Date.now() - date)
}
