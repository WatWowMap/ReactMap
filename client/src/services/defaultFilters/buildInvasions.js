export default function () {
  const invasions = {}

  for (let i = 1; i <= 50; i++) {
    invasions[`i${i}`] = { enabled: true, size: 'md' }
  }

  return invasions
}
