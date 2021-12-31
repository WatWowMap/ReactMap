import React from 'react'
import { MapContainer } from 'react-leaflet'
import extend from 'extend'
import * as Sentry from '@sentry/react'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

import useGenerate from '@hooks/useGenerate'

import Map from './Map'

export default function ConfigSettings({
  serverSettings, match, paramLocation, paramZoom,
}) {
  Utility.analytics('User', serverSettings.user ? `${serverSettings.user.username} (${serverSettings.user.id})` : 'Not Logged In', 'Permissions', true)

  document.title = serverSettings.config.map.headerTitle
  document.body.classList.add('dark')

  const setUserSettings = useStore(state => state.setUserSettings)
  const setSettings = useStore(state => state.setSettings)
  const setFilters = useStore(state => state.setFilters)
  const setLocation = useStore(state => state.setLocation)
  const setZoom = useStore(state => state.setZoom)
  const setMenus = useStore(state => state.setMenus)
  const setIcons = useStore(state => state.setIcons)
  const setSelectedWebhook = useStore(state => state.setSelectedWebhook)
  const setTutorial = useStore(state => state.setTutorial)

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
  const setIsNight = useStatic(state => state.setIsNight)

  const localState = JSON.parse(localStorage.getItem('local-state'))

  const updateObjState = (defaults, category) => {
    if (localState?.state?.[category]) {
      const newState = {}
      extend(true, newState, defaults, localState.state[category])
      return newState
    }
    return defaults
  }

  const updatePositionState = (defaults, category) => {
    if (localState?.state?.[category]) {
      return localState.state[category]
    }
    return defaults
  }

  setAuth({
    strategy: serverSettings.user.strategy,
    discordId: serverSettings.user.discordId,
    telegramId: serverSettings.user.telegramId,
    webhookStrategy: serverSettings.user.webhookStrategy,
    loggedIn: serverSettings.loggedIn,
    perms: serverSettings.user ? serverSettings.user.perms : {},
    methods: serverSettings.authMethods,
  })
  Sentry.setUser({ username: serverSettings.user.username, id: serverSettings.user.id })

  setTutorial(serverSettings.user.tutorial === undefined ? localState?.state?.tutorial : !serverSettings.user.tutorial)
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

  if (localState?.state?.settings) {
    const cached = localState.state.settings.localeSelection
    const i18cached = localStorage.getItem('i18nextLng')
    localState.state.settings.localeSelection = cached !== i18cached ? i18cached : cached
  } else {
    serverSettings.settings.localeSelection = localStorage.getItem('i18nextLng') || serverSettings.settings.localeSelection
  }

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
      return match.params.zoom || 15
    }
    return updatePositionState(serverSettings.config.map.startZoom, 'zoom')
  }

  setIsNight(Utility.nightCheck(...getStartLocation()))

  return (
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
  )
}
