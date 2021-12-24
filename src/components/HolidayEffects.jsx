import React from 'react'

export default function HolidayEffects({ mapSettings }) {
  const date = new Date()
  if (mapSettings.christmasSnow
    && date.getMonth() === 11 && date.getDate() >= 24 && date.getDate() <= 30) {
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
  }
  if (mapSettings.newYearsFireworks
    && ((date.getMonth() === 11 && date.getDate() === 31) || (date.getMonth() === 0 && date.getDate() === 1))) {
    return (
      <div className="pyro">
        <div className="before" />
        <div className="after" />
      </div>
    )
  }
  return null
}
