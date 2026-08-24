// @ts-check

/**
 * Callers pass a single provider's perms row, or the accumulator folding
 * several of them together -- neither is guaranteed to carry every key of
 * the full `Permissions` interface, so both sides are typed as partial
 * rather than complete.
 *
 * @param {Partial<import("@rm/types").Permissions>} existingPerms
 * @param {Partial<import("@rm/types").Permissions>} incomingPerms
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
