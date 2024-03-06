import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import useMediaQuery from '@mui/material/useMediaQuery'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'
import { useMemory } from '@store/useMemory'

export function Effects() {
  const params = useParams()
  const map = useMap()
  const { t } = useTranslation()

  useRefresh()
  useGenerate()

  const isMobile = useMediaQuery((theme) => theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery((theme) => theme.breakpoints.only('sm'))
  const online = useMemory((s) => s.online)

  React.useEffect(() => {
    useMemory.setState({ isMobile, isTablet })
  }, [isMobile, isTablet])

  React.useEffect(() => {
    if (params.lat || params.lon || params.zoom) {
      const lat = Number(params.lat) || map.getCenter().lat
      const lon = Number(params.lon) || map.getCenter().lng
      const zoom = Number(params.zoom) || map.getZoom()
      map.setView([lat, lon], zoom)
    }
  }, [params.lat, params.lon, params.zoom])

  React.useEffect(() => {
    map.attributionControl.setPrefix(
      online
        ? useMemory.getState().config.general.attributionPrefix || ''
        : t('offline_mode'),
    )
  }, [online])

  return null
}
