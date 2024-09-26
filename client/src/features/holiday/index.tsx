import { useMemory } from '@store/useMemory'

import { HolidayEffect } from './HolidayEffect'
import { checkHoliday } from './utils'

export function HolidayEffects() {
  const holidayEffects = useMemory((s) => s?.config?.holidayEffects)

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : []).map((holiday) => (
        <HolidayEffect key={holiday.name} {...holiday} />
      ))}
    </>
  )
}

export { checkHoliday }
