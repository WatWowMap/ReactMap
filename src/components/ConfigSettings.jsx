import React from 'react'
import { Redirect } from 'react-router-dom'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import { ThemeProvider } from '@material-ui/styles'
import { useMediaQuery } from '@material-ui/core'

import { useStore, useStatic } from '@hooks/useStore'
import setTheme from '@assets/mui/theme'
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
  const theme = setTheme(serverSettings.config.map.theme, prefersDarkMode)
  document.body.classList.add('dark')

  const setUserSettings = useStore(state => state.setUserSettings)
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setMenus = useStore(state => state.setMenus)
  const setIcons = useStore(state => state.setIcons)
  const setAuth = useStatic(state => state.setAuth)
  const setStaticUserSettings = useStatic(state => state.setUserSettings)
  const setStaticSettings = useStatic(state => state.setSettings)
  const setStaticMenus = useStatic(state => state.setMenus)
  const setAvailable = useStatic(state => state.setAvailable)
  const setConfig = useStatic(state => state.setConfig)
  const setStaticIcons = useStatic(state => state.setIcons)
  const setMasterfile = useStatic(state => state.setMasterfile)
  const setUi = useStatic(state => state.setUi)
  const setStaticFilters = useStatic(state => state.setFilters)
  const setWebhookData = useStatic(state => state.setWebhookData)

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

  setAuth({
    discord: serverSettings.discord,
    loggedIn: serverSettings.loggedIn,
    perms: serverSettings.user ? serverSettings.user.perms : {},
  })
  setUi(serverSettings.ui)
  setMasterfile(serverSettings.masterfile)
  setAvailable(serverSettings.available)

  setMenus(updateObjState(serverSettings.menus, 'menus'))
  setStaticMenus(serverSettings.menus)

  setFilters(updateObjState(serverSettings.defaultFilters, 'filters'))
  setStaticFilters(serverSettings.defaultFilters)

  setUserSettings(updateObjState(serverSettings.userSettings, 'userSettings'))
  setStaticUserSettings(serverSettings.clientMenus)

  setSettings(updateObjState(serverSettings.settings, 'settings'))
  setStaticSettings(serverSettings.settings)

  const newIcons = updateObjState(serverSettings.Icons.selected, 'icons')
  const isValidIcon = serverSettings.Icons.checkValid(newIcons)

  if (localState && localState.state && localState.state.icons && isValidIcon) {
    serverSettings.Icons.setSelection(localState.state.icons)
  }
  setIcons(isValidIcon ? newIcons : serverSettings.Icons.selected)
  setStaticIcons(serverSettings.Icons)

  setConfig(serverSettings.config)
  setWebhookData(serverSettings.webhookData)

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
        {(serverSettings.user && serverSettings.user.perms.map) && (
          <Map
            serverSettings={serverSettings}
            params={match.params}
          />
        )}
      </MapContainer>
    </ThemeProvider>
  )
}
