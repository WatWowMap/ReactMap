module.exports = function buildInvasions() {
  const invasions = {}

  for (let i = 1; i <= 50; i += 1) {
    invasions[`i${i}`] = { enabled: true, size: 'md' }
  }

  return invasions
}
