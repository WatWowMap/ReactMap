// @ts-check
import * as React from 'react'
import { useMemory } from '@hooks/useMemory'

import { HolidayEffect } from './HolidayEffect'

export default function HolidayEffects() {
  const holidayEffects = useMemory((s) => s?.config?.holidayEffects)

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : []).map((holiday) => (
        <HolidayEffect key={holiday.name} {...holiday} />
      ))}
    </>
  )
}
