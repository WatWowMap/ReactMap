import React, { useCallback } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { ThemeProvider } from '@material-ui/styles'

import { useMasterfile, useStore } from '../hooks/useStore'
import theme from '../assets/mui/theme'
import Nav from './layout/Nav'
import * as index from './componentIndex'

export default function Map() {
  const map = useMap()
  const filters = useStore(state => state.filters)
  const settings = useStore(state => state.settings)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const { filterItems } = useMasterfile(state => state.ui)

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

  return (
    <ThemeProvider theme={theme}>
      <TileLayer
        key={settings.tileServer.name}
        attribution={settings.tileServer.attribution}
        url={settings.tileServer.url}
      />
      {Object.keys(filterItems).map(item => {
        const Component = index[item]
        if (filters[item].enabled) {
          return (
            <Component
              key={item}
              bounds={initialBounds}
              filters={filters}
              onMove={onMove}
            />
          )
        }
        return ''
      })}
      <Nav />
    </ThemeProvider>
  )
}
