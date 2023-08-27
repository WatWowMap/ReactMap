// @ts-check
import * as React from 'react'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import FilterPermCheck from './QueryData'

export default function Map() {
  Utility.analytics(window.location.pathname)

  // const [manualParams, setManualParams] = useState(params)
  const stateMap = useStatic((s) => s.map)
  const ui = useStatic((state) => state.ui)

  if (!stateMap) return null
  return (
    <>
      {Object.keys({ ...ui, ...ui.wayfarer, ...ui.admin }).map((category) => {
        if (category === 'settings') return null
        return process.env.NODE_ENV === 'development' ? (
          <React.Profiler
            key={category}
            id={category}
            onRender={(id, phase, actualDuration, baseDuration) => {
              if (category === 'gyms')
                // eslint-disable-next-line no-console
                console.log(`[Profiler] ${id} (${phase})`, {
                  actualDuration,
                  baseDuration,
                })
            }}
          >
            <FilterPermCheck key={category} category={category} />
          </React.Profiler>
        ) : (
          <FilterPermCheck key={category} category={category} />
        )
      })}
    </>
  )
}
