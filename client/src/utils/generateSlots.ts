export function generateSlots(
  teamId: string,
  show: import('@rm/types').BaseFilter | boolean,
  tempFilters: import('@rm/types').AllFilters['gyms']['filter'],
) {
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
