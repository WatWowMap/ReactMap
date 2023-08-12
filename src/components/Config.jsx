import * as React from 'react'
import { useTranslation } from 'react-i18next'

import makeTheme from '@assets/mui/theme'
import { useStore } from '@hooks/useStore'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'
import { setLoadingText } from '@services/functions/setLoadingText'

import ReactRouter from './ReactRouter'
import HolidayEffects from './HolidayEffects'

const rootLoading = document.getElementById('loader')

export default function Config({ setTheme }) {
  const { t } = useTranslation()
  const darkMode = useStore((s) => s.darkMode)
  const locale =
    useStore((s) => s.settings?.localeSelection) ||
    localStorage.getItem('i18nextLng') ||
    'en'

  const [serverSettings, setServerSettings] = React.useState(null)

  if (rootLoading) {
    if (serverSettings) {
      rootLoading.style.display = 'none'
    }
  }
  const getServerSettings = React.useCallback(async () => {
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

  React.useEffect(() => {
    if (!serverSettings) {
      setLoadingText(t('loading_settings'))
      getServerSettings()
    }
  }, [])

  React.useEffect(() => {
    setTheme(makeTheme(serverSettings?.config?.map?.theme, darkMode, locale))
    if (darkMode) {
      if (!document.body.classList.contains('dark')) {
        document.body.classList.add('dark')
      }
    } else if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark')
    }
  }, [serverSettings?.config?.map?.theme, darkMode, locale])

  if (!serverSettings) {
    return <div />
  }

  return (
    <>
      <ReactRouter
        serverSettings={serverSettings}
        getServerSettings={getServerSettings}
      />
      <HolidayEffects
        holidayEffects={serverSettings?.config?.map?.holidayEffects || []}
      />
    </>
  )
}
