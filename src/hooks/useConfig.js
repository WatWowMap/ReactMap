/* eslint-disable no-nested-ternary */
import { useState } from 'react'
import extend from 'extend'
import * as Sentry from '@sentry/react'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

export default function useConfig(serverSettings, params) {
  const [state, setState] = useState({ set: false, zoom: 10, location: [0, 0] })

  if (!state.set) {
    Utility.analytics(
      'User',
      serverSettings.user
        ? `${serverSettings.user.username} (${serverSettings.user.id})`
        : 'Not Logged In',
      'Permissions',
      true,
    )
    Sentry.setUser({
      username: serverSettings.user.username,
      id:
        serverSettings.user.discordId ||
        serverSettings.user.telegramId ||
        serverSettings.user.id,
    })

    const localState = JSON.parse(localStorage.getItem('local-state') || '{}')

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

    if (localState?.state?.filters?.pokemon?.standard) {
      delete localState.state.filters.pokemon.standard
    }

    if (localState?.state?.settings) {
      const cached = localState.state.settings.localeSelection
      const i18cached = localStorage.getItem('i18nextLng')
      localState.state.settings.localeSelection =
        cached !== i18cached ? i18cached : cached

      const validNav = Object.keys(serverSettings.config.navigation)
      localState.state.settings.navigation = validNav.includes(
        localState.state.settings.navigation,
      )
        ? localState.state.settings.navigation
        : serverSettings.config.navigation[validNav[0]]?.name

      const validTs = Object.keys(serverSettings.config.tileServers)
      localState.state.settings.tileServers = validTs.includes(
        localState.state.settings.tileServers,
      )
        ? localState.state.settings.tileServers
        : serverSettings.config.tileServers[validTs[0]]?.name
    } else {
      serverSettings.settings.localeSelection =
        localStorage.getItem('i18nextLng') ||
        serverSettings.settings.localeSelection
    }

    const newIcons = updateObjState(serverSettings.Icons.selected, 'icons')
    const isValidIcon = serverSettings.Icons.checkValid(newIcons)

    if (localState?.state?.icons && isValidIcon) {
      serverSettings.Icons.setSelection(newIcons)
    }

    const zoom =
      params.zoom ||
      updatePositionState(serverSettings.config.map.startZoom, 'zoom')
    const location =
      params.lat && params.lon
        ? [params.lat, params.lon]
        : updatePositionState(
            [
              serverSettings.config.map.startLat,
              serverSettings.config.map.startLon,
            ],
            'location',
          )

    useStatic.setState({
      auth: {
        strategy: serverSettings.user?.strategy || '',
        discordId: serverSettings.user?.discordId || '',
        telegramId: serverSettings.user?.telegramId || '',
        webhookStrategy: serverSettings.user?.webhookStrategy || '',
        loggedIn: serverSettings.loggedIn,
        perms: serverSettings.user ? serverSettings.user.perms : {},
        methods: serverSettings.authMethods || [],
        username: serverSettings.user?.username || '',
        data: serverSettings.user?.data
          ? typeof serverSettings.user?.data === 'string'
            ? JSON.parse(serverSettings.user?.data)
            : serverSettings.user?.data
          : {},
        counts: serverSettings.config.map.authCounts || {},
        userBackupLimits: serverSettings.userBackupLimits || 0,
      },
      ui: serverSettings.ui,
      masterfile: serverSettings.masterfile,
      available: serverSettings.available,
      menus: serverSettings.menus,
      filters: serverSettings.defaultFilters,
      extraUserFields: serverSettings.extraUserFields,
      userSettings: serverSettings.clientMenus,
      settings: serverSettings.settings,
      timeOfDay: Utility.timeCheck(...location),
      Icons: serverSettings.Icons,
      config: serverSettings.config,
      webhookData: serverSettings.webhooks,
    })

    useStore.setState({
      tutorial:
        serverSettings.user.tutorial === undefined
          ? Boolean(localState?.state?.tutorial)
          : !serverSettings.user.tutorial,
      menus: updateObjState(serverSettings.menus, 'menus'),
      filters: updateObjState(serverSettings.defaultFilters, 'filters'),
      userSettings: updateObjState(serverSettings.userSettings, 'userSettings'),
      settings: updateObjState(serverSettings.settings, 'settings'),
      icons: serverSettings.Icons.selection,
      selectedWebhook:
        localState?.state &&
        serverSettings?.webhooks?.[localState.state?.selectedWebhook]
          ? localState.state.selectedWebhook
          : serverSettings?.webhooks
          ? Object.keys(serverSettings.webhooks)[0]
          : null,
      zoom,
      location,
    })

    setState({
      set: true,
      location,
      zoom,
    })
  }

  return state
}
