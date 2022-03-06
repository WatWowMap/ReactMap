import React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'

export default function HolidayEffects({ mapSettings }) {
  const date = new Date()

  if (mapSettings.valentinesDay && date.getMonth() === 1 && date.getDate() === 14) {
    const heart = new HolidayAnimations('https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/A_perfect_SVG_heart.svg/20px-A_perfect_SVG_heart.svg.png')
    heart.initialize()

    return null
  }
  if (mapSettings.internationalWomensDay && date.getMonth() === 2 && date.getDate() === 8) {
    const flower = new HolidayAnimations('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Emoji_u1f338.svg/20px-Emoji_u1f338.svg.png')
    flower.initialize()

    return null
  }
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
