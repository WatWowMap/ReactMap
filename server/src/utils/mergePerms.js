// @ts-check
const { normalizeAreaRestrictions } = require('./areaPerms')

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
        const hasUnrestrictedAreaGrant =
          key === 'areaRestrictions' &&
          ((Array.isArray(existingValue) && existingValue.length === 0) ||
            (Array.isArray(incomingValue) && incomingValue.length === 0))

        return [
          key,
          Array.isArray(existingValue) || Array.isArray(incomingValue)
            ? key === 'areaRestrictions'
              ? hasUnrestrictedAreaGrant
                ? []
                : normalizeAreaRestrictions([
                    ...new Set([
                      ...(existingValue || []),
                      ...(incomingValue || []),
                    ]),
                  ])
              : [
                  ...new Set([
                    ...(existingValue || []),
                    ...(incomingValue || []),
                  ]),
                ]
            : existingValue || incomingValue,
        ]
      }),
    )
  )
}

module.exports = { mergePerms }
