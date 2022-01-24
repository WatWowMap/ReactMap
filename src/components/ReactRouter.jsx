import React, { useEffect, useState, useCallback } from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@material-ui/styles'

import setTheme from '@assets/mui/theme'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'

import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import RouteChangeTracker from './RouteChangeTracker'
import Errors from './Errors'
import ClearStorage from './ClearStorage'
import HolidayEffects from './HolidayEffects'

const rootLoading = document.getElementById('loader')
const loadingText = document.getElementById('loading-text')

export default function ReactRouter() {
  const { t } = useTranslation()
  const [serverSettings, setServerSettings] = useState(null)

  if (rootLoading) {
    if (serverSettings) {
      rootLoading.style.display = 'none'
    }
  }

  const getServerSettings = useCallback(async () => {
    const data = await Fetch.getSettings()
    const Icons = data.masterfile ? new UIcons(data.config.icons, data.masterfile.questRewardTypes) : null
    if (Icons) {
      if (loadingText) {
        loadingText.innerHTML = t('loading_icons')
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
          loadingText.innerHTML = t('loading_invasions')
        }
        data.masterfile.invasions = await Fetch.getInvasions(data.masterfile.invasions)
      }
    }
    document.title = data.config.map.headerTitle

    setServerSettings({ ...data, Icons })
  }, [])

  useEffect(() => {
    if (!serverSettings) {
      getServerSettings()
    }
  }, [])

  return (
    <ThemeProvider theme={setTheme(serverSettings?.config?.map?.theme)}>
      <Router>
        {(process.env && process.env.GOOGLE_ANALYTICS_ID) && <RouteChangeTracker />}
        <Switch>
          <Route exact path="/404" component={Errors} />
          <Route exact path="/500" component={Errors} />
          <Route exact path="/reset" component={ClearStorage} />
          <Route exact path="/">
            {serverSettings && <Auth serverSettings={serverSettings} getServerSettings={getServerSettings} />}
          </Route>
          <Route exact path="/login">
            {serverSettings && (
              <Login
                clickedTwice
                serverSettings={serverSettings}
                getServerSettings={getServerSettings}
              />
            )}
          </Route>
          <Route exact path="/@/:lat/:lon/:zoom?">
            {serverSettings && <Auth serverSettings={serverSettings} getServerSettings={getServerSettings} />}
          </Route>
          <Route exact path="/id/:category/:id/:zoom?">
            {serverSettings && <Auth serverSettings={serverSettings} getServerSettings={getServerSettings} />}
          </Route>
        </Switch>
      </Router>
      <canvas id="holiday-canvas" />
      <HolidayEffects mapSettings={serverSettings?.config?.map ? serverSettings.config.map : {}} />
    </ThemeProvider>
  )
}
