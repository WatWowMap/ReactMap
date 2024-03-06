// @ts-check
import * as React from 'react'

import { useMemory } from '@store/useMemory'

import { HolidayEffect } from './HolidayEffect'
import { checkHoliday } from './utils'

export function HolidayEffects() {
  const holidayEffects = useMemory((s) => s?.config?.holidayEffects)

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : [])
        .filter(checkHoliday)
        .map((holiday) => (
          <HolidayEffect key={holiday.name} {...holiday} />
        ))}
    </>
  )
}
