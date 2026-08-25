/**
 * Callers pass a single provider's perms row, or the accumulator folding
 * several of them together -- neither is guaranteed to carry every key of
 * the full `Permissions` interface, so both sides are typed as partial
 * rather than complete.
 *
 */
function mergePerms(
  existingPerms: Partial<Record<string, any>>,
  incomingPerms: Partial<Record<string, any>>,
): Record<string, any> {
  const keys = new Set([
    ...Object.keys(existingPerms),
    ...Object.keys(incomingPerms),
  ])

  return Object.fromEntries(
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
}

export { mergePerms }
