import '../assets/scss/main.scss'

import React, { Suspense, useEffect, useState } from 'react'
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { ThemeProvider } from '@material-ui/styles'

import setTheme from '@assets/mui/theme'
import AbortableLink from '@classes/AbortableLink'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'
import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import RouteChangeTracker from './RouteChangeTracker'
import Errors from './Errors'

const client = new ApolloClient({
  uri: '/graphql',
  link: new AbortableLink().concat(createHttpLink()),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          pokemon: {
            merge(existing, incoming) {
              return incoming
            },
          },
          gyms: {
            merge(existing, incoming) {
              return incoming
            },
          },
          pokestops: {
            merge(existing, incoming) {
              return incoming
            },
          },
        },
      },
      Pokestop: {
        fields: {
          quests: {
            merge(existing, incoming) {
              return incoming
            },
          },
          invasions: {
            merge(existing, incoming) {
              return incoming
            },
          },
        },
      },
    },
  }),
})

export default function App() {
  const [serverSettings, setServerSettings] = useState(null)

  const getServerSettings = async () => {
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
  }
  useEffect(() => {
    getServerSettings()
  }, [])

  const theme = serverSettings
    ? setTheme(serverSettings.config.map.theme)
    : {}

  return (
    <Suspense fallback="Loading translations...">
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <Router>
            {(process.env && process.env.GOOGLE_ANALYTICS_ID) && <RouteChangeTracker />}
            <Switch>
              <Route exact path="/404" component={Errors} />
              <Route exact path="/500" component={Errors} />
              <Route exact path="/">
                {serverSettings && <Auth serverSettings={serverSettings} />}
              </Route>
              <Route exact path="/login">
                {serverSettings && <Login clickedTwice serverSettings={serverSettings} />}
              </Route>
              <Route exact path="/@/:lat/:lon/:zoom?">
                {serverSettings && <Auth serverSettings={serverSettings} />}
              </Route>
              <Route exact path="/id/:category/:id/:zoom?">
                {serverSettings && <Auth serverSettings={serverSettings} />}
              </Route>
            </Switch>
          </Router>
        </ThemeProvider>
      </ApolloProvider>
    </Suspense>
  )
}
