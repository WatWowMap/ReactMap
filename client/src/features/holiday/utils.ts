function getStart(
  holiday: import('@rm/types').Config['map']['holidayEffects'][number],
  now: Date = new Date(),
) {
  return new Date(
    now.getFullYear() - (holiday.startMonth > holiday.endMonth ? 1 : 0),
    holiday.startMonth - 1,
    holiday.startDay,
    0,
    0,
    0,
  )
}

function getEnd(
  holiday: import('@rm/types').Config['map']['holidayEffects'][number],
  now: Date = new Date(),
) {
  return new Date(
    now.getFullYear(),
    holiday.endMonth - 1,
    holiday.endDay,
    23,
    59,
    59,
  )
}

export function checkHoliday(
  holiday: import('@rm/types').Config['map']['holidayEffects'][number],
) {
  if (!holiday.enabled) return false
  const date = new Date()
  const start = getStart(holiday, date)
  const end = getEnd(holiday, date)
  return date >= start && date <= end
}

export function countdownUntilEnd(
  holiday: import('@rm/types').Config['map']['holidayEffects'][number],
) {
  const date = new Date()
  const end = getEnd(holiday, date)
  return end.getMilliseconds() - date.getMilliseconds()
}
