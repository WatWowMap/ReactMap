import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { setUser } from '@sentry/react'

import { useStatic, useStore } from '@hooks/useStore'
import Fetch from '@services/Fetch'
import { setLoadingText } from '@services/functions/setLoadingText'
import Utility from '@services/Utility'
import { Navigate } from 'react-router-dom'

const rootLoading = document.getElementById('loader')

function isObject(item) {
  return (
    item && typeof item === 'object' && !Array.isArray(item) && item !== null
  )
}

function deepMerge(target, ...sources) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} })
        }
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    })
  }

  return deepMerge(target, ...sources)
}

export default function Config({ children }) {
  const { t } = useTranslation()

  const [serverSettings, setServerSettings] = React.useState({
    error: false,
    status: 200,
    fetched: false,
  })

  if (rootLoading) {
    if (serverSettings) {
      rootLoading.style.display = 'none'
    }
  }
  const getServerSettings = async () => {
    const data = await Fetch.getSettings()
    if (data?.config) {
      document.title = data.config?.map?.headerTitle || document.title
      setServerSettings(data)

      Utility.analytics(
        'User',
        data.user ? `${data.user.username} (${data.user.id})` : 'Not Logged In',
        'Permissions',
        true,
      )
      if (CONFIG.sentry.client.enabled) {
        setUser({
          username: data.user.username,
          id: data.user.discordId || data.user.telegramId || data.user.id,
        })
      }

      const localState = JSON.parse(localStorage.getItem('local-state') || '{}')

      const updateObjState = (defaults, category) => {
        if (localState?.state?.[category]) {
          return deepMerge({}, defaults, localState.state[category])
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
        const validNav = Object.keys(data.config.navigation)
        localState.state.settings.navigation = validNav.includes(
          localState.state.settings.navigation,
        )
          ? localState.state.settings.navigation
          : data.config.navigation[validNav[0]]?.name

        const validTs = Object.keys(data.config.tileServers)
        localState.state.settings.tileServers = validTs.includes(
          localState.state.settings.tileServers,
        )
          ? localState.state.settings.tileServers
          : data.config.tileServers[validTs[0]]?.name
      }

      const location = updatePositionState(
        [data.config.map.startLat, data.config.map.startLon],
        'location',
      ).map(
        (x, i) =>
          x || (i === 0 ? data.config.map.startLat : data.config.map.startLon),
      )

      const zoom = updatePositionState(data.config.map.startZoom, 'zoom')
      const safeZoom =
        zoom < data.config.map.minZoom || zoom > data.config.map.maxZoom
          ? data.config.map.minZoom
          : zoom

      useStatic.setState({
        auth: {
          strategy: data.user?.strategy || '',
          discordId: data.user?.discordId || '',
          telegramId: data.user?.telegramId || '',
          webhookStrategy: data.user?.webhookStrategy || '',
          loggedIn: data.loggedIn,
          perms: data.user ? data.user.perms : {},
          methods: data.authMethods || [],
          username: data.user?.username || '',
          data: data.user?.data
            ? typeof data.user?.data === 'string'
              ? JSON.parse(data.user?.data)
              : data.user?.data
            : {},
          counts: data.config.map.authCounts || {},
          userBackupLimits: data.userBackupLimits || 0,
        },
        theme: data.config.map.theme,
        holidayEffects: data.config.map.holidayEffects || [],
        ui: data.ui,
        menus: data.menus,
        filters: data.defaultFilters,
        extraUserFields: data.extraUserFields,
        userSettings: data.clientMenus,
        settings: data.settings,
        timeOfDay: Utility.timeCheck(...location),
        config: data.config,
      })

      useStore.setState({
        tutorial:
          !localState?.state?.tutorial || data.user.tutorial === undefined
            ? !!localState?.state?.tutorial
            : !data.user.tutorial,
        menus: updateObjState(data.menus, 'menus'),
        filters: updateObjState(data.defaultFilters, 'filters'),
        userSettings: updateObjState(data.userSettings, 'userSettings'),
        settings: updateObjState(data.settings, 'settings'),
        zoom: safeZoom,
        location,
      })
      setServerSettings({ ...serverSettings, fetched: true })
    } else {
      setServerSettings({ error: true, status: data.status, fetched: true })
    }
  }

  React.useEffect(() => {
    if (!serverSettings.fetched) {
      setLoadingText(t('loading_settings'))
      getServerSettings()
    }
  }, [])

  if (!serverSettings.fetched) {
    return <div />
  }

  if (serverSettings.error) {
    return <Navigate to={{ pathname: `${serverSettings.status}` }} />
  }

  return children
}
