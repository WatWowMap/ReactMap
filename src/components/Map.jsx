import React, { useCallback } from 'react'
import { TileLayer, useMap } from 'react-leaflet'

import { useMasterfile, useStore } from '../hooks/useStore'
import Nav from './layout/Nav'
import * as index from './componentIndex'

export default function Map() {
  const map = useMap()
  const filters = useStore(state => state.filters)
  const settings = useStore(state => state.settings)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const { menus } = useMasterfile(state => state.ui)

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
        key={settings.tileServers.name}
        attribution={settings.tileServers.attribution}
        url={settings.tileServers.url}
      />
      {Object.keys({ ...menus, ...menus.wayfarer, ...menus.admin }).map(item => {
        const Component = index[item]
        let enabled = false
        switch (item) {
          default:
            if (filters[item]
              && filters[item].enabled && menus[item]) {
              enabled = true
            } break
          case 'gyms':
            if ((filters[item].gyms && menus[item].gyms)
              || (filters[item].raids && menus[item].raids)
              || (filters[item].exEligible && menus[item].exEligible)
              || (filters[item].inBattle && menus[item].inBattle)) {
              enabled = true
            } break
          case 'pokestops':
            if (filters[item].pokestops
              || filters[item].lures
              || filters[item].invasions
              || filters[item].quests) {
              enabled = true
            } break
        }
        if (enabled) {
          return (
            <Component
              key={item}
              bounds={initialBounds}
              filters={filters}
              onMove={onMove}
              perms={menus[item]}
            />
          )
        }
        return ''
      })}
      <Nav />
    </>
  )
}
