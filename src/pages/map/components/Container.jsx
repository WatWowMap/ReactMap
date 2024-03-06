// @ts-check
import * as React from 'react'
import { MapContainer } from 'react-leaflet'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useMapStore } from '@store/useMapStore'
import Utility from '@services/Utility'

import { ScanOnDemand } from '@features/scanner'
import { WebhookMarker, WebhookAreaSelection } from '@features/webhooks'
import { ActiveWeather } from '@features/weather'

import { Effects } from './Effects'
import { DataView } from './Data'
import { Nav } from './Nav'
import {
  ControlledLocate,
  ControlledTileLayer,
  ControlledZoomLayer,
} from './Layers'

/** @param {{ target: import('leaflet').Map, type: string }} args */
function setLocationZoom({ target: map }) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()
  useStorage.setState({ location: [lat, lng], zoom })
  useMemory.setState({
    timeOfDay: Utility.timeCheck(lat, lng),
  })
  if (map.hasEventListeners('fetchdata')) map.fire('fetchdata')
}

const MAX_BOUNDS = /** @type {[[number, number], [number, number]]} */ ([
  [-90, -210],
  [90, 210],
])

export function Container() {
  const { location, zoom } = useStorage.getState()

  return (
    <MapContainer
      tap={false}
      center={location}
      ref={(ref) => {
        if (ref) {
          const { attributionPrefix } = useMemory.getState().config.general
          ref.attributionControl.setPrefix(attributionPrefix || '')
          ref.on('moveend', setLocationZoom)
          ref.on('zoomend', setLocationZoom)
        }
        useMapStore.setState({ map: ref })
      }}
      zoom={zoom}
      zoomControl={false}
      maxBounds={MAX_BOUNDS}
      preferCanvas
    >
      <Effects />
      <ControlledTileLayer />
      <ControlledZoomLayer />
      <ControlledLocate />
      <DataView />
      <ScanOnDemand mode="scanNext" />
      <ScanOnDemand mode="scanZone" />
      <WebhookMarker />
      <WebhookAreaSelection />
      <Nav />
      <ActiveWeather />
    </MapContainer>
  )
}
