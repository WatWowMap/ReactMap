import React, { useState, useEffect, useCallback } from 'react'
import { useMap, ZoomControl, TileLayer } from 'react-leaflet'
import { useMediaQuery } from '@material-ui/core'
import { useTheme } from '@material-ui/styles'
import L from 'leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import useTileLayer from '@hooks/useTileLayer'
import useCooldown from '@hooks/useCooldown'

import Nav from './layout/Nav'
import QueryData from './QueryData'
import Webhook from './layout/dialogs/webhooks/Webhook'
import ScanOnDemand from './layout/dialogs/scanner/ScanOnDemand'
import ClientError from './layout/dialogs/ClientError'
import { GenerateCells } from './tiles/S2Cell'

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

export default function Map({
  serverSettings: {
    config: { map: config, scanner },
    Icons,
    webhooks,
  },
  params,
}) {
  Utility.analytics(window.location.pathname)

  const map = useMap()
  useCooldown()
  map.attributionControl.setPrefix(config.attributionPrefix || '')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery(theme.breakpoints.only('sm'))
  const tileLayer = useTileLayer()

  const staticUserSettings = useStatic((state) => state.userSettings)
  const ui = useStatic((state) => state.ui)
  const staticFilters = useStatic((state) => state.filters)
  const active = useStatic((state) => state.active)

  const filters = useStore((state) => state.filters)
  const settings = useStore((state) => state.settings)
  const icons = useStore((state) => state.icons)
  const timeOfDay = useStatic((state) => state.timeOfDay)
  const userSettings = useStore((state) => state.userSettings)

  const [webhookMode, setWebhookMode] = useState(false)
  const [scanNextMode, setScanNextMode] = useState(false)
  const [scanZoneMode, setScanZoneMode] = useState(false)
  const [manualParams, setManualParams] = useState(params)
  const [error, setError] = useState('')
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
    const lc = L.control.locate({
      position: 'bottomright',
      icon: 'fas fa-crosshairs',
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
    })
    if (settings.navigationControls === 'leaflet') {
      lc.addTo(map)
    }
    return () => lc.remove()
  }, [settings.navigationControls])

  return (
    <>
      <TileLayer {...tileLayer} />
      {settings.navigationControls === 'leaflet' && (
        <ZoomControl position="bottomright" />
      )}
      {webhooks && webhookMode ? (
        <Webhook
          map={map}
          webhookMode={webhookMode}
          setWebhookMode={setWebhookMode}
          Icons={Icons}
        />
      ) : (
        Object.entries({ ...ui, ...ui.wayfarer, ...ui.admin }).map(
          ([category, value]) => {
            let enabled = false
            if (scanZoneMode === 'setLocation') return null
            switch (category) {
              case 'scanAreas':
                if (
                  (filters[category] && filters[category].enabled) ||
                  webhookMode === 'areas'
                ) {
                  enabled = true
                }
                break
              case 'gyms':
                if (
                  ((filters[category].allGyms && value.allGyms) ||
                    (filters[category].raids && value.raids) ||
                    (filters[category].exEligible && value.exEligible) ||
                    (filters[category].inBattle && value.inBattle) ||
                    (filters[category].arEligible && value.arEligible) ||
                    (filters[category].gymBadges && value.gymBadges)) &&
                  !webhookMode
                ) {
                  enabled = true
                }
                break
              case 'nests':
                if (
                  ((filters[category].pokemon && value.pokemon) ||
                    (filters[category].polygons && value.polygons)) &&
                  !webhookMode
                ) {
                  enabled = true
                }
                break
              case 'pokestops':
                if (
                  ((filters[category].allPokestops && value.allPokestops) ||
                    (filters[category].lures && value.lures) ||
                    (filters[category].invasions && value.invasions) ||
                    (filters[category].quests && value.quests) ||
                    (filters[category].eventStops && value.eventStops) ||
                    (filters[category].arEligible && value.arEligible)) &&
                  !webhookMode
                ) {
                  enabled = true
                }
                break
              case 's2cells':
                if (
                  filters[category] &&
                  filters[category]?.enabled &&
                  filters[category]?.cells?.length &&
                  value &&
                  !webhookMode
                ) {
                  enabled = true
                }
                break
              default:
                if (
                  filters[category] &&
                  filters[category].enabled &&
                  value &&
                  !webhookMode
                ) {
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
                  onlyAreas={filters?.scanAreas?.filter?.areas || []}
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
                  setError={setError}
                  active={active}
                />
              )
            }
            return null
          },
        )
      )}
      {scanNextMode && (
        <ScanOnDemand
          map={map}
          scanMode={scanNextMode}
          setScanMode={setScanNextMode}
          scanner={scanner}
          mode="scanNext"
        />
      )}
      {scanZoneMode && (
        <ScanOnDemand
          map={map}
          scanMode={scanZoneMode}
          setScanMode={setScanZoneMode}
          scanner={scanner}
          mode="scanZone"
        />
      )}
      <Nav
        map={map}
        setManualParams={setManualParams}
        Icons={Icons}
        config={config}
        webhookMode={webhookMode}
        setWebhookMode={setWebhookMode}
        webhooks={webhooks}
        scanNextMode={scanNextMode}
        setScanNextMode={setScanNextMode}
        scanZoneMode={scanZoneMode}
        setScanZoneMode={setScanZoneMode}
        settings={settings}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <ClientError error={error} />
    </>
  )
}
