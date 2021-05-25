export default function getTimers(date, until) {
  const diff = Math.round((until ? date - new Date() : new Date() - date) / 1000)
  const d = Math.floor(diff / 86400)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = Math.floor(diff % 3600 % 60)
  let str = ''

  if (d > 0) {
    str = `${d} Days`
  } else if (h > 0) {
    str = `${h}h ${m}m ${s}s`
  } else if (m > 0) {
    str = `${m}m ${s}s`
  } else {
    str = `${s}s`
  }

  return { str, diff }
}
