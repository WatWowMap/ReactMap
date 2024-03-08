// @ts-check

/**
 *
 * @param {string} teamId
 * @param {import("@rm/types").BaseFilter | boolean} show
 * @param {import("@rm/types").AllFilters['gyms']['filter']} tempFilters
 * @returns
 */
export function generateSlots(teamId, show, tempFilters) {
  const slotObj = {}
  for (let i = 1; i <= 6; i += 1) {
    const slotKey = `g${teamId.charAt(1)}-${i}`
    slotObj[slotKey] =
      typeof show === 'boolean'
        ? { ...tempFilters[slotKey], enabled: show }
        : { ...tempFilters[slotKey], size: show.size }
  }
  return slotObj
}
