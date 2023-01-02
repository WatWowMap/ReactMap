/* eslint-disable no-nested-ternary */
import React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'

export default function HolidayEffects({ holidayEffects }) {
  const date = new Date()
  const day = date.getDate()
  const month = date.getMonth() + 1
  return holidayEffects.map((holiday) => {
    if (
      holiday.enabled &&
      (holiday.startMonth < holiday.endMonth
        ? month >= holiday.startMonth &&
          (holiday.startDay < holiday.endDay
            ? day >= holiday.startDay
            : day <= holiday.startDay)
        : month <= holiday.startMonth &&
          (holiday.startDay < holiday.endDay
            ? day >= holiday.startDay
            : day <= holiday.startDay))
    ) {
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
