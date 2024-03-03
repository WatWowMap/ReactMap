// @ts-check
import * as React from 'react'

import { useStorage } from '@hooks/useStorage'

import HolidayAnimations from './HolidayAnimations'

/**
 *
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} props
 * @returns
 */
export function HolidayEffect({ images, name, css, imageScale }) {
  const userDisabled = useStorage((s) => s.holidayEffects[name] === true)

  React.useLayoutEffect(() => {
    if (images?.length && !userDisabled) {
      const animation = new HolidayAnimations(images, imageScale)
      animation.initialize()
      return () => {
        animation.stop()
      }
    }
  }, [userDisabled])

  if (userDisabled) return null

  switch (css) {
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
    default:
      return null
  }
}
