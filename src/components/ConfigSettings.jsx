import React from 'react'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import { ThemeProvider } from '@material-ui/styles'
import { useMediaQuery } from '@material-ui/core'
import { useStore, useMasterfile } from '../hooks/useStore'
import Map from './Map'
import theme from '../assets/mui/theme'

export default function ConfigSettings({ serverSettings }) {
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setMenus = useStore(state => state.setMenus)

  const setConfig = useMasterfile(state => state.setConfig)
  const setAvailableForms = useMasterfile(state => state.setAvailableForms)
  const setMasterfile = useMasterfile(state => state.setMasterfile)
  const setUi = useMasterfile(state => state.setUi)
  const setBreakpoint = useMasterfile(state => state.setBreakpoint)

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

  let screenSize = 'xs'
  if (useMediaQuery(theme.breakpoints.only('sm'))) screenSize = 'sm'
  if (useMediaQuery(theme.breakpoints.up('md'))) screenSize = 'md'

  setBreakpoint(screenSize)
  setUi(serverSettings.ui)
  setConfig(serverSettings.config)
  setMasterfile(serverSettings.masterfile)
  setMenus(updateObjState(serverSettings.menus, 'menus'))
  setFilters(updateObjState(serverSettings.defaultFilters, 'filters'))
  setSettings(updateObjState(serverSettings.settings, 'settings'))
  setLocation(updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location'))
  setZoom(updatePositionState(serverSettings.config.map.startZoom, 'zoom'))
  setAvailableForms((new Set(serverSettings.settings.icons.pokemonList)), 'availableForms')

  const startLocation = updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location')
  const zoom = updatePositionState(serverSettings.config.map.startZoom, 'zoom')

  return (
    <ThemeProvider theme={theme}>
      <MapContainer
        center={startLocation}
        zoom={zoom}
        zoomControl={false}
        preferCanvas
      >
        <Map />
      </MapContainer>
    </ThemeProvider>
  )
}
