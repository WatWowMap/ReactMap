import React, { useState, useEffect } from 'react'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import useStore from '../hooks/useStore'
import Map from './Map'

export default function ConfigSettings({ serverSettings }) {
  const setConfig = useStore(state => state.setConfig)
  const setMasterfile = useStore(state => state.setMasterfile)
  // const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setAvailableForms = useStore(state => state.setAvailableForms)

  setConfig(serverSettings.config)
  setMasterfile(serverSettings.masterfile)
  // setSettings(serverSettings.settings)

  const updateFilters = defaultFilters => {
    const localState = JSON.parse(localStorage.getItem('local-state'))
    if (localState && localState.state && localState.state.filters) {
      const newFilters = {}
      extend(true, newFilters, defaultFilters, localState.state.filters)
      return newFilters
    }
    return defaultFilters
  }

  setFilters(updateFilters(serverSettings.defaultFilters))

  const config = useStore(state => state.config)
  if (config) {
    if (!localStorage.getItem('location')) {
      localStorage.setItem('location', JSON.stringify([config.map.startLat, config.map.startLon]))
    }
    if (!localStorage.getItem('zoom')) {
      localStorage.setItem('zoom', config.map.startZoom)
    }
  }

  const [settings, setSettings] = useState({
    tileServer: JSON.parse(localStorage.getItem('tileServer')) || config.tileServers.Default,
    iconStyle: JSON.parse(localStorage.getItem('iconStyle')) || config.icons.Default,
  })

  useEffect(() => {
    setAvailableForms(new Set(settings.iconStyle.pokemonList))
  }, [settings])

  if (!localStorage.getItem('iconStyle')) {
    localStorage.setItem('iconStyle', JSON.stringify(settings.iconStyle))
  }
  if (!localStorage.getItem('tileServer')) {
    localStorage.setItem('tileServer', JSON.stringify(settings.tileServer))
  }

  return (
    <MapContainer
      center={JSON.parse(localStorage.getItem('location'))}
      zoom={localStorage.getItem('zoom')}
      zoomControl={false}
      preferCanvas
    >
      <Map
        settings={settings}
        setSettings={setSettings}
      />
    </MapContainer>
  )
}
