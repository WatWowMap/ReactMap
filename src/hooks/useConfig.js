import extend from 'extend'
import { useParams } from 'react-router-dom'
import * as Sentry from '@sentry/react'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

export default function useConfig(serverSettings) {
  Utility.analytics('User', serverSettings.user ? `${serverSettings.user.username} (${serverSettings.user.id})` : 'Not Logged In', 'Permissions', true)

  document.title = serverSettings.config?.map?.headerTitle

  const params = useParams()
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
    username: serverSettings.user.username,
  })
  Sentry.setUser({
    username: serverSettings.user.username,
    id: serverSettings.user.discordId
      || serverSettings.user.telegramId
      || serverSettings.user.id,
  })

  setTutorial(serverSettings.user.tutorial === undefined
    ? Boolean(localState?.state?.tutorial)
    : !serverSettings.user.tutorial)
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

    const validNav = Object.keys(serverSettings.config.navigation)
    localState.state.settings.navigation = validNav.includes(localState.state.settings.navigation)
      ? localState.state.settings.navigation
      : serverSettings.config.navigation[validNav[0]]?.name

    const validTs = Object.keys(serverSettings.config.tileServers)
    localState.state.settings.tileServers = validTs.includes(localState.state.settings.tileServers)
      ? localState.state.settings.tileServers
      : serverSettings.config.tileServers[validTs[0]]?.name
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
  setConfig(serverSettings.config)
  setWebhookData(serverSettings.webhooks)

  if (localState?.state && serverSettings?.webhooks?.[localState.state?.selectedWebhook]) {
    setSelectedWebhook(localState.state.selectedWebhook)
  } else if (serverSettings?.webhooks) {
    setSelectedWebhook(Object.keys(serverSettings.webhooks)[0])
  }

  const location = params.lat && params.lon
    ? [params.lat, params.lon]
    : updatePositionState([serverSettings.config.map.startLat, serverSettings.config.map.startLon], 'location')

  const zoom = params.zoom || updatePositionState(serverSettings.config.map.startZoom, 'zoom')

  setZoom(zoom)
  setLocation(location)
  setIsNight(Utility.nightCheck(...location))

  return { location, zoom }
}
