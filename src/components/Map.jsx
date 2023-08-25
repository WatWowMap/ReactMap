import React, { useState, useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'

import { useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

// import QueryData from './QueryData'
import { GenerateCells } from './tiles/S2Cell'
import QueryData from './QueryData'

// /** @param {string} category */
// const userSettingsCategory = (category) => {
//   switch (category) {
//     case 'devices':
//     case 'spawnpoints':
//     case 'scanCells':
//       return 'admin'
//     case 'submissionCells':
//     case 'portals':
//       return 'wayfarer'
//     default:
//       return category
//   }
// }

function setLocationZoom({ target: map }) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()
  useStore.setState({ location: [lat, lng], zoom })
  useStatic.setState({
    timeOfDay: Utility.timeCheck(lat, lng),
  })
}

export default function Map({ params }) {
  Utility.analytics(window.location.pathname)

  const config = useStatic((state) => state.config.map)

  // const staticUserSettings = useStatic((state) => state.userSettings)
  const ui = useStatic((state) => state.ui)
  // const timeOfDay = useStatic((state) => state.timeOfDay)
  // const isMobile = useStatic((state) => state.isMobile)
  const Icons = useStatic((state) => state.Icons)
  const error = useStatic((state) => state.clientError)

  const filters = useStore((state) => state.filters)
  const [manualParams, setManualParams] = useState(params)
  const [windowState, setWindowState] = useState(true)

  const map = useMapEvents({
    moveend: setLocationZoom,
    zoom: setLocationZoom,
  })
  map.attributionControl.setPrefix(config.attributionPrefix || '')

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
        1000 * 60 * config.clientTimeoutMinutes,
      )
      return () => clearTimeout(timer)
    }
  }, [windowState])

  if (!Icons) return null
  return (
    <>
      {Object.entries({ ...ui, ...ui.wayfarer, ...ui.admin }).map(
        ([category, value]) => {
          let enabled = false

          switch (category) {
            case 'scanAreas':
              if (filters[category] && filters[category].enabled) {
                enabled = true
              }
              break
            case 'gyms':
              if (
                (filters[category].allGyms && value.allGyms) ||
                (filters[category].raids && value.raids) ||
                (filters[category].exEligible && value.exEligible) ||
                (filters[category].inBattle && value.inBattle) ||
                (filters[category].arEligible && value.arEligible) ||
                (filters[category].gymBadges && value.gymBadges)
              ) {
                enabled = true
              }
              break
            case 'nests':
              if (
                (filters[category].pokemon && value.pokemon) ||
                (filters[category].polygons && value.polygons)
              ) {
                enabled = true
              }
              break
            case 'pokestops':
              if (
                (filters[category].allPokestops && value.allPokestops) ||
                (filters[category].lures && value.lures) ||
                (filters[category].invasions && value.invasions) ||
                (filters[category].quests && value.quests) ||
                (filters[category].eventStops && value.eventStops) ||
                (filters[category].arEligible && value.arEligible)
              ) {
                enabled = true
              }
              break
            case 's2cells':
              if (
                filters[category] &&
                filters[category]?.enabled &&
                filters[category]?.cells?.length &&
                value
              ) {
                enabled = true
              }
              break
            default:
              if (filters[category] && filters[category].enabled && value) {
                enabled = true
              }
              break
          }
          if (enabled && !error) {
            Utility.analytics(
              'Data',
              `${category} being fetched`,
              category,
              true,
            )
            return category === 's2cells' ? (
              <GenerateCells key={category} />
            ) : (
              <QueryData key={category} category={category} value={value} />
            )
          }
          return null
        },
      )}
    </>
  )
}
