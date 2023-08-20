import React, { useState, useEffect, useCallback } from 'react'
import { useMap, ZoomControl, TileLayer } from 'react-leaflet'
import { control } from 'leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import useTileLayer from '@hooks/useTileLayer'

import QueryData from './QueryData'
import { GenerateCells } from './tiles/S2Cell'

/** @param {string} category */
const userSettingsCategory = (category) => {
  switch (category) {
    case 'devices':
    case 'spawnpoints':
    case 'scanCells':
      return 'admin'
    case 'submissionCells':
    case 'portals':
      return 'wayfarer'
    default:
      return category
  }
}

export default function Map({ params }) {
  Utility.analytics(window.location.pathname)

  const map = useMap()
  const config = useStatic((state) => state.config.map)

  map.attributionControl.setPrefix(config.attributionPrefix || '')

  const tileLayer = useTileLayer()

  const staticUserSettings = useStatic((state) => state.userSettings)
  const ui = useStatic((state) => state.ui)
  const staticFilters = useStatic((state) => state.filters)
  const active = useStatic((state) => state.active)
  const timeOfDay = useStatic((state) => state.timeOfDay)
  const isMobile = useStatic((state) => state.isMobile)
  const Icons = useStatic((state) => state.Icons)
  const error = useStatic((state) => state.clientError)

  const filters = useStore((state) => state.filters)
  const settings = useStore((state) => state.settings)
  const icons = useStore((state) => state.icons)
  const userSettings = useStore((state) => state.userSettings)

  const [manualParams, setManualParams] = useState(params)
  const [windowState, setWindowState] = useState(true)

  const onMove = useCallback(
    (latLon) => {
      const newCenter = latLon || map.getCenter()
      useStore.setState({
        location: [newCenter.lat, newCenter.lng],
        zoom: Math.floor(map.getZoom()),
      })
      useStatic.setState({
        timeOfDay: Utility.timeCheck(newCenter.lat, newCenter.lng),
      })
    },
    [map],
  )

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

  useEffect(() => {
    if (settings.navigationControls === 'leaflet' && map) {
      const lc = control
        .locate({
          position: 'bottomright',
          icon: 'fas fa-crosshairs',
          keepCurrentZoomLevel: true,
          setView: 'untilPan',
        })
        .addTo(map)
      return () => {
        lc.remove()
      }
    }
  }, [settings.navigationControls, map])

  if (!Icons) return null
  return (
    <>
      <TileLayer {...tileLayer} />
      {settings.navigationControls === 'leaflet' && (
        <ZoomControl position="bottomright" />
      )}
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
            if (category === 's2cells') {
              return (
                <GenerateCells
                  key={category}
                  tileStyle={tileLayer?.style || 'light'}
                  onMove={onMove}
                />
              )
            }
            return (
              <QueryData
                key={`${category}-${Object.values(
                  userSettings[userSettingsCategory(category)] || {},
                ).join('')}-${Object.values(icons).join('')}`}
                sizeKey={
                  filters[category].filter
                    ? Object.values(filters[category].filter)
                        .map((x) => (x ? x.size : 'md'))
                        .join(',')
                    : 'md'
                }
                bounds={Utility.getQueryArgs(map)}
                onMove={onMove}
                perms={value}
                map={map}
                category={category}
                config={config}
                Icons={Icons}
                staticFilters={staticFilters[category].filter}
                userIcons={icons}
                userSettings={
                  userSettings[userSettingsCategory(category)] || {}
                }
                filters={filters[category]}
                onlyAreas={
                  (filters?.scanAreas?.filterByAreas &&
                    filters?.scanAreas?.filter?.areas) ||
                  []
                }
                tileStyle={tileLayer?.style || 'light'}
                clusteringRules={
                  config?.clustering?.[category] || {
                    zoomLimit: config.minZoom,
                    forcedLimit: 10000,
                  }
                }
                staticUserSettings={staticUserSettings[category]}
                params={manualParams}
                setParams={setManualParams}
                timeOfDay={timeOfDay}
                isMobile={isMobile}
                active={active}
              />
            )
          }
          return null
        },
      )}
    </>
  )
}
