import React, { useState, useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'

import { useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import FilterPermCheck from './QueryData'

/** @param {{ target: import('leaflet').Map, type: string }} */
function setLocationZoom({ target: map }) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()
  useStore.setState({ location: [lat, lng], zoom })
  useStatic.setState({
    timeOfDay: Utility.timeCheck(lat, lng),
  })
  if (map.hasEventListeners('fetchdata')) map.fire('fetchdata')
}

export default function Map() {
  Utility.analytics(window.location.pathname)

  const attributionPrefix = useStatic(
    (state) => state.config.map.attributionPrefix,
  )

  // const [manualParams, setManualParams] = useState(params)
  const stateMap = useStatic((s) => s.map)
  const map = useMapEvents({
    moveend: setLocationZoom,
    zoom: setLocationZoom,
  })
  map.attributionControl.setPrefix(attributionPrefix || '')
  const ui = useStatic((state) => state.ui)

  const [windowState, setWindowState] = useState(true)

  useEffect(() => {
    const onFocus = () => setWindowState(true)
    const onBlur = () => setWindowState(false)

    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (windowState) {
      useStatic.setState({ active: windowState })
    } else {
      const timer = setTimeout(
        () => useStatic.setState({ active: windowState }),
        1000 * 60 * useStatic.getState().config.map.clientTimeoutMinutes,
      )
      return () => clearTimeout(timer)
    }
  }, [windowState])

  if (!stateMap) return null
  return (
    <>
      {Object.keys({ ...ui, ...ui.wayfarer, ...ui.admin }).map((category) => {
        if (category === 'settings') return null
        return (
          <React.Profiler
            key={category}
            id={category}
            onRender={(
              id,
              phase,
              actualDuration,
              baseDuration,
              startTime,
              commitTime,
              interactions,
            ) => {
              if (category === 'gyms')
                console.log(`[Profiler] ${id} (${phase})`, {
                  actualDuration,
                  baseDuration,
                  startTime,
                  commitTime,
                  interactions,
                })
            }}
          >
            <FilterPermCheck key={category} category={category} />
          </React.Profiler>
        )
      })}
    </>
  )
}
