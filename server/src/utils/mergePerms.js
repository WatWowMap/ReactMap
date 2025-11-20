// @ts-check

/**
 *
 * @param {import("@rm/types").Permissions} existingPerms
 * @param {import("@rm/types").Permissions} incomingPerms
 */
function mergePerms(existingPerms, incomingPerms) {
  const keys = new Set([
    ...Object.keys(existingPerms),
    ...Object.keys(incomingPerms),
  ])

  return /** @type {import("@rm/types").Permissions} */ (
    Object.fromEntries(
      [...keys].map((key) => {
        const existingValue = existingPerms[key]
        const incomingValue = incomingPerms[key]

        return [
          key,
          Array.isArray(existingValue) || Array.isArray(incomingValue)
            ? [...new Set([...(existingValue || []), ...(incomingValue || [])])]
            : existingValue || incomingValue,
        ]
      }),
    )
  )
}

module.exports = { mergePerms }
