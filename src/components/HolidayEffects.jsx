// @ts-check
import * as React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'
import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

/**
 *
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} props
 * @returns
 */
export function HolidayEffect({ images, name, css, imageScale }) {
  const [element, setElement] = React.useState(
    /** @type {React.ReactNode} */ (null),
  )
  const userDisabled = useStorage((s) => s.holidayEffects[name] === true)

  React.useLayoutEffect(() => {
    if (userDisabled) {
      setElement(null)
      return () => {}
    }
    switch (css) {
      case 'snow':
        setElement(
          <div className="winter-is-coming">
            <div className="snow snow--near" />
            <div className="snow snow--near snow--alt" />
            <div className="snow snow--mid" />
            <div className="snow snow--mid snow--alt" />
            <div className="snow snow--far" />
            <div className="snow snow--far snow--alt" />
          </div>,
        )
        return () => setElement(null)
      case 'fireworks':
        setElement(
          <div className="pyro">
            <div className="before" />
            <div className="after" />
          </div>,
        )
        return () => setElement(null)
      default: {
        if (images?.length) {
          const animation = new HolidayAnimations(images, imageScale)
          animation.initialize()
          return () => {
            animation.stop()
          }
        }
      }
    }
  }, [userDisabled])

  return element
}

export default function HolidayEffects() {
  const holidayEffects = useMemory((s) => s?.config?.holidayEffects || [])

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : []).map((holiday) => (
        <HolidayEffect key={holiday.name} {...holiday} />
      ))}
    </>
  )
}
