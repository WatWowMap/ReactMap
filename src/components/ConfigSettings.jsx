import React from 'react'
import { Redirect } from 'react-router-dom'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import { Typography, Grid } from '@material-ui/core'
import { ThemeProvider } from '@material-ui/styles'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

import setTheme from '@assets/mui/theme'
import useGenerate from '@hooks/useGenerate'

import Map from './Map'

export default function ConfigSettings({
  serverSettings, match, paramLocation, paramZoom,
}) {
  Utility.analytics('Discord', serverSettings.user ? `${serverSettings.user.username} (${serverSettings.user.id})` : 'Not Logged In', 'Permissions', true)

  const localState = JSON.parse(localStorage.getItem('local-state'))
  document.title = serverSettings.config.map.headerTitle
  document.body.classList.add('dark')
  const theme = setTheme(serverSettings.config.map.theme)

  const { t } = useTranslation()
  const setUserSettings = useStore(state => state.setUserSettings)
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setMenus = useStore(state => state.setMenus)
  const setIcons = useStore(state => state.setIcons)
  const setSelectedWebhook = useStore(state => state.setSelectedWebhook)

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
  const setMenuFilters = useStatic(state => state.setMenuFilters)

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

  const getStartLocation = () => {
    if (paramLocation && paramLocation[0] !== null) {
      return paramLocation
    }
    if (match.params.lat) {
      return [match.params.lat, match.params.lon]
    }
    return updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location')
  }

  const getStartZoom = () => {
    if (paramZoom) {
      return paramZoom
    }
    if (match.params.zoom) {
      return match.params.zoom || 15
    }
    return updatePositionState(serverSettings.config.map.startZoom, 'zoom')
  }

  try {
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

    if (localState?.state?.filters?.pokemon?.standard) {
      delete localState.state.filters.pokemon.standard
    }
    setFilters(updateObjState(serverSettings.defaultFilters, 'filters'))
    setStaticFilters(serverSettings.defaultFilters)

    setUserSettings(updateObjState(serverSettings.userSettings, 'userSettings'))
    setStaticUserSettings(serverSettings.clientMenus)

    setSettings(updateObjState(serverSettings.settings, 'settings'))
    setStaticSettings(serverSettings.settings)

    const newIcons = updateObjState(serverSettings.Icons.selected, 'icons')
    const isValidIcon = serverSettings.Icons.checkValid(newIcons)

    if (localState?.state?.icons && isValidIcon) {
      serverSettings.Icons.setSelection(newIcons)
    }
    setIcons(serverSettings.Icons.selection)
    setStaticIcons(serverSettings.Icons)
    setMenuFilters(useGenerate())
    setConfig(serverSettings.config)
    setWebhookData(serverSettings.webhooks)

    if (localState?.state && serverSettings?.webhooks?.[localState.state?.selectedWebhook]) {
      setSelectedWebhook(localState.state.selectedWebhook)
    } else if (serverSettings?.webhooks) {
      setSelectedWebhook(Object.keys(serverSettings.webhooks)[0])
    }

    setLocation(updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location'))
    setZoom(updatePositionState(serverSettings.config.map.startZoom, 'zoom'))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e)
    return (
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        style={{ height: '95vh' }}
      >
        <Grid item>
          <Typography variant="h6" style={{ color: serverSettings.config.map.theme.primary }}>
            {t('config_error')}
          </Typography>
        </Grid>
        <Grid item>
          <Typography variant="subtitle2" style={{ color: serverSettings.config.map.theme.secondary }}>
            {e.message}
          </Typography>
        </Grid>
      </Grid>
    )
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
