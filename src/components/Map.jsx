import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'

import Utility from '@services/Utility'
import { useStatic, useStore } from '@hooks/useStore'
import Nav from './layout/Nav'
import QueryData from './QueryData'
import Webhook from './layout/dialogs/webhooks/Webhook'

const userSettingsCategory = category => {
  switch (category) {
    default: return category
    case 'devices':
    case 'spawnpoints':
    case 's2cells': return 'admin'
    case 'submissionCells':
    case 'portals': return 'wayfarer'
  }
}

export default function Map({ serverSettings: { config: { map: config, tileServers }, Icons, webhooks }, params }) {
  Utility.analytics(window.location.pathname)

  const map = useMap()

  const staticUserSettings = useCallback(useStatic(state => state.userSettings))
  const ui = useCallback(useStatic(state => state.ui))
  const available = useCallback(useStatic(state => state.available))
  const staticFilters = useCallback(useStatic(state => state.filters))

  const filters = useStore(state => state.filters)
  const settings = useStore(state => state.settings)
  const icons = useStore(state => state.icons)
  const setLocation = useStore(s => s.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const userSettings = useStore(state => state.userSettings)

  const [webhookMode, setWebhookMode] = useState(false)
  const [initialBounds] = useState({
    minLat: map.getBounds()._southWest.lat,
    maxLat: map.getBounds()._northEast.lat,
    minLon: map.getBounds()._southWest.lng,
    maxLon: map.getBounds()._northEast.lng,
    zoom: map.getZoom(),
  })
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
  }, [map])

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
        key={tileServers[settings.tileServers].name}
        attribution={tileServers[settings.tileServers].attribution}
        url={tileServers[settings.tileServers].url}
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
                  bounds={initialBounds}
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
                  tileStyle={tileServers[settings.tileServers].style}
                  clusterZoomLvl={config.clusterZoomLevels[category]}
                  staticUserSettings={staticUserSettings[category]}
                  params={manualParams}
                  setParams={setManualParams}
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
