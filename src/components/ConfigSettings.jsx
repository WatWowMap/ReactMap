import React from 'react'
import { Redirect } from 'react-router-dom'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import { ThemeProvider } from '@material-ui/styles'
import { useMediaQuery } from '@material-ui/core'

import { useStore, useStatic } from '@hooks/useStore'
import createTheme from '@assets/mui/theme'
import Map from './Map'

export default function ConfigSettings({
  serverSettings, match, paramLocation, paramZoom,
}) {
  if (serverSettings.error) {
    return (
      <Redirect
        push
        to={{
          pathname: '/login',
          state: { message: 'cannotConnect' },
        }}
      />
    )
  }
  document.title = serverSettings.config.map.headerTitle
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  const setUserSettings = useStore(state => state.setUserSettings)
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setMenus = useStore(state => state.setMenus)

  const setAuth = useStatic(state => state.setAuth)
  const setStaticUserSettings = useStatic(state => state.setUserSettings)
  const setStaticSettings = useStatic(state => state.setSettings)
  const setStaticMenus = useStatic(state => state.setMenus)
  const setAvailable = useStatic(state => state.setAvailable)
  const setConfig = useStatic(state => state.setConfig)
  const setAvailableForms = useStatic(state => state.setAvailableForms)
  const setMasterfile = useStatic(state => state.setMasterfile)
  const setUi = useStatic(state => state.setUi)
  const setStaticFilters = useStatic(state => state.setFilters)

  const localState = JSON.parse(localStorage.getItem('local-state'))

  const updateObjState = (defaults, category) => {
    if (localState && localState.state && localState.state[category]) {
      const newState = {}
      extend(true, newState, defaults, localState.state[category])
      return newState
    }
    return defaults
  }

  const updatePositionState = (defaults, category) => {
    if (localState && localState.state && localState.state[category]) {
      return localState.state[category]
    }
    return defaults
  }

  const theme = createTheme(serverSettings.config.map.theme, prefersDarkMode)
  document.body.classList.add('dark')

  setAuth({ enabledAuthMethods: serverSettings.enabledAuthMethods, loggedIn: serverSettings.loggedIn })
  setUi(serverSettings.ui)
  setConfig(serverSettings.config)
  setMasterfile(serverSettings.masterfile)
  setAvailable(serverSettings.available)

  setStaticMenus(serverSettings.menus)
  setMenus(updateObjState(serverSettings.menus, 'menus'))

  setStaticFilters(serverSettings.defaultFilters)
  setFilters(updateObjState(serverSettings.defaultFilters, 'filters'))

  setUserSettings(updateObjState(serverSettings.userSettings, 'userSettings'))
  setStaticUserSettings(serverSettings.clientMenus)

  // temp settings migration
  if (localState) {
    if (localState.state && localState.state.settings.icons.name) {
      setSettings(serverSettings.settings)
    } else {
      setSettings(updateObjState(serverSettings.settings, 'settings'))
    }
  } else {
    setSettings(updateObjState(serverSettings.settings, 'settings'))
  }
  setStaticSettings(serverSettings.settings)
  const localIcons = localState ? localState.state : serverSettings
  setAvailableForms(new Set(serverSettings.config.icons[localIcons.settings.icons].pokemonList))

  setLocation(updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location'))
  const getStartLocation = () => {
    if (paramLocation && paramLocation[0] !== null) {
      return paramLocation
    }
    if (match.params.lat) {
      return [match.params.lat, match.params.lon]
    }
    return updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location')
  }

  setZoom(updatePositionState(serverSettings.config.map.startZoom, 'zoom'))
  const getStartZoom = () => {
    if (paramZoom) {
      return paramZoom
    }
    if (match.params.zoom) {
      return match.params.zoom
    }
    return updatePositionState(serverSettings.config.map.startZoom, 'zoom')
  }

  return (
    <ThemeProvider theme={theme}>
      <MapContainer
        tap={false}
        center={getStartLocation()}
        zoom={getStartZoom()}
        zoomControl={false}
        preferCanvas
      >
        {serverSettings.user.perms.map && (
          <Map
            serverSettings={serverSettings}
            params={match.params}
          />
        )}
      </MapContainer>
    </ThemeProvider>
  )
}
