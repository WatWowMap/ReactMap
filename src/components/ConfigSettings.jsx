import React from 'react'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import { useStore, useMasterfile } from '../hooks/useStore'
import Map from './Map'

export default function ConfigSettings({ serverSettings }) {
  const setConfig = useStore(state => state.setConfig)
  const setMasterfile = useMasterfile(state => state.setMasterfile)
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setAvailableForms = useStore(state => state.setAvailableForms)

  const updateObjState = (defaults, category) => {
    const localState = JSON.parse(localStorage.getItem('local-state'))
    if (localState && localState.state && localState.state[category]) {
      const newState = {}
      extend(true, newState, defaults, localState.state[category])
      return newState
    }
    return defaults
  }

  const updatePositionState = (defaults, category) => {
    const localState = JSON.parse(localStorage.getItem('local-state'))
    if (localState && localState.state && localState.state[category]) {
      return localState.state[category]
    }
    return defaults
  }

  setConfig(serverSettings.config)
  setMasterfile(serverSettings.masterfile)
  setFilters(updateObjState(serverSettings.defaultFilters, 'filters'))
  setSettings(updateObjState(serverSettings.settings, 'settings'))
  setLocation(updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location'))
  setZoom(updatePositionState(serverSettings.config.map.startZoom, 'zoom'))
  setAvailableForms((new Set(serverSettings.settings.iconStyle.pokemonList)), 'availableForms')

  const startLocation = updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location')
  const zoom = updatePositionState(serverSettings.config.map.startZoom, 'zoom')

  return (
    <MapContainer
      center={startLocation}
      zoom={zoom}
      zoomControl={false}
      preferCanvas
    >
      <Map />
    </MapContainer>
  )
}
