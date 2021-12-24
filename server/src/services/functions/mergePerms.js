module.exports = function mergePerms(existingPerms, incomingPerms) {
  return Object.fromEntries(
    Object.keys(existingPerms).map(key => [key, existingPerms[key] || incomingPerms[key]]),
  )
}
