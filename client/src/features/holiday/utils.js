// @ts-check

/**
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} holiday
 * @param {Date} [now]
 */
function getStart(holiday, now = new Date()) {
  return new Date(
    now.getFullYear() - (holiday.startMonth > holiday.endMonth ? 1 : 0),
    holiday.startMonth - 1,
    holiday.startDay,
    0,
    0,
    0,
  )
}

/**
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} holiday
 * @param {Date} [now]
 */
function getEnd(holiday, now = new Date()) {
  return new Date(
    now.getFullYear(),
    holiday.endMonth - 1,
    holiday.endDay,
    23,
    59,
    59,
  )
}

/**
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} holiday
 */
export function checkHoliday(holiday) {
  if (!holiday.enabled) return false
  const date = new Date()
  const start = getStart(holiday, date)
  const end = getEnd(holiday, date)
  return date >= start && date <= end
}

/**
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} holiday
 */
export function countdownUntilEnd(holiday) {
  const date = new Date()
  const end = getEnd(holiday, date)
  return end.getMilliseconds() - date.getMilliseconds()
}
