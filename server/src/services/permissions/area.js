// Tiny helper to evaluate areaRestrictions with role + area + parent filters.
// Accepts either "parent" or "parents" in rules. AND semantics by default.
const config = require('@rm/config')

/**
 * @param {{ scanAreasObj: Record<string, { properties?: { key?: string, name?: string, parent?: string } }> }} deps
 * @returns {(userRoles: string[]|undefined|null, areaKey: string) => boolean}
 */
function buildAreaPermissionChecker({ scanAreasObj }) {
  const rules = config.getSafe('authentication.areaRestrictions') || []
  if (!rules.length) return () => true

  return (userRoles, areaKey) => {
    const f = scanAreasObj[areaKey]
    const name = f?.properties?.name
    const parent = f?.properties?.parent || null
    const rolesSet = new Set(userRoles || [])

    return rules.some(rule => {
      const roles   = rule.roles   || []
      const areas   = rule.areas   || []
      const parents = rule.parent || rule.parents || []

      // roles: empty => applies to all; otherwise user must have at least one
      const roleOK   = roles.length === 0 || roles.some(r => rolesSet.has(r))
      // areas: empty => no area-name filter; allow matching by key or by name
      const areaOK   = areas.length === 0 || areas.includes(areaKey) || (name && areas.includes(name))
      // parents: empty => no parent filter
      const parentOK = parents.length === 0 || (parent && parents.includes(parent))

      // AND semantics; for OR use:  roleOK && (areaOK || parentOK)
      return roleOK && areaOK && parentOK
    })
  }
}

+module.exports = { buildAreaPermissionChecker }
