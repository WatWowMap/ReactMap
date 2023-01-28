import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { TileLayer, useMap, ZoomControl } from 'react-leaflet'
import { useMediaQuery } from '@material-ui/core'
import { useTheme } from '@material-ui/styles'
import L from 'leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'

import Nav from './layout/Nav'
import QueryData from './QueryData'
import Webhook from './layout/dialogs/webhooks/Webhook'
import ScanOnDemand from './layout/dialogs/scanner/ScanOnDemand'
import ClientError from './layout/dialogs/ClientError'

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

const getTileServer = (tileServers, settings, timeOfDay) => {
  const fallbackTs = Object.values(tileServers).find(
    (server) => server.name !== 'auto',
  )
  if (tileServers?.[settings.tileServers]?.name === 'auto') {
    const autoTile =
      timeOfDay === 'night'
        ? Object.values(tileServers).find((server) => server.style === 'dark')
        : Object.values(tileServers).find((server) => server.style === 'light')
    return autoTile || fallbackTs
  }
  return tileServers[settings.tileServers] || fallbackTs
}

export default function Map({
  serverSettings: {
    config: { map: config, tileServers, scanner },
    Icons,
    webhooks,
  },
  params,
}) {
  Utility.analytics(window.location.pathname)

  const map = useMap()
  map.attributionControl.setPrefix(config.attributionPrefix || '')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery(theme.breakpoints.only('sm'))

  const staticUserSettings = useStatic((state) => state.userSettings)
  const ui = useStatic((state) => state.ui)
  const staticFilters = useStatic((state) => state.filters)
  const setExcludeList = useStatic((state) => state.setExcludeList)
  const active = useStatic((state) => state.active)
  const setActive = useStatic((state) => state.setActive)

  const filters = useStore((state) => state.filters)
  const settings = useStore((state) => state.settings)
  const icons = useStore((state) => state.icons)
  const setLocation = useStore((s) => s.setLocation)
  const timeOfDay = useStatic((state) => state.timeOfDay)
  const setTimeOfDay = useStatic((state) => state.setTimeOfDay)
  const setZoom = useStore((state) => state.setZoom)
  const userSettings = useStore((state) => state.userSettings)

  const [webhookMode, setWebhookMode] = useState(false)
  const [scanNextMode, setScanNextMode] = useState(false)
  const [scanZoneMode, setScanZoneMode] = useState(false)
  const [manualParams, setManualParams] = useState(params)
  const [error, setError] = useState('')
  const [windowState, setWindowState] = useState(true)
  const [lc] = useState(
    L.control.locate({
      position: 'bottomright',
      icon: 'fas fa-crosshairs',
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
    }),
  )

  const onMove = useCallback(
    (latLon) => {
      const newCenter = latLon || map.getCenter()
      setLocation([newCenter.lat, newCenter.lng])
      setZoom(Math.floor(map.getZoom()))
      setTimeOfDay(Utility.timeCheck(newCenter.lat, newCenter.lng))
    },
    [map],
  )

  const tileServer = useMemo(
    () => getTileServer(tileServers, settings, timeOfDay),
    [timeOfDay, settings.tileServers],
  )

  const onFocus = () => setWindowState(true)

  const onBlur = () => setWindowState(false)

  useEffect(() => {
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      () => setActive(windowState),
      1000 * 60 * config.clientTimeoutMinutes,
    )
    if (windowState) {
      clearTimeout(timer)
      setActive(windowState)
    }
    return () => clearTimeout(timer)
  }, [windowState])

  useEffect(() => {
    if (settings.navigationControls === 'leaflet') {
      lc.addTo(map)
      return () => lc.remove()
    }
    lc.remove()
  }, [settings.navigationControls])

  return (
    <>
      <TileLayer
        key={tileServer?.name}
        attribution={tileServer?.attribution || ''}
        url={
          tileServer?.[timeOfDay] ||
          tileServer?.url ||
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png'
        }
        minZoom={config.minZoom}
        maxZoom={config.maxZoom}
        zIndex={250}
      />
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
                  setExcludeList={setExcludeList}
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
                  tileStyle={tileServer?.style || 'light'}
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
