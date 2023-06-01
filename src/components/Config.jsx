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
    const data = await Fetch.getSettings()
    if (data?.config && data?.masterfile) {
      if (data.masterfile?.questRewardTypes) {
        localStorage.setItem(
          'questRewardTypes',
          JSON.stringify(data.masterfile.questRewardTypes),
        )
      }
      const Icons = new UIcons(
        data.config.icons,
        data.masterfile
          ? data.masterfile.questRewardTypes
          : JSON.parse(localStorage.getItem('questRewardTypes') || '{}'),
      )
      if (Icons) {
        Icons.build(data.config.icons.styles)
        if (data.config.icons.defaultIcons) {
          Icons.setSelection(data.config.icons.defaultIcons)
        }
      }
      setServerSettings({ ...data, Icons })
      document.title = data.config?.map?.headerTitle
    }
  }, [])

  useEffect(() => {
    if (!serverSettings) {
      if (loadingText) {
        loadingText.innerText = t('loading_settings')
      }
      getServerSettings()
    }
  }, [])

  if (!serverSettings) {
    return <div />
  }

  return (
    <ThemeProvider theme={setTheme(serverSettings?.config?.map?.theme)}>
      <ReactRouter
        serverSettings={serverSettings}
        getServerSettings={getServerSettings}
      />
      <HolidayEffects
        holidayEffects={serverSettings?.config?.map?.holidayEffects || []}
      />
    </ThemeProvider>
  )
}
