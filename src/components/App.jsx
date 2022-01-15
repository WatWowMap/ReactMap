import '../assets/scss/main.scss'

import React, { Suspense, useEffect, useState, useCallback } from 'react'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { ThemeProvider } from '@material-ui/styles'

import setTheme from '@assets/mui/theme'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'
import client from '@services/apollo'

import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import RouteChangeTracker from './RouteChangeTracker'
import Errors from './Errors'
import ClearStorage from './ClearStorage'
import HolidayEffects from './HolidayEffects'

export default function App() {
  const [serverSettings, setServerSettings] = useState(null)

  const getServerSettings = useCallback(async () => {
    const data = await Fetch.getSettings()
    const Icons = data.masterfile ? new UIcons(data.config.icons, data.masterfile.questRewardTypes) : null
    if (Icons) {
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
        data.masterfile.invasions = await Fetch.getInvasions(data.masterfile.invasions)
      }
    }
    setServerSettings({ ...data, Icons })
  }, [])

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <Suspense fallback="Loading translations...">
      <ApolloProvider client={client}>
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
      </ApolloProvider>
    </Suspense>
  )
}
