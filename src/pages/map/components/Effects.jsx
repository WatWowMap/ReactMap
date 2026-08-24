// @ts-check

import { useMapData } from '@hooks/useMapData'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useMemory } from '@store/useMemory'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import { useParams } from 'react-router'

import { useGenGyms } from '../hooks/useGenGyms'
import { useGenPokemon } from '../hooks/useGenPokemon'
import { useGenPokestops } from '../hooks/useGenPokestops'
import { useGenTappables } from '../hooks/useGenTappables'

export function Effects() {
  const params = useParams()
  const map = useMap()
  const { t } = useTranslation()

  useMapData()
  useGenGyms()
  useGenPokestops()
  useGenPokemon()
  useGenTappables()

  const isMobile = useMediaQuery(
    (/** @type {import('@mui/system').Theme} */ theme) =>
      theme.breakpoints.only('xs'),
  )
  const isTablet = useMediaQuery(
    (/** @type {import('@mui/system').Theme} */ theme) =>
      theme.breakpoints.only('sm'),
  )
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
