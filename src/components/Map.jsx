import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { TileLayer, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import Nav from './layout/Nav'
import QueryData from './QueryData'
import Webhook from './layout/dialogs/webhooks/Webhook'

const userSettingsCategory = category => {
  switch (category) {
    case 'devices':
    case 'spawnpoints':
    case 'scanCells': return 'admin'
    case 'submissionCells':
    case 'portals': return 'wayfarer'
    default: return category
  }
}

const getTileServer = (tileServers, settings, isNight) => {
  const fallbackTs = Object.values(tileServers).find(server => server.name !== 'auto')
  if (tileServers?.[settings.tileServers]?.name === 'auto') {
    const autoTile = isNight
      ? Object.values(tileServers).find(server => server.style === 'dark')
      : Object.values(tileServers).find(server => server.style === 'light')
    return autoTile || fallbackTs
  }
  return tileServers[settings.tileServers] || fallbackTs
}

export default function Map({ serverSettings: { config: { map: config, tileServers }, Icons, webhooks }, params }) {
  Utility.analytics(window.location.pathname)

  const map = useMap()

  const staticUserSettings = useCallback(useStatic(state => state.userSettings))
  const ui = useCallback(useStatic(state => state.ui))
  const available = useCallback(useStatic(state => state.available))
  const staticFilters = useCallback(useStatic(state => state.filters))
  const setExcludeList = useCallback(useStatic(state => state.setExcludeList))

  const filters = useStore(state => state.filters)
  const settings = useStore(state => state.settings)
  const icons = useStore(state => state.icons)
  const setLocation = useStore(s => s.setLocation)
  const isNight = useStatic(state => state.isNight)
  const setIsNight = useStatic(state => state.setIsNight)
  const setZoom = useStore(state => state.setZoom)
  const userSettings = useStore(state => state.userSettings)

  const [webhookMode, setWebhookMode] = useState(false)
  const [manualParams, setManualParams] = useState(params)
  const [lc] = useState(L.control.locate({
    position: 'bottomright',
    icon: 'fas fa-location-arrow',
    keepCurrentZoomLevel: true,
    setView: 'untilPan',
  }))

  const onMove = useCallback((latLon) => {
    const newCenter = latLon || map.getCenter()
    setLocation([newCenter.lat, newCenter.lng])
    setZoom(Math.floor(map.getZoom()))
    setIsNight(Utility.nightCheck(newCenter.lat, newCenter.lng))
  }, [map])

  const tileServer = useMemo(() => getTileServer(tileServers, settings, isNight), [settings.tileServers])

  useEffect(() => {
    if (settings.navigationControls === 'leaflet') {
      lc.addTo(map)
    } else {
      lc.remove()
    }
  }, [settings.navigationControls])

  return (
    <>
      <TileLayer
        key={tileServer?.name}
        attribution={tileServer?.attribution || 'Map tiles by Carto, under CC BY 3.0. Data by  <a href="https://www.openstreetmap.org/">OpenStreetMap</a>, under ODbL.'}
        url={tileServer?.url || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png'}
        minZoom={config.minZoom}
        maxZoom={config.maxZoom}
      />
      {settings.navigationControls === 'leaflet' && <ZoomControl position="bottomright" />}
      {
        (webhooks && webhookMode) ? (
          <Webhook
            map={map}
            webhookMode={webhookMode}
            setWebhookMode={setWebhookMode}
            Icons={Icons}
          />
        ) : (
          Object.entries({ ...ui, ...ui.wayfarer, ...ui.admin }).map(each => {
            const [category, value] = each
            let enabled = false

            switch (category) {
              case 'scanAreas':
                if ((filters[category] && filters[category].enabled)
                  || webhookMode === 'areas') {
                  enabled = true
                } break
              case 'gyms':
                if (((filters[category].allGyms && value.allGyms)
                  || (filters[category].raids && value.raids)
                  || (filters[category].exEligible && value.exEligible)
                  || (filters[category].inBattle && value.inBattle)
                  || (filters[category].arEligible && value.arEligible))
                  && !webhookMode) {
                  enabled = true
                } break
              case 'nests':
                if (((filters[category].pokemon && value.pokemon)
                  || (filters[category].polygons && value.polygons))
                  && !webhookMode) {
                  enabled = true
                } break
              case 'pokestops':
                if (((filters[category].allPokestops && value.allPokestops)
                  || (filters[category].lures && value.lures)
                  || (filters[category].invasions && value.invasions)
                  || (filters[category].quests && value.quests)
                  || (filters[category].arEligible && value.arEligible))
                  && !webhookMode) {
                  enabled = true
                } break
              default:
                if (filters[category]
                  && filters[category].enabled
                  && value && !webhookMode) {
                  enabled = true
                } break
            }
            if (enabled) {
              Utility.analytics('Data', `${category} being fetched`, category, true)
              return (
                <QueryData
                  key={category}
                  sizeKey={filters[category].filter ? Object.values(filters[category].filter).map(x => x ? x.size : 'md').join(',') : 'md'}
                  bounds={Utility.getQueryArgs(map)}
                  setExcludeList={setExcludeList}
                  onMove={onMove}
                  perms={value}
                  map={map}
                  category={category}
                  config={config}
                  available={available[category]}
                  Icons={Icons}
                  staticFilters={staticFilters[category].filter}
                  userIcons={icons}
                  userSettings={userSettings[userSettingsCategory(category)] || {}}
                  filters={filters[category]}
                  tileStyle={tileServer?.style || 'light'}
                  clusteringRules={config?.clustering?.[category] || { zoomLimit: config.minZoom, forcedLimit: 10000 }}
                  staticUserSettings={staticUserSettings[category]}
                  params={manualParams}
                  setParams={setManualParams}
                  isNight={isNight}
                />
              )
            }
            return null
          })
        )
      }
      <Nav
        map={map}
        setManualParams={setManualParams}
        Icons={Icons}
        config={config}
        webhookMode={webhookMode}
        setWebhookMode={setWebhookMode}
        webhooks={webhooks}
        settings={settings}
      />
    </>
  )
}
