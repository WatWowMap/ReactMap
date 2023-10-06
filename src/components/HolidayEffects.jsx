// @ts-check
import * as React from 'react'
import HolidayAnimations from '@services/HolidayAnimations'
import { useStatic } from '@hooks/useStore'

/**
 *
 * @param {import("@rm/types").Config['map']['holidayEffects'][number]} props
 * @returns
 */
export function HolidayEffect({
  enabled,
  endDay,
  endMonth,
  images,
  name,
  startDay,
  startMonth,
  css,
  imageScale,
}) {
  const [element, setElement] = React.useState(
    /** @type {React.ReactNode} */ (null),
  )

  React.useLayoutEffect(() => {
    const date = new Date()
    const start = new Date(
      date.getFullYear() - (startMonth > endMonth ? 1 : 0),
      startMonth - 1,
      startDay,
      0,
      0,
      0,
    )
    const end = new Date(date.getFullYear(), endMonth - 1, endDay, 23, 59, 59)
    if (enabled && date >= start && date <= end) {
      switch (css) {
        case 'snow':
          setElement(
            <div className="winter-is-coming" key={name}>
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
            <div className="pyro" key={name}>
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
    }
  }, [])

  return element
}

export default function HolidayEffects() {
  const holidayEffects = useStatic((s) => s?.config?.holidayEffects || [])

  return (
    <>
      {(Array.isArray(holidayEffects) ? holidayEffects : []).map((holiday) => (
        <HolidayEffect key={holiday.name} {...holiday} />
      ))}
    </>
  )
}
