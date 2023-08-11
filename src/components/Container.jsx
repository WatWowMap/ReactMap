import * as React from 'react'
import { MapContainer } from 'react-leaflet'
import { useMediaQuery } from '@mui/material'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'
import { useStatic } from '@hooks/useStore'

import Map from './Map'

export default function Container({ serverSettings, params, location, zoom }) {
  useGenerate()
  useRefresh()
  const isMobile = useMediaQuery((t) => t.breakpoints.only('xs'))
  const isTablet = useMediaQuery((t) => t.breakpoints.only('sm'))

  React.useEffect(() => {
    useStatic.setState({ isMobile, isTablet })
  }, [isMobile, isTablet])

  return (
    <MapContainer
      tap={false}
      center={location}
      zoom={
        zoom < serverSettings.config.map.minZoom ||
        zoom > serverSettings.config.map.maxZoom
          ? serverSettings.config.map.minZoom
          : zoom
      }
      zoomControl={false}
      maxBounds={[
        [-90, -210],
        [90, 210],
      ]}
      preferCanvas
    >
      {serverSettings.user && serverSettings.user.perms.map && (
        <Map serverSettings={serverSettings} params={params} />
      )}
    </MapContainer>
  )
}
