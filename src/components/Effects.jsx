import * as React from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'
import { useWindowState } from '@hooks/useWindowState'
import { useStatic } from '@hooks/useStore'
import { useParams } from 'react-router-dom'
import { useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

export function Effects() {
  const params = useParams()
  const map = useMap()
  const { t } = useTranslation()

  useRefresh()
  useGenerate()
  useWindowState()

  const isMobile = useMediaQuery((theme) => theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery((theme) => theme.breakpoints.only('sm'))
  const online = useStatic((s) => s.online)

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

  React.useEffect(() => {
    map.attributionControl.setPrefix(
      online
        ? useStatic.getState().config.general.attributionPrefix || ''
        : t('offline_mode'),
    )
  }, [online])

  return null
}
