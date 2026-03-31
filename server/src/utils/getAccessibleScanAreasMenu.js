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
  const parentKeyByName = Object.fromEntries(
    scanAreas
      .filter(
        (parent) =>
          parent.name &&
          parent.details?.properties?.key &&
          !parent.details.properties.hidden,
      )
      .map((parent) => [parent.name, parent.details.properties.key]),
  )
  const baseMenu = scanAreas.map((parent) => ({
    ...parent,
    details:
      parent.details && !parent.details.properties.hidden
        ? parent.details
        : null,
  }))

  if (perms.areaRestrictions?.length && !unrestrictedAreaGrant) {
    const canAccessArea = (properties) =>
      perms.areaRestrictions.includes(properties.key) ||
      perms.areaRestrictions.includes(properties.name) ||
      (!!properties.parent &&
        (perms.areaRestrictions.includes(parentKeyByName[properties.parent]) ||
          perms.areaRestrictions.includes(properties.parent)))

    return baseMenu
      .map((parent) => {
        const children = parent.children.filter((child) =>
          canAccessArea(child.properties),
        )
        const hasSelectableChild = children.some(
          (child) => !child.properties.manual,
        )

        return {
          ...parent,
          details:
            parent.details &&
            (canAccessArea(parent.details.properties) || hasSelectableChild)
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
