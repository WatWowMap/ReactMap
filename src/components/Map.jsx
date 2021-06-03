import React, { useCallback } from 'react'
import { TileLayer, useMap } from 'react-leaflet'

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

export default function Map({ serverSettings: { config: { map: config, tileServers, icons } } }) {
  const map = useMap()
  const filters = useStore(state => state.filters)
  const { tileServers: userTiles, icons: userIcons } = useStore(state => state.settings)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const ui = useCallback(useStatic(state => state.ui))
  const available = useCallback(useStatic(state => state.available))
  const staticFilters = useCallback(useStatic(state => state.filters))
  const userSettings = useStore(state => state.userSettings)
  const staticUserSettings = useStatic(state => state.userSettings)
  const availableForms = useStatic(state => state.availableForms)

  const initialBounds = {
    minLat: map.getBounds()._southWest.lat - 0.01,
    maxLat: map.getBounds()._northEast.lat + 0.01,
    minLon: map.getBounds()._southWest.lng - 0.01,
    maxLon: map.getBounds()._northEast.lng + 0.01,
  }

  const onMove = useCallback(() => {
    const newCenter = map.getCenter()
    setLocation([newCenter.lat, newCenter.lng])
    setZoom(map.getZoom())
  }, [map])

  return (
    <>
      <TileLayer
        key={tileServers[userTiles].name}
        attribution={tileServers[userTiles].attribution}
        url={tileServers[userTiles].url}
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
              availableForms={availableForms}
              path={icons[userIcons].path}
              staticFilters={staticFilters[category].filter}
              userSettings={userSettings[userSettingsCategory(category)] || {}}
              filters={filters[category]}
              tileStyle={tileServers[userTiles].style}
              zoomLevel={config.clusterZoomLevels[category] || 1}
              staticUserSettings={staticUserSettings[category]}
            />
          )
        }
        return null
      })}
      <Nav />
    </>
  )
}
