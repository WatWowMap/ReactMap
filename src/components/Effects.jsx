import * as React from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'
import { useWindowState } from '@hooks/useWindowState'
import { useStatic } from '@hooks/useStore'
import { useParams } from 'react-router-dom'
import { useMap } from 'react-leaflet'

export function Effects() {
  const params = useParams()
  const map = useMap()

  useRefresh()
  useGenerate()
  useWindowState()

  const isMobile = useMediaQuery((t) => t.breakpoints.only('xs'))
  const isTablet = useMediaQuery((t) => t.breakpoints.only('sm'))

  React.useEffect(() => {
    useStatic.setState({ isMobile, isTablet })
  }, [isMobile, isTablet])

  React.useEffect(() => {
    if (params.lat || params.lon || params.zoom) {
      const lat = Number(params.lat) || map.getCenter().lat
      const lon = Number(params.lon) || map.getCenter().lng
      const zoom = Number(params.zoom) || map.getZoom()
      map.setView([lat, lon], zoom)
    }
  }, [params.lat, params.lon, params.zoom])

  return null
}
