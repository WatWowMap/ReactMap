// @ts-check
/**
 *
 * @param {import("packages/types/lib").Config['map']['holidayEffects'][number]} holiday
 * @returns
 */
export function checkHoliday(holiday) {
  if (!holiday.enabled) return false

  const date = new Date()
  const start = new Date(
    date.getFullYear() - (holiday.startMonth > holiday.endMonth ? 1 : 0),
    holiday.startMonth - 1,
    holiday.startDay,
    0,
    0,
    0,
  )
  const end = new Date(
    date.getFullYear(),
    holiday.endMonth - 1,
    holiday.endDay,
    23,
    59,
    59,
  )
  return date >= start && date <= end
}
