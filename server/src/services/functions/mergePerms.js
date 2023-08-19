// @ts-check

/**
 *
 * @param {import("@rm/types").Permissions} existingPerms
 * @param {import("@rm/types").Permissions} incomingPerms
 */
function mergePerms(existingPerms, incomingPerms) {
  return /** @type {import("@rm/types").Permissions} */ (
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
