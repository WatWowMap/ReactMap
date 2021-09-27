import React, { useState, useCallback } from 'react'
import { TileLayer, useMap } from 'react-leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import Nav from './layout/Nav'
import QueryData from './QueryData'

const userSettingsCategory = category => {
  switch (category) {
    default: return category
    case 'devices':
    case 'spawnpoints':
    case 's2cells': return 'admin'
    case 'submissionCells':
    case 'portals': return 'wayfarer'
  }
}

export default function Map({ serverSettings: { config: { map: config, tileServers }, Icons }, params }) {
  Utility.analytics(window.location.pathname)

  const map = useMap()
  const filters = useStore(state => state.filters)
  const settings = useStore(state => state.settings)
  const staticUserSettings = useCallback(useStatic(state => state.userSettings))
  const icons = useStore(state => state.icons)
  const ui = useCallback(useStatic(state => state.ui))
  const available = useCallback(useStatic(state => state.available))
  const staticFilters = useCallback(useStatic(state => state.filters))
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const userSettings = useStore(state => state.userSettings)
  const [manualParams, setManualParams] = useState(false)

  const initialBounds = {
    minLat: map.getBounds()._southWest.lat,
    maxLat: map.getBounds()._northEast.lat,
    minLon: map.getBounds()._southWest.lng,
    maxLon: map.getBounds()._northEast.lng,
  }

  const onMove = useCallback(() => {
    const newCenter = map.getCenter()
    setLocation([newCenter.lat, newCenter.lng])
    setZoom(map.getZoom())
  }, [map])

  if (manualParams) {
    params.id = manualParams.id
  }

  return (
    <>
      <TileLayer
        key={tileServers[settings.tileServers].name}
        attribution={tileServers[settings.tileServers].attribution}
        url={tileServers[settings.tileServers].url}
        minZoom={config.minZoom}
        maxZoom={config.maxZoom}
      />
      {Object.entries({ ...ui, ...ui.wayfarer, ...ui.admin }).map(each => {
        const [category, value] = each
        let enabled = false

        switch (category) {
          default:
            if (filters[category]
              && filters[category].enabled
              && value) {
              enabled = true
            } break
          case 'gyms':
            if ((filters[category].gyms && value.gyms)
              || (filters[category].raids && value.raids)
              || (filters[category].exEligible && value.exEligible)
              || (filters[category].inBattle && value.inBattle)
              || (filters[category].arEligible && value.arEligible)) {
              enabled = true
            } break
          case 'nests':
            if (((filters[category].pokemon && value.pokemon)
              || (filters[category].polygons && value.polygons))) {
              enabled = true
            } break
          case 'pokestops':
            if ((filters[category].allPokestops && value.allPokestops)
              || (filters[category].lures && value.lures)
              || (filters[category].invasions && value.invasions)
              || (filters[category].quests && value.quests)
              || (filters[category].arEligible && value.arEligible)) {
              enabled = true
            } break
        }
        if (enabled) {
          return (
            <QueryData
              key={category}
              bounds={initialBounds}
              onMove={onMove}
              perms={value}
              map={map}
              category={category}
              config={config}
              available={available[category]}
              Icons={Icons}
              staticFilters={staticFilters[category].filter}
              userIcons={icons}
              userSettings={userSettings[userSettingsCategory(category)] || {}}
              filters={filters[category]}
              tileStyle={tileServers[settings.tileServers].style}
              zoomLevel={config.clusterZoomLevels[category]}
              staticUserSettings={staticUserSettings[category]}
              params={params}
            />
          )
        }
        return null
      })}
      <Nav map={map} setManualParams={setManualParams} Icons={Icons} />
    </>
  )
}
