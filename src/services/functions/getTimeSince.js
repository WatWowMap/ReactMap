export default function getTimeSince(date) {
  const diff = Math.round((new Date() - date) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = Math.floor(diff % 3600 % 60)
  let str = ''
  if (h > 0) {
    str = `${h}h ${m}m ${s}s`
  } else if (m > 0) {
    str = `${m}m ${s}s`
  } else {
    str = `${s}s`
  }

  return str
}
