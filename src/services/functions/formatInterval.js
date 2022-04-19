export default function formatInterval(intervalMs) {
  const diff = Math.floor(intervalMs / 1000)
  const d = Math.floor(diff / 86400)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = Math.floor(diff % 3600 % 60)
  const str = []

  if (d > 0) {
    str.push(`${d} ${d > 1 ? 'days' : 'day'}`)
  } else {
    if (h > 0) str.push(`${h}h`)
    if (m > 0) str.push(`${m}m`)
    if (s > 0 || str.length === 0) str.push(`${s}s`)
  }

  return { str: str.join(' '), diff }
}
