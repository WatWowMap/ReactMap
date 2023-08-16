// @ts-check

/**
 *
 * @param {string[]} existingPerms
 * @param {string[]} incomingPerms
 * @returns
 */
function mergePerms(existingPerms, incomingPerms) {
  return Object.fromEntries(
    Object.keys(existingPerms).map((key) => [
      key,
      Array.isArray(existingPerms[key])
        ? [...new Set([...existingPerms[key], ...incomingPerms[key]])]
        : existingPerms[key] || incomingPerms[key],
    ]),
  )
}

module.exports = mergePerms
