// @ts-check
const config = require('@rm/config')

const { hasUnrestrictedAreaGrant } = require('./areaPerms')

/**
 * @param {import('express').Request} req
 * @param {Partial<import('@rm/types').Permissions>} perms
 * @returns {import('@rm/types').Config['areas']['scanAreasMenu'][string]}
 */
function getAccessibleScanAreasMenu(req, perms) {
  if (!perms?.scanAreas) {
    return []
  }

  const scanAreas = config.getAreas(req, 'scanAreasMenu')
  const unrestrictedAreaGrant = hasUnrestrictedAreaGrant(perms.areaRestrictions)
  const baseMenu = scanAreas.map((parent) => ({
    ...parent,
    details:
      parent.details && !parent.details.properties.hidden
        ? parent.details
        : null,
  }))

  if (perms.areaRestrictions?.length && !unrestrictedAreaGrant) {
    const canAccessArea = (properties) =>
      perms.areaRestrictions.includes(properties.key)

    return baseMenu
      .map((parent) => {
        const canAccessParent =
          !!parent.details && canAccessArea(parent.details.properties)
        const children = canAccessParent
          ? parent.children
          : parent.children.filter((child) => canAccessArea(child.properties))
        const hasSelectableChild = children.some(
          (child) => !child.properties.manual,
        )

        return {
          ...parent,
          details:
            parent.details && (canAccessParent || hasSelectableChild)
              ? parent.details
              : null,
          children,
        }
      })
      .filter((parent) => parent.details || parent.children.length)
  }

  return baseMenu.filter((parent) => parent.details || parent.children.length)
}

module.exports = { getAccessibleScanAreasMenu }
