import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { setUser } from '@sentry/react'

import { useStatic, useStore } from '@hooks/useStore'
import Fetch from '@services/Fetch'
import { setLoadingText } from '@services/functions/setLoadingText'
import Utility from '@services/Utility'
import { deepMerge } from '@services/functions/deepMerge'

const rootLoading = document.getElementById('loader')

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
    if (data) {
      document.title = data?.map?.general.headerTitle || document.title

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

      /** @type {{ state: import('@hooks/useStore').UseStore}} */
      const localState = JSON.parse(
        localStorage.getItem('local-state') || '{ "state": {} }',
      )

      /**
       * @template T
       * @param {T} defaults
       * @param {string} category
       * @returns {T}
       */
      const updatePositionState = (defaults, category) => {
        if (localState?.state?.[category]) {
          return localState.state[category]
        }
        return defaults
      }

      const defaultLocation = /** @type {const} */ ([
        data.map.general.startLat,
        data.map.general.startLon,
      ])
      const location = updatePositionState(defaultLocation, 'location').map(
        (x, i) =>
          x ||
          (i === 0 ? data.map.general.startLat : data.map.general.startLon),
      )

      const zoom = updatePositionState(data.map.general.startZoom, 'zoom')
      const safeZoom =
        zoom < data.map.general.minZoom || zoom > data.map.general.maxZoom
          ? data.map.general.minZoom
          : zoom

      const settings = {
        navigationControls: {
          react: { name: 'react' },
          leaflet: { name: 'leaflet' },
        },
        navigation: Object.fromEntries(
          data.navigation.map((item) => [item.name, item]),
        ),
        tileServers: Object.fromEntries(
          data.tileServers.map((item) => [item.name, item]),
        ),
      }

      useStatic.setState({
        auth: {
          strategy: data.user?.strategy || '',
          discordId: data.user?.discordId || '',
          telegramId: data.user?.telegramId || '',
          webhookStrategy: data.user?.webhookStrategy || '',
          loggedIn: !!data.user?.loggedIn,
          perms: data.user ? data.user.perms : {},
          methods: data.authentication.methods || [],
          username: data.user?.username || '',
          data: data.user?.data
            ? typeof data.user?.data === 'string'
              ? JSON.parse(data.user?.data)
              : data.user?.data
            : {},
          counts: data.authReferences || {},
          userBackupLimits: data.database.settings.userBackupLimits || 0,
        },
        theme: data.map.theme,
        holidayEffects: data.map.holidayEffects || [],
        ui: data.ui,
        menus: data.menus,
        extraUserFields: data.database.settings.extraUserFields,
        userSettings: data.clientMenus,
        timeOfDay: Utility.timeCheck(...location),
        config: data.map,
        polling: data.api.polling,
        settings,
        gymValidDataLimit: data.api.gymValidDataLimit,
        tutorialExcludeList: data.authentication.excludeFromTutorial || [],
      })

      useStore.setState((prev) => ({
        tutorial:
          !localState?.state?.tutorial || data.user.tutorial === undefined
            ? !!localState?.state?.tutorial
            : !data.user.tutorial,
        menus: deepMerge({}, data.menus, prev.menus),
        userSettings: deepMerge({}, data.userSettings, prev.userSettings),
        settings: {
          ...Object.fromEntries(
            Object.entries(settings).map(([k, v]) => [k, Object.keys(v)[0]]),
          ),
          ...prev.settings,
        },
        zoom: safeZoom,
        location,
      }))
      setServerSettings({ ...serverSettings, fetched: true })
    } else {
      setServerSettings({ error: true, status: 500, fetched: true })
    }
  }

  React.useEffect(() => {
    if (!serverSettings.fetched) {
      setLoadingText(t('loading_settings'))
      getServerSettings()
    }
  }, [])

  return serverSettings.fetched && serverSettings.status !== 500
    ? children
    : null
}
