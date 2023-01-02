/* eslint-disable no-nested-ternary */
import React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'

export default function HolidayEffects({ holidayEffects }) {
  const date = new Date()
  return holidayEffects.map((holiday) => {
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
    if (holiday.enabled && date >= start && date <= end) {
      switch (holiday.css) {
        case 'snow':
          return (
            <div className="winter-is-coming" key={holiday.name}>
              <div className="snow snow--near" />
              <div className="snow snow--near snow--alt" />
              <div className="snow snow--mid" />
              <div className="snow snow--mid snow--alt" />
              <div className="snow snow--far" />
              <div className="snow snow--far snow--alt" />
            </div>
          )
        case 'fireworks':
          return (
            <div className="pyro" key={holiday.name}>
              <div className="before" />
              <div className="after" />
            </div>
          )
        default: {
          if (holiday.images?.length) {
            const animation = new HolidayAnimations(
              holiday.images,
              holiday.imageScale,
            )
            animation.initialize()
          }
        }
      }
    }
    return null
  })
}
