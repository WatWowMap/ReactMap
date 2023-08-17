// @ts-check

/**
 *
 * @param {import("types").Permissions} existingPerms
 * @param {import("types").Permissions} incomingPerms
 */
function mergePerms(existingPerms, incomingPerms) {
  return /** @type {import("types").Permissions} */ (
    Object.fromEntries(
      Object.keys(existingPerms).map((key) => [
        key,
        Array.isArray(existingPerms[key])
          ? [...new Set([...existingPerms[key], ...incomingPerms[key]])]
          : existingPerms[key] || incomingPerms[key],
      ]),
    )
  )
}

module.exports = mergePerms
