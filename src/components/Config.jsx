import React, { useEffect, useState, useCallback } from 'react'
import { ThemeProvider } from '@material-ui/styles'
import { useTranslation } from 'react-i18next'

import setTheme from '@assets/mui/theme'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'

import ReactRouter from './ReactRouter'
import HolidayEffects from './HolidayEffects'

const rootLoading = document.getElementById('loader')
const loadingText = document.getElementById('loading-text')

export default function Config() {
  const { t } = useTranslation()
  const [serverSettings, setServerSettings] = useState(null)

  if (rootLoading) {
    if (serverSettings) {
      rootLoading.style.display = 'none'
    }
  }

  const getServerSettings = useCallback(async () => {
    if (loadingText) {
      loadingText.innerHTML = t('loading_settings')
    }
    const data = await Fetch.getSettings()
    const Icons = data.masterfile ? new UIcons(data.config.icons, data.masterfile.questRewardTypes) : null
    if (Icons) {
      if (loadingText) {
        loadingText.innerText = t('loading_icons')
      }
      await Icons.fetchIcons(data.config.icons.styles)
      if (data.config.icons.defaultIcons) {
        Icons.setSelection(data.config.icons.defaultIcons)
      }
    }
    if (data.ui?.pokestops?.invasions && data.config?.map.fetchLatestInvasions) {
      const invasionCache = JSON.parse(localStorage.getItem('invasions_cache'))
      const cacheTime = data.config.map.invasionCacheHrs * 60 * 60 * 1000
      if (invasionCache && invasionCache.lastFetched + cacheTime > Date.now()) {
        data.masterfile.invasions = invasionCache
      } else {
        if (loadingText) {
          loadingText.innerText = t('loading_invasions')
        }
        data.masterfile.invasions = await Fetch.getInvasions(data.masterfile.invasions)
      }
    }
    setServerSettings({ ...data, Icons })
  }, [])

  useEffect(() => {
    if (!serverSettings) {
      getServerSettings()
    }
  }, [])

  if (!serverSettings) {
    return <div />
  }

  return (
    <ThemeProvider theme={setTheme(serverSettings?.config?.map?.theme)}>
      <ReactRouter serverSettings={serverSettings} getServerSettings={getServerSettings} />
      <canvas id="holiday-canvas" />
      <HolidayEffects mapSettings={serverSettings?.config?.map ? serverSettings.config.map : {}} />
    </ThemeProvider>
  )
}
