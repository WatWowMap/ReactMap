// @ts-check
import * as React from 'react'
import { MapContainer } from 'react-leaflet'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { useMapStore } from '@hooks/useMapStore'
import Utility from '@services/Utility'

import ScanOnDemand from '@features/scanner'
import DraggableMarker from '@features/webhooks/human/Draggable'
import WebhookAreaSelection from '@features/webhooks/human/area/AreaSelection'
import { Effects } from './Effects'

import DataView from './Data'
import { Nav } from './Nav'
import ActiveWeather from './ActiveWeather'
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

export default function Container() {
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
      <DraggableMarker />
      <WebhookAreaSelection />
      <Nav />
      <ActiveWeather />
    </MapContainer>
  )
}
