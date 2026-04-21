// @ts-check
import * as React from 'react'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

import { HolidayEffect } from './HolidayEffect'
import { checkHoliday } from './utils'

export function HolidayEffects() {
  const holidayEffects = useMemory((s) => s?.config?.holidayEffects)
  const enhancedGraphics = useStorage((s) => s.enhancedGraphics)

  if (!enhancedGraphics) return null

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : []).map((holiday) => (
        <HolidayEffect key={holiday.name} {...holiday} />
      ))}
    </>
  )
}

export { checkHoliday }
