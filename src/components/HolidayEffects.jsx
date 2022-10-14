import React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'

export default function HolidayEffects({ holidayEffects }) {
  const date = new Date()
  return holidayEffects.map((holiday) => {
    if (
      holiday.enabled &&
      date.getMonth() >= holiday.startMonth - 1 &&
      date.getMonth() <= holiday.endMonth - 1 &&
      date.getDate() >= holiday.startDay &&
      date.getDate() <= holiday.endDay
    ) {
      switch (holiday.css) {
        case 'snow':
          return (
            <div className="winter-is-coming">
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
            <div className="pyro">
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
