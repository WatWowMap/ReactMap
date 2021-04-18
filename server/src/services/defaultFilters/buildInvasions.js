module.exports = function buildInvasions(perms) {
  const invasions = {}

  if (perms.invasions) {
    for (let i = 1; i <= 50; i += 1) {
      invasions[`i${i}`] = { enabled: true, size: 'md' }
    }
  }
  return invasions
}
