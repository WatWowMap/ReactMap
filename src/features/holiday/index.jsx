// @ts-check
import * as React from 'react'
import { useMemory } from '@store/useMemory'

import { HolidayEffect } from './HolidayEffect'

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
