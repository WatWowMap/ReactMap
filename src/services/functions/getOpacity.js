export default function getOpacity(timestamp) {
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now
  if (!diff || diff > 600) return 1
  if (diff > 300) return 0.75
  if (diff > 60) return 0.5
  return 0.25
}
